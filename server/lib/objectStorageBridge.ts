import path from "path";
import fs from "fs";
import type { Response } from "express";
import {
  objectStorageClient,
  ObjectStorageService,
} from "../replit_integrations/object_storage/index.js";
import { logger } from "../utils/logger.js";

// Task #48 — bridge between RAYO upload code and Replit Object Storage.
//
// Storage contract:
//   - Bytes live in the Replit-managed GCS bucket (public-access
//     prevention is enforced, so we cannot expose objects via a public
//     ACL — see https://cloud.google.com/storage/docs/public-access-prevention).
//   - DB columns (`users.avatar_url`, `media_assets.public_url`,
//     `content_items.cover_url`/`media_url`) persist a stable storage
//     reference of the form `objstore://<key>` (or, for legacy rows,
//     the historical `/uploads/<key>` URL).
//   - At API serialization time, `resolveStoredMediaUrl()` rewrites
//     those references to a fresh **external signed GET URL** pointing
//     at `https://storage.googleapis.com/...`. URL TTL is the GCS
//     sidecar maximum (7 days). Any external `http(s)://` URL — e.g.
//     Unsplash covers picked by producers — is returned unchanged.

const SERVICE = new ObjectStorageService();
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60; // GCS sidecar max
const STORAGE_PREFIX = "objstore://";
const LEGACY_URL_PREFIX = "/uploads/";

interface ParsedFullPath {
  bucketName: string;
  objectName: string;
}

function parseFullPath(full: string): ParsedFullPath {
  const normalised = full.startsWith("/") ? full : `/${full}`;
  const parts = normalised.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid object storage path: ${full}`);
  }
  return {
    bucketName: parts[0],
    objectName: parts.slice(1).join("/"),
  };
}

function getPublicSearchPath(): string {
  // PUBLIC_OBJECT_SEARCH_PATHS may be a comma-list; we always write to
  // the first entry so the layout is deterministic.
  const paths = SERVICE.getPublicObjectSearchPaths();
  return paths[0];
}

function fullObjectNameFor(key: string): { bucketName: string; objectName: string } {
  const fullPath = `${getPublicSearchPath()}/${key}`;
  return parseFullPath(fullPath);
}

// Upload a buffer to the public bucket under <publicSearchPath>/<key>.
export async function putPublicObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { bucketName, objectName } = fullObjectNameFor(key);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { contentType },
  });
}

// Returns the value persisted in DB columns. Frontend callers MUST go
// through `resolveStoredMediaUrl` to get an actual fetchable URL.
export function publicObjectKeyToStored(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

// Back-compat alias: old code paths used `publicObjectKeyToUrl` to
// build a same-origin proxy URL. We now persist a sentinel; callers
// kept the same import name to minimise churn.
export const publicObjectKeyToUrl = publicObjectKeyToStored;

// `storage_path` may be either the new "objstore://<key>" sentinel or
// a legacy absolute disk path. Returns the storage key when the path is
// already in object storage, null otherwise.
export function parsePublicUploadStoragePath(storagePath: string): string | null {
  if (storagePath.startsWith(STORAGE_PREFIX)) {
    return storagePath.slice(STORAGE_PREFIX.length);
  }
  return null;
}

// Sidecar-signed GET URL. TTL capped at the sidecar maximum.
export async function signPublicObjectUrl(
  key: string,
  ttlSec: number = SIGNED_URL_TTL_SEC,
): Promise<string> {
  const { bucketName, objectName } = fullObjectNameFor(key);
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method: "GET",
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL (${response.status}); ` +
        `key=${key}; make sure you're running on Replit.`,
    );
  }
  const { signed_url: signedURL } = (await response.json()) as { signed_url: string };
  return signedURL;
}

// Task #48 — incoming write helper. CMS authoring flows receive
// fully-resolved signed URLs in cover_url/media_url for preview, then
// re-submit them on save. Without this, those expiring signed URLs
// would be persisted into the DB and break after their TTL. Convert
// any URL that points back into our public bucket into the canonical
// `objstore://<key>` sentinel so the row stays stable across resigns.
// Other inputs (already-canonical refs, legacy `/uploads/`, external
// http(s) URLs like Unsplash) pass through unchanged.
export function normalizeStorageRef(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  if (input.startsWith(STORAGE_PREFIX)) return input;
  if (input.startsWith(LEGACY_URL_PREFIX)) return input;
  if (!/^https?:\/\//i.test(input)) return input;
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return input;
  }
  // Signed URL example:
  //   https://storage.googleapis.com/<bucket>/<publicSearchPath...>/<key>?...
  // We accept storage.googleapis.com hosts. Strip leading "/<bucket>/<root>/"
  // so the remainder is the storage key we own.
  if (!/storage\.googleapis\.com$/i.test(parsed.hostname)) return input;
  // PUBLIC_OBJECT_SEARCH_PATHS (and therefore getPublicSearchPath()) is
  // already of the form "/<bucket>/<root...>", which matches the leading
  // segment of the signed URL's pathname exactly. Strip that prefix to
  // recover the storage key we own.
  const expectedRoot = `${getPublicSearchPath()}/`;
  if (!parsed.pathname.startsWith(expectedRoot)) return input;
  const key = parsed.pathname.slice(expectedRoot.length);
  if (!key) return input;
  return `${STORAGE_PREFIX}${key}`;
}

// Convert a persisted reference into an external URL the client can
// actually fetch. Returns:
//   - null   if `stored` is null/empty
//   - <input> if `stored` is an absolute http(s) URL
//   - signed GCS URL if `stored` is `objstore://<key>` (always) or
//                   `/uploads/<key>` (when the bucket has the key)
//   - <input> if `stored` is a legacy `/uploads/<key>` we
//             cannot find in the bucket — the express
//             `/uploads/*` shim will then attempt the local
//             disk fallback.
//
// Object Storage may be unconfigured in some environments (e.g. CI, or a
// fresh Replit workspace before the bucket + PUBLIC_OBJECT_SEARCH_PATHS
// env var are provisioned). In that case signing throws. We must NOT let
// that turn a serialization path into a 500 — instead we log once and
// degrade gracefully by returning the persisted reference unchanged, so
// the API keeps responding 200 (the media just won't be signed until the
// bucket is configured on Replit).
export async function resolveStoredMediaUrl(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;

  if (stored.startsWith(STORAGE_PREFIX)) {
    const key = stored.slice(STORAGE_PREFIX.length);
    try {
      return await signPublicObjectUrl(key);
    } catch (err) {
      logger.warn(
        "ObjectStorage",
        `resolveStoredMediaUrl: could not sign objstore ref (returning it unresolved); key=${key}:`,
        err,
      );
      return stored;
    }
  }

  if (stored.startsWith(LEGACY_URL_PREFIX)) {
    const key = stored.slice(LEGACY_URL_PREFIX.length);
    try {
      const file = await SERVICE.searchPublicObject(key);
      if (file) return signPublicObjectUrl(key);
    } catch {
      // fall through to legacy URL
    }
    return stored;
  }

  return stored;
}

// Helper: resolve every value in a row in parallel and return a new
// row with the resolved fields swapped in. Used by CMS/list endpoints.
export async function resolveMediaFields<T extends Record<string, unknown>>(
  row: T,
  fields: ReadonlyArray<keyof T>,
): Promise<T> {
  const out: Record<string, unknown> = { ...row };
  await Promise.all(
    fields.map(async (f) => {
      const v = row[f];
      if (typeof v === "string" || v === null) {
        out[f as string] = await resolveStoredMediaUrl(v as string | null);
      }
    }),
  );
  return out as T;
}

// Boot-time backfill: walk UPLOAD_ROOT and copy every regular file to
// the public bucket if it is not already there. Idempotent: every key
// is `<relpath>` and we use `file.exists()` before writing.
export async function backfillLocalUploads(uploadRoot: string): Promise<void> {
  if (!fs.existsSync(uploadRoot)) return;

  const search = getPublicSearchPath();
  const { bucketName } = parseFullPath(`${search}/probe`);
  const bucket = objectStorageClient.bucket(bucketName);

  let copied = 0;
  let skipped = 0;

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        const fullKey = `${search}/${rel}`.replace(/^\//, "");
        const objectName = parseFullPath(`/${fullKey}`).objectName;
        const remote = bucket.file(objectName);
        const [exists] = await remote.exists();
        if (exists) {
          skipped++;
          continue;
        }
        const buffer = await fs.promises.readFile(full);
        const contentType = guessContentType(entry.name);
        await remote.save(buffer, {
          contentType,
          resumable: false,
          metadata: { contentType },
        });
        copied++;
      }
    }
  }

  try {
    await walk(uploadRoot, "");
    if (copied > 0 || skipped > 0) {
      logger.info(
        "ObjectStorage",
        `Legacy uploads backfill: ${copied} copied, ${skipped} already present.`,
      );
    }
  } catch (err) {
    logger.error("ObjectStorage", "Backfill failed:", err);
  }
}

function guessContentType(name: string): string {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".mp3": return "audio/mpeg";
    case ".m4a": return "audio/mp4";
    case ".wav": return "audio/wav";
    case ".ogg": return "audio/ogg";
    case ".mp4": return "video/mp4";
    case ".webm": return "video/webm";
    case ".mov": return "video/quicktime";
    case ".pdf": return "application/pdf";
    case ".epub": return "application/epub+zip";
    default: return "application/octet-stream";
  }
}

// Backwards-compat shim for the express `/uploads/*` route. Returns a
// fresh signed URL when the bucket has the legacy key (so old DB rows
// that still hold `/uploads/...` keep working). Returns null otherwise
// — caller falls back to local disk.
export async function signLegacyUploadUrlIfPresent(
  key: string,
): Promise<string | null> {
  try {
    const file = await SERVICE.searchPublicObject(key);
    if (!file) return null;
    return signPublicObjectUrl(key);
  } catch {
    return null;
  }
}

// Disk fallback for the /uploads/* express handler. Streams the file
// at <uploadRoot>/<key> if it exists. Returns true on hit.
export function streamLocalUpload(
  key: string,
  uploadRoot: string,
  res: Response,
): boolean {
  // Defensive: refuse traversal.
  const target = path.resolve(uploadRoot, key);
  if (!target.startsWith(uploadRoot + path.sep) && target !== uploadRoot) {
    return false;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return false;
  }
  res.setHeader("Content-Type", guessContentType(target));
  res.setHeader("Cache-Control", "public, max-age=604800");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  fs.createReadStream(target).pipe(res);
  return true;
}
