import sharp from "sharp";

// Task #50 — central helpers to keep avatar/CMS image bytes small
// before they hit Replit Object Storage. Both helpers accept a buffer
// from `multer.memoryStorage()` and return the bytes/mimetype/extension
// to actually persist. They never throw on non-image input — callers
// that pass a non-image mimetype (e.g. CMS audio) should skip
// optimization themselves.

export interface OptimizedImage {
  buffer: Buffer;
  mimetype: string;
  extension: string; // includes leading dot, e.g. ".webp"
}

// Avatar: square crop, 512x512 max, WebP @ quality 82. The WebP encoder
// gives us ~5-10x smaller payloads than the original PNG/JPG at this
// size while staying visually indistinguishable for a 96px circle.
export async function optimizeAvatar(input: Buffer): Promise<OptimizedImage> {
  const buffer = await sharp(input, { failOn: "none" })
    .rotate() // honor EXIF orientation before we drop metadata
    .resize(512, 512, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  return { buffer, mimetype: "image/webp", extension: ".webp" };
}

// CMS card thumbnails: cap the largest side at 2048px and re-encode
// progressively. We keep the original format so existing card art that
// relied on transparent PNGs / animated GIFs doesn't get silently
// converted. Animated GIFs are passed through untouched (sharp would
// flatten them to a single frame).
export async function optimizeCmsImage(
  input: Buffer,
  mimetype: string,
): Promise<OptimizedImage> {
  if (mimetype === "image/gif") {
    return { buffer: input, mimetype, extension: ".gif" };
  }

  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true });

  if (mimetype === "image/png") {
    const buffer = await pipeline
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return { buffer, mimetype: "image/png", extension: ".png" };
  }
  if (mimetype === "image/webp") {
    const buffer = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
    return { buffer, mimetype: "image/webp", extension: ".webp" };
  }
  // Default: encode as progressive JPEG (covers image/jpeg and any
  // exotic mime that slipped past the filter).
  const buffer = await pipeline
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toBuffer();
  return { buffer, mimetype: "image/jpeg", extension: ".jpg" };
}
