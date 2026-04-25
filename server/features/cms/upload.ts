import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

// Local-FS upload backend. Files are written to ./uploads (project root) and
// served back through a static route mounted at /uploads/*. Switching to
// Replit Object Storage / S3 later is a 1-file swap (replace storage + URL).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, "..", "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // bucket per kind so /uploads/audio/, /uploads/video/, /uploads/image/...
    const kind = inferKind(file.mimetype);
    const dir = path.join(UPLOAD_ROOT, kind);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || extensionForMime(file.mimetype);
    const safe = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    cb(null, safe);
  },
});

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

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB cap per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
}).single("file");

export function publicUrlFor(storagePath: string): string {
  // storagePath is absolute on disk; we expose anything under UPLOAD_ROOT
  // through `/uploads/<relative path>`. Defensive guard: refuse paths that
  // escape the upload root (path-traversal protection for any non-multer
  // caller that might construct a storagePath manually).
  const rel = path.relative(UPLOAD_ROOT, storagePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("publicUrlFor: storagePath escapes upload root");
  }
  return `/uploads/${rel.split(path.sep).join("/")}`;
}

export function inferAssetKindFromMime(mime: string): string {
  return inferKind(mime);
}
