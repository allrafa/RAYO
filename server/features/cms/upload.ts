import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Request, Response, NextFunction } from "express";
import {
  putPublicObject,
  publicObjectKeyToStored,
  parsePublicUploadStoragePath,
} from "../../lib/objectStorageBridge.js";

// Task #48 — Uploads now live in Replit Object Storage (public bucket).
// We keep the multer-based contract (handlers still see `req.file` with
// `.path`, `.filename`, `.publicUrl`) so route code stays untouched.
//
// `req.file.path` is no longer a filesystem path: it is the canonical
// object-storage key prefixed with `objstore://` so every consumer that
// stores `storage_path` in the DB or logs keeps working without
// inventing a fake disk location.
//
// UPLOAD_ROOT remains exported for the legacy migration path and for the
// boot-time backfill that uploads any pre-existing local files.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, "..", "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

function inferKind(mime: string): string {
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "audio/mpeg": return ".mp3";
    case "audio/mp4": return ".m4a";
    case "audio/wav": return ".wav";
    case "audio/ogg": return ".ogg";
    case "video/mp4": return ".mp4";
    case "video/webm": return ".webm";
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "application/pdf": return ".pdf";
    default: return "";
  }
}

const ALLOWED = new Set([
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/x-m4a",
  "video/mp4", "video/webm", "video/quicktime",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
]);

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB cap per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
}).single("file");

// Wrapper that runs multer (memory) then pushes the buffer to object
// storage. We mirror the previous on-disk filename scheme so existing
// `media_assets.storage_path` rows that happen to share a name keep
// pointing at the right object after a backfill.
export function uploadMiddleware(
  req: Request,
  res: Response,
  next: (err?: unknown) => void,
): void {
  memoryUpload(req, res, async (err) => {
    if (err) return next(err);
    const file = req.file;
    if (!file) return next();
    try {
      const ext = path.extname(file.originalname) || extensionForMime(file.mimetype);
      const safeName = `${Date.now()}-${randomShort()}${ext}`;
      const kind = inferKind(file.mimetype);
      const key = `${kind}/${safeName}`;
      await putPublicObject(key, file.buffer, file.mimetype);
      // Mutate req.file so route handlers see object-storage coordinates
      // instead of a fake disk path.
      file.path = `objstore://${key}`;
      file.filename = safeName;
      (file as Express.Multer.File & { publicUrl?: string }).publicUrl =
        publicObjectKeyToStored(key);
      next();
    } catch (e) {
      next(e);
    }
  });
}

function randomShort(): string {
  // 8 hex chars, same shape as the previous randomUUID().slice(0, 8).
  return Math.random().toString(16).slice(2, 10).padEnd(8, "0");
}

// publicUrlFor returns the canonical persisted reference (`objstore://<key>`)
// from a storage path produced by `uploadMiddleware`. Frontend callers
// see real fetchable URLs only after `resolveStoredMediaUrl` runs at
// API serialization time.
//
// Legacy disk paths (any caller that still passes an absolute fs path
// rooted under UPLOAD_ROOT) are mapped to the historical
// `/uploads/<rel>` form so old rows keep working through the
// `/uploads/*` shim in `server/index.ts`.
export function publicUrlFor(storagePath: string): string {
  const key = parsePublicUploadStoragePath(storagePath);
  if (key) return publicObjectKeyToStored(key);

  const rel = path.relative(UPLOAD_ROOT, storagePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("publicUrlFor: storagePath escapes upload root");
  }
  return `/uploads/${rel.split(path.sep).join("/")}`;
}

export function inferAssetKindFromMime(mime: string): string {
  return inferKind(mime);
}

export { extensionForMime };
