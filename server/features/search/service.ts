import { query } from "../../db/index.js";
import { withResolvedBunnyFields } from "../../lib/bunnyStream.js";

// Task #44 — Busca textual unificada simples (ILIKE) sobre cursos,
// content_items publicados, posts visíveis e usuários. Cada categoria
// é limitada para evitar payloads grandes; resultados ordenados por
// relevância grosseira (match no título primeiro, depois descrição).

export interface SearchResult {
  kind: "curso" | "video" | "audio" | "reels" | "podcast" | "post" | "user";
  id: number;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  ctaTarget: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  byKind: Record<string, number>;
}

const PER_CATEGORY_LIMIT = 5;

export async function searchAll(qRaw: string): Promise<SearchResponse> {
  const q = (qRaw || "").trim();
  if (q.length < 2) {
    return { query: q, results: [], byKind: {} };
  }
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const [coursesRes, contentRes, postsRes, usersRes] = await Promise.all([
    query<{
      id: number;
      title: string;
      description: string | null;
      thumbnail: string | null;
    }>(
      `SELECT id, title, description, thumbnail
         FROM courses
        WHERE is_active = TRUE
          AND (title ILIKE $1 OR description ILIKE $1)
        ORDER BY (CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END), students DESC
        LIMIT $2`,
      [like, PER_CATEGORY_LIMIT],
    ),
    query<{
      id: number;
      kind: string;
      title: string;
      short_description: string | null;
      cover_url: string | null;
      media_url: string | null;
      external_url: string | null;
      video_provider: string | null;
      video_external_id: string | null;
      video_thumbnail_url: string | null;
    }>(
      // Task #86 — busca também precisa entender o sentinel Bunny pra que
      // os cards de resultado tragam thumb/embed corretos.
      `SELECT id, kind, title, short_description, cover_url,
              media_url, external_url,
              video_provider, video_external_id, video_thumbnail_url
         FROM content_items
        WHERE status = 'published'
          AND kind IN ('audio','video','reels','podcast')
          AND (title ILIKE $1 OR short_description ILIKE $1)
        ORDER BY (CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END),
                 view_count DESC
        LIMIT $2`,
      [like, PER_CATEGORY_LIMIT],
    ),
    query<{
      id: number;
      title: string | null;
      content: string;
    }>(
      `SELECT id, title, content
         FROM posts
        WHERE is_hidden = FALSE
          AND (title ILIKE $1 OR content ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2`,
      [like, PER_CATEGORY_LIMIT],
    ),
    query<{ id: number; name: string }>(
      `SELECT id, name FROM users
        WHERE name ILIKE $1
        ORDER BY name ASC
        LIMIT $2`,
      [like, PER_CATEGORY_LIMIT],
    ),
  ]);

  const results: SearchResult[] = [
    ...coursesRes.rows.map<SearchResult>((c) => ({
      kind: "curso",
      id: c.id,
      title: c.title,
      subtitle: c.description ? truncate(c.description, 80) : null,
      thumbnail: c.thumbnail,
      ctaTarget: null,
    })),
    ...contentRes.rows.map<SearchResult>((c) => {
      const resolved = withResolvedBunnyFields(c);
      return {
        kind: normalizeContentKind(c.kind),
        id: c.id,
        title: c.title,
        subtitle: c.short_description ? truncate(c.short_description, 80) : null,
        thumbnail: resolved.video_thumbnail_url || c.cover_url,
        ctaTarget:
          resolved.video_embed_url ||
          c.external_url?.trim() ||
          c.media_url?.trim() ||
          null,
      };
    }),
    ...postsRes.rows.map<SearchResult>((p) => ({
      kind: "post",
      id: p.id,
      title: p.title?.trim() || truncate(p.content, 60),
      subtitle: p.title ? truncate(p.content, 80) : null,
      thumbnail: null,
      ctaTarget: null,
    })),
    ...usersRes.rows.map<SearchResult>((u) => ({
      kind: "user",
      id: u.id,
      title: u.name,
      subtitle: null,
      thumbnail: null,
      ctaTarget: null,
    })),
  ];

  const byKind: Record<string, number> = {};
  for (const r of results) {
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  }

  return { query: q, results, byKind };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function normalizeContentKind(kind: string): SearchResult["kind"] {
  if (kind === "audio") return "audio";
  if (kind === "podcast") return "podcast";
  if (kind === "video") return "video";
  if (kind === "reels") return "reels";
  return "video";
}
