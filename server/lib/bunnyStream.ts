// Task #86 — Cliente Bunny Stream + helpers de URL.
//
// Convenção de armazenamento:
//   - DB grava o sentinel `bunny://<libraryId>/<videoGuid>` em
//     `content_items.video_external_id` (formato curto: só o GUID, mas o
//     parser aceita o sentinel completo). `video_provider='bunny'` marca
//     a fonte; webhooks de transcode preenchem `video_status`,
//     `video_duration_sec`, `video_thumbnail_url`.
//   - Em leitura, `resolveBunnyVideoFields` adiciona ao objeto serializado:
//       video_embed_url     → iframe.mediadelivery.net/embed/<lib>/<guid>
//       video_hls_url       → https://<cdn>/<guid>/playlist.m3u8
//       video_thumbnail_url → https://<cdn>/<guid>/thumbnail.jpg (fallback)
//   - Sem env vars Bunny configuradas, `isBunnyConfigured()` devolve false
//     e o uploader/admin desabilita o botão. Leitura de conteúdos legados
//     (URL externa em `media_url`/`external_url`) NÃO depende do Bunny.

import { Readable } from "stream";
import { logger } from "../utils/logger.js";

const BUNNY_API_BASE = "https://video.bunnycdn.com";
const BUNNY_EMBED_BASE = "https://iframe.mediadelivery.net/embed";

export interface BunnyConfig {
  libraryId: string;
  apiKey: string;
  cdnHostname: string;
  webhookSecret: string | null;
}

export function getBunnyConfig(): BunnyConfig | null {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim();
  if (!libraryId || !apiKey || !cdnHostname) return null;
  return {
    libraryId,
    apiKey,
    cdnHostname: cdnHostname.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
    webhookSecret: process.env.BUNNY_STREAM_WEBHOOK_SECRET?.trim() || null,
  };
}

export function isBunnyConfigured(): boolean {
  return getBunnyConfig() !== null;
}

export function logBunnyBootStatus(): void {
  const cfg = getBunnyConfig();
  if (!cfg) {
    logger.info("Bunny", "Bunny Stream disabled (missing env vars).");
    return;
  }
  if (!cfg.webhookSecret) {
    logger.warn(
      "Bunny",
      "Bunny Stream enabled but BUNNY_STREAM_WEBHOOK_SECRET is unset — webhooks will be rejected.",
    );
  } else {
    logger.info("Bunny", `Bunny Stream enabled (library ${cfg.libraryId}).`);
  }
}

// ── Bunny REST wrapper ────────────────────────────────────────────────
export class BunnyError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
  }
}

function requireConfig(): BunnyConfig {
  const cfg = getBunnyConfig();
  if (!cfg) throw new BunnyError("Bunny Stream não está configurado", 503);
  return cfg;
}

interface BunnyVideoCreate { guid: string; title: string; status: number }

// Bunny status codes: 0=Created 1=Uploaded 2=Processing 3=Transcoding
// 4=Finished 5=Error 6=UploadFailed.
export function bunnyStatusToInternal(s: number): "processing" | "ready" | "failed" {
  if (s === 4) return "ready";
  if (s === 5 || s === 6) return "failed";
  return "processing";
}

export async function createBunnyVideo(title: string): Promise<BunnyVideoCreate> {
  const cfg = requireConfig();
  const res = await fetch(`${BUNNY_API_BASE}/library/${cfg.libraryId}/videos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      AccessKey: cfg.apiKey,
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new BunnyError(`createVideo falhou (${res.status})`, 502);
  }
  const json = (await res.json()) as { guid: string; title: string; status: number };
  if (!json.guid) throw new BunnyError("createVideo: resposta sem guid", 502);
  return { guid: json.guid, title: json.title ?? title, status: json.status ?? 0 };
}

export async function uploadBunnyVideo(
  guid: string,
  body: Readable | Buffer,
  contentLength?: number,
): Promise<void> {
  const cfg = requireConfig();
  const headers: Record<string, string> = {
    AccessKey: cfg.apiKey,
    "Content-Type": "application/octet-stream",
  };
  if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
  const res = await fetch(`${BUNNY_API_BASE}/library/${cfg.libraryId}/videos/${guid}`, {
    method: "PUT",
    headers,
    // Node's undici fetch supports Readable as body but typings are lax.
    body: body as unknown as BodyInit,
    // @ts-expect-error — undici-only flag required when sending a Readable.
    duplex: "half",
  });
  if (!res.ok) {
    throw new BunnyError(`uploadVideo falhou (${res.status})`, 502);
  }
}

export interface BunnyVideoStatus {
  guid: string;
  status: number;
  length: number; // duração em segundos
  thumbnailFileName: string | null;
}

export async function getBunnyVideo(guid: string): Promise<BunnyVideoStatus> {
  const cfg = requireConfig();
  const res = await fetch(`${BUNNY_API_BASE}/library/${cfg.libraryId}/videos/${guid}`, {
    headers: { Accept: "application/json", AccessKey: cfg.apiKey },
  });
  if (!res.ok) throw new BunnyError(`getVideo falhou (${res.status})`, 502);
  const json = (await res.json()) as {
    guid: string; status: number; length: number; thumbnailFileName?: string | null;
  };
  return {
    guid: json.guid,
    status: json.status ?? 0,
    length: json.length ?? 0,
    thumbnailFileName: json.thumbnailFileName ?? null,
  };
}

export async function deleteBunnyVideo(guid: string): Promise<void> {
  const cfg = requireConfig();
  const res = await fetch(`${BUNNY_API_BASE}/library/${cfg.libraryId}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: cfg.apiKey },
  });
  // 404 = já deletado: aceitamos como sucesso (idempotente).
  if (!res.ok && res.status !== 404) {
    throw new BunnyError(`deleteVideo falhou (${res.status})`, 502);
  }
}

// ── URL builders ──────────────────────────────────────────────────────
export const BUNNY_PREFIX = "bunny://";

export interface ParsedBunnyRef {
  libraryId: string;
  guid: string;
}

// Aceita tanto o sentinel completo `bunny://<lib>/<guid>` quanto só o GUID
// (caso histórico de quem grave apenas o id). Retorna null se inválido.
export function parseBunnyRef(stored: string | null | undefined, fallbackLibraryId?: string): ParsedBunnyRef | null {
  if (!stored) return null;
  if (stored.startsWith(BUNNY_PREFIX)) {
    const rest = stored.slice(BUNNY_PREFIX.length);
    const [lib, guid] = rest.split("/");
    if (!lib || !guid) return null;
    return { libraryId: lib, guid };
  }
  // GUID puro: precisa de libraryId padrão (config).
  if (/^[0-9a-f-]{8,}$/i.test(stored) && fallbackLibraryId) {
    return { libraryId: fallbackLibraryId, guid: stored };
  }
  return null;
}

export function buildBunnySentinel(libraryId: string, guid: string): string {
  return `${BUNNY_PREFIX}${libraryId}/${guid}`;
}

export function bunnyEmbedUrl(libraryId: string, guid: string, opts?: { primaryColor?: string }): string {
  const params = new URLSearchParams();
  if (opts?.primaryColor) params.set("primaryColor", opts.primaryColor.replace(/^#/, ""));
  params.set("autoplay", "false");
  const qs = params.toString();
  return `${BUNNY_EMBED_BASE}/${libraryId}/${guid}${qs ? `?${qs}` : ""}`;
}

export function bunnyHlsUrl(cdnHostname: string, guid: string): string {
  return `https://${cdnHostname}/${guid}/playlist.m3u8`;
}

export function bunnyThumbnailUrl(cdnHostname: string, guid: string): string {
  return `https://${cdnHostname}/${guid}/thumbnail.jpg`;
}

// Cor primária RAYO (terra-500) usada no player customizado.
const RAYO_PRIMARY = "C8553D";

// Resolve o sentinel `bunny://` em URLs para o frontend. Retorna null se
// o ref for inválido OU se Bunny não estiver configurado.
export function resolveBunnyVideo(externalId: string | null | undefined): {
  embed_url: string;
  hls_url: string;
  thumbnail_url: string;
} | null {
  const cfg = getBunnyConfig();
  if (!cfg) return null;
  const parsed = parseBunnyRef(externalId, cfg.libraryId);
  if (!parsed) return null;
  return {
    embed_url: bunnyEmbedUrl(parsed.libraryId, parsed.guid, { primaryColor: RAYO_PRIMARY }),
    hls_url: bunnyHlsUrl(cfg.cdnHostname, parsed.guid),
    thumbnail_url: bunnyThumbnailUrl(cfg.cdnHostname, parsed.guid),
  };
}

// Helper para o serializador do CMS: dado um row contendo
// `video_provider`/`video_external_id`/`video_thumbnail_url`, devolve uma
// cópia com `video_embed_url`/`video_hls_url` derivados e
// `video_thumbnail_url` preenchido (preferindo o salvo pelo webhook).
export function withResolvedBunnyFields<T extends {
  video_provider?: string | null;
  video_external_id?: string | null;
  video_thumbnail_url?: string | null;
}>(row: T): T & {
  video_embed_url: string | null;
  video_hls_url: string | null;
} {
  const out = {
    ...row,
    video_embed_url: null as string | null,
    video_hls_url: null as string | null,
  };
  if (row.video_provider !== "bunny" || !row.video_external_id) return out;
  const resolved = resolveBunnyVideo(row.video_external_id);
  if (!resolved) return out;
  out.video_embed_url = resolved.embed_url;
  out.video_hls_url = resolved.hls_url;
  if (!out.video_thumbnail_url) out.video_thumbnail_url = resolved.thumbnail_url;
  return out;
}
