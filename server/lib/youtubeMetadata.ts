// Task #183 — Auto-preencher capa e duração de vídeos do YouTube no CMS.
//
// Detecta URLs do YouTube (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/),
// extrai o videoId e busca metadata pública via noembed.com (oEmbed estendido
// que inclui `duration` em segundos pra YouTube). Sem auth, sem API key.
//
// Tratamento defensivo: timeout curto, retorno parcial OK, NUNCA lança.
// Caller decide o que fazer quando o resultado vier null/parcial.

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const FETCH_TIMEOUT_MS = 3500;

export interface YouTubeMetadata {
  videoId: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  title: string | null;
}

/** Extrai o videoId de qualquer URL conhecida do YouTube. Retorna null se a
 *  URL não for do YouTube ou se o id não puder ser identificado. */
export function extractYouTubeVideoId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return isValidVideoId(id) ? id : null;
  }

  // /watch?v=<id>
  const v = url.searchParams.get("v");
  if (v && isValidVideoId(v)) return v;

  // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
  const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/);
  if (m && isValidVideoId(m[1])) return m[1];

  return null;
}

function isValidVideoId(id: string): boolean {
  // YouTube ids são tipicamente 11 chars [A-Za-z0-9_-]. Aceitamos 6+ pra
  // ser tolerante a futuras mudanças, mas barramos lixo óbvio.
  return /^[A-Za-z0-9_-]{6,}$/.test(id);
}

/** Thumbnail pública do YouTube. `hqdefault` (480x360) tem disponibilidade
 *  praticamente universal; `maxresdefault` falha pra muitos vídeos antigos. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Conveniência: dado um `external_url` qualquer, devolve a thumbnail
 *  determinística do YouTube quando a URL é reconhecida; null caso contrário.
 *  Usado pelo fallback de capa em respostas públicas (listPublicContent /
 *  getPublicContentDetail) pra cobrir vídeos legados cadastrados antes do
 *  autofill da Task #183. */
export function youtubeThumbnailFromExternalUrl(
  rawUrl: string | null | undefined,
): string | null {
  const id = extractYouTubeVideoId(rawUrl);
  return id ? youTubeThumbnailUrl(id) : null;
}

/** Busca metadata pública via noembed.com. Nunca lança — retorna null em
 *  caso de erro/timeout/resposta inválida. */
export async function fetchYouTubeMetadata(
  rawUrl: string,
): Promise<YouTubeMetadata | null> {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) return null;

  // Thumbnail funciona offline (URL determinística), então preenchemos
  // mesmo quando o noembed falhar. Duração só vem do noembed.
  const thumbnailUrl = youTubeThumbnailUrl(videoId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // noembed.com é um wrapper público de oEmbed. Pra YouTube ele inclui
    // `duration` (em segundos) além dos campos padrão oEmbed.
    const endpoint =
      "https://noembed.com/embed?url=" +
      encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { videoId, thumbnailUrl, durationSeconds: null, title: null };
    }
    const json = (await res.json()) as {
      title?: unknown;
      duration?: unknown;
      thumbnail_url?: unknown;
      error?: unknown;
    };
    if (json && typeof json === "object" && json.error) {
      return { videoId, thumbnailUrl, durationSeconds: null, title: null };
    }
    const duration =
      typeof json.duration === "number" && json.duration > 0
        ? Math.round(json.duration)
        : null;
    const remoteThumb =
      typeof json.thumbnail_url === "string" && json.thumbnail_url.trim()
        ? json.thumbnail_url.trim()
        : null;
    const title =
      typeof json.title === "string" && json.title.trim() ? json.title.trim() : null;
    return {
      videoId,
      thumbnailUrl: remoteThumb || thumbnailUrl,
      durationSeconds: duration,
      title,
    };
  } catch {
    // Timeout ou erro de rede — devolve só o que dá pra inferir
    // localmente (thumbnail), mantendo o contrato de não-lançar.
    return { videoId, thumbnailUrl, durationSeconds: null, title: null };
  } finally {
    clearTimeout(timer);
  }
}
