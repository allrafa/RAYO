import { query, getClient } from "../../db/index.js";
import type { SafeUser, UserRole } from "../auth/service.js";

export class CmsError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Authorisation helper. Producers may only mutate content they created.
// Moderators and admins may override (editorial supervision).
const ROLE_RANK: Record<UserRole, number> = { client: 0, producer: 1, moderator: 2, admin: 3 };
function isElevated(user: SafeUser | undefined | null): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK["moderator"];
}
function assertCanMutate(user: SafeUser | undefined | null, ownerId: number | null) {
  if (!user) throw new CmsError("Autenticação necessária", "UNAUTHORIZED", 401);
  if (isElevated(user)) return;
  if (ownerId !== null && ownerId !== user.id) {
    throw new CmsError(
      "Você só pode editar conteúdos que criou. Peça a um moderador para alterar este item.",
      "NOT_OWNER", 403
    );
  }
}

export type ContentKind = "audio" | "video" | "reels" | "serie" | "curso" | "livro";
export type ContentStatus = "draft" | "published";
export type EpisodeKind = "audio" | "video";

export const VALID_KINDS: ContentKind[] = ["audio", "video", "reels", "serie", "curso", "livro"];
export const VALID_STATUSES: ContentStatus[] = ["draft", "published"];

interface ContentItemRow {
  id: number;
  kind: ContentKind;
  title: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  segments: string[];
  interests: string[];
  tags: string[];
  status: ContentStatus;
  is_premium: boolean;
  price: string;
  media_url: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  hook: string | null;
  cta: string | null;
  author: string | null;
  pages: number | null;
  course_id: number | null;
  view_count: number;
  created_by: number | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ContentInput {
  kind: ContentKind;
  title: string;
  slug?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  cover_url?: string | null;
  segments?: string[];
  interests?: string[];
  tags?: string[];
  status?: ContentStatus;
  is_premium?: boolean;
  price?: number;
  media_url?: string | null;
  external_url?: string | null;
  duration_seconds?: number | null;
  transcript?: string | null;
  hook?: string | null;
  cta?: string | null;
  author?: string | null;
  pages?: number | null;
  course_id?: number | null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 280);
}

async function ensureUniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base || "item";
  let attempt = 0;
  // Cap at 50 attempts to avoid pathological loops; should converge quickly.
  while (attempt < 50) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const { rows } = await query(
      `SELECT id FROM content_items WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`,
      [candidate, excludeId ?? null]
    );
    if (rows.length === 0) return candidate;
    attempt++;
  }
  throw new CmsError("Não foi possível gerar slug único", "SLUG_GENERATION_FAILED", 500);
}

function validateKind(kind: unknown): asserts kind is ContentKind {
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as ContentKind)) {
    throw new CmsError(`Tipo inválido. Use um de: ${VALID_KINDS.join(", ")}`, "INVALID_KIND", 400);
  }
}

function validateStatus(status: unknown): asserts status is ContentStatus {
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as ContentStatus)) {
    throw new CmsError("Status inválido (draft|published)", "INVALID_STATUS", 400);
  }
}

function normaliseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 50);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function listAdminContent(filters: {
  kind?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.kind && filters.kind !== "all") {
    if (!VALID_KINDS.includes(filters.kind as ContentKind)) {
      throw new CmsError("Tipo inválido", "INVALID_KIND", 400);
    }
    where.push(`kind = $${idx++}`);
    params.push(filters.kind);
  }
  if (filters.status && filters.status !== "all") {
    if (!VALID_STATUSES.includes(filters.status as ContentStatus)) {
      throw new CmsError("Status inválido", "INVALID_STATUS", 400);
    }
    where.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.search) {
    where.push(`(title ILIKE $${idx} OR short_description ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM content_items ${whereClause}`,
    params
  );

  const { rows } = await query(
    `SELECT id, kind, title, slug, short_description, cover_url, status,
            is_premium, view_count, published_at, created_at, updated_at
       FROM content_items
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}

export async function listPublicContent(opts: {
  kind?: string;
  segment?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: string[] = [`status = 'published'`];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.kind && opts.kind !== "all") {
    if (!VALID_KINDS.includes(opts.kind as ContentKind)) {
      throw new CmsError("Tipo inválido", "INVALID_KIND", 400);
    }
    where.push(`kind = $${idx++}`);
    params.push(opts.kind);
  }
  if (opts.segment && opts.segment !== "all") {
    where.push(`(cardinality(segments) = 0 OR $${idx} = ANY(segments))`);
    params.push(opts.segment);
    idx++;
  }
  if (opts.search) {
    where.push(`(title ILIKE $${idx} OR short_description ILIKE $${idx})`);
    params.push(`%${opts.search}%`);
    idx++;
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;

  const { rows } = await query(
    `SELECT id, kind, title, slug, short_description, cover_url, segments, interests,
            tags, is_premium, price, duration_seconds, hook, author, pages, view_count,
            published_at
       FROM content_items
       ${whereClause}
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { items: rows, pagination: { page, limit } };
}

export async function getAdminContentDetail(id: number) {
  const { rows } = await query(`SELECT * FROM content_items WHERE id = $1`, [id]);
  if (rows.length === 0) return null;
  const item = rows[0] as ContentItemRow;

  const { rows: episodes } = await query(
    `SELECT id, title, description, episode_kind, media_url, external_url,
            duration_seconds, transcript, sort_order
       FROM content_episodes WHERE series_id = $1 ORDER BY sort_order, id`,
    [id]
  );

  return { ...item, episodes };
}

export async function getPublicContentDetail(id: number) {
  const { rows } = await query(
    `SELECT id, kind, title, slug, short_description, long_description, cover_url,
            segments, interests, tags, is_premium, price, media_url, external_url,
            duration_seconds, transcript, hook, cta, author, pages, course_id,
            view_count, published_at
       FROM content_items WHERE id = $1 AND status = 'published'`,
    [id]
  );
  if (rows.length === 0) return null;
  const item = rows[0];

  const { rows: episodes } = await query(
    `SELECT id, title, description, episode_kind, media_url, external_url,
            duration_seconds, transcript, sort_order
       FROM content_episodes WHERE series_id = $1 ORDER BY sort_order, id`,
    [id]
  );

  await query(`UPDATE content_items SET view_count = view_count + 1 WHERE id = $1`, [id]);

  return { ...item, episodes };
}

function buildPayload(input: ContentInput) {
  validateKind(input.kind);
  if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new CmsError("Título é obrigatório", "TITLE_REQUIRED", 400);
  }
  if (input.title.length > 300) {
    throw new CmsError("Título muito longo (máx 300)", "TITLE_TOO_LONG", 400);
  }
  if (input.status) validateStatus(input.status);

  return {
    kind: input.kind,
    title: input.title.trim(),
    short_description: input.short_description ?? null,
    long_description: input.long_description ?? null,
    cover_url: input.cover_url ?? null,
    segments: normaliseStringArray(input.segments),
    interests: normaliseStringArray(input.interests),
    tags: normaliseStringArray(input.tags),
    status: input.status ?? "draft",
    is_premium: !!input.is_premium,
    price: toNumberOrNull(input.price) ?? 0,
    media_url: input.media_url ?? null,
    external_url: input.external_url ?? null,
    duration_seconds: toNumberOrNull(input.duration_seconds),
    transcript: input.transcript ?? null,
    hook: input.hook ?? null,
    cta: input.cta ?? null,
    author: input.author ?? null,
    pages: toNumberOrNull(input.pages),
    course_id: toNumberOrNull(input.course_id),
  };
}

// Run an INSERT/UPDATE with `slug` and retry on PG unique-violation (23505),
// regenerating the slug. Without this, two concurrent admins creating items
// with the same title would race past the SELECT in ensureUniqueSlug() and
// one would get a 500 from the unique constraint.
async function withSlugRetry<T>(
  baseSlug: string,
  excludeId: number | undefined,
  exec: (slug: string) => Promise<T>,
): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await ensureUniqueSlug(baseSlug, excludeId);
    try {
      return await exec(slug);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "23505") throw err; // not a unique violation, propagate
      lastErr = err;
      // loop again — ensureUniqueSlug() will pick a fresh suffix.
    }
  }
  throw lastErr instanceof Error ? lastErr : new CmsError("Slug em conflito", "SLUG_CONFLICT", 409);
}

export async function createContent(user: SafeUser, input: ContentInput) {
  const payload = buildPayload(input);
  const slugBase = input.slug?.trim() ? slugify(input.slug) : slugify(payload.title);
  const publishedAt = payload.status === "published" ? new Date() : null;

  return withSlugRetry(slugBase, undefined, async (slug) => {
    const { rows } = await query(
      `INSERT INTO content_items
        (kind, title, slug, short_description, long_description, cover_url,
         segments, interests, tags, status, is_premium, price,
         media_url, external_url, duration_seconds, transcript, hook, cta,
         author, pages, course_id, created_by, published_at)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        payload.kind, payload.title, slug, payload.short_description, payload.long_description,
        payload.cover_url, payload.segments, payload.interests, payload.tags, payload.status,
        payload.is_premium, payload.price, payload.media_url, payload.external_url,
        payload.duration_seconds, payload.transcript, payload.hook, payload.cta,
        payload.author, payload.pages, payload.course_id, user.id, publishedAt,
      ]
    );
    return rows[0];
  });
}

export async function updateContent(user: SafeUser, id: number, input: Partial<ContentInput>) {
  const { rows: existing } = await query(`SELECT * FROM content_items WHERE id = $1`, [id]);
  if (existing.length === 0) throw new CmsError("Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
  const current = existing[0] as ContentItemRow;
  assertCanMutate(user, current.created_by);

  const merged: ContentInput = {
    kind: (input.kind ?? current.kind) as ContentKind,
    title: input.title ?? current.title,
    short_description: input.short_description ?? current.short_description,
    long_description: input.long_description ?? current.long_description,
    cover_url: input.cover_url ?? current.cover_url,
    segments: input.segments ?? current.segments,
    interests: input.interests ?? current.interests,
    tags: input.tags ?? current.tags,
    status: (input.status ?? current.status) as ContentStatus,
    is_premium: input.is_premium ?? current.is_premium,
    price: input.price ?? Number(current.price ?? 0),
    media_url: input.media_url ?? current.media_url,
    external_url: input.external_url ?? current.external_url,
    duration_seconds: input.duration_seconds ?? current.duration_seconds,
    transcript: input.transcript ?? current.transcript,
    hook: input.hook ?? current.hook,
    cta: input.cta ?? current.cta,
    author: input.author ?? current.author,
    pages: input.pages ?? current.pages,
    course_id: input.course_id ?? current.course_id,
  };

  const payload = buildPayload(merged);
  // Disallow turning a series into another kind while it still has episodes
  // (orphaned episodes would violate the app-level "episodes only on series"
  // invariant). Producers must delete episodes first.
  if (current.kind === "serie" && payload.kind !== "serie") {
    const { rows: ep } = await query(
      `SELECT 1 FROM content_episodes WHERE series_id = $1 LIMIT 1`,
      [id]
    );
    if (ep.length > 0) {
      throw new CmsError(
        "Remova os episódios antes de mudar o tipo desta série.",
        "SERIES_HAS_EPISODES", 400
      );
    }
  }

  const wasPublished = current.status === "published";
  const willPublish = payload.status === "published";
  const publishedAt = willPublish && !wasPublished ? new Date() : current.published_at;

  const baseSlug = input.slug !== undefined
    ? (input.slug?.trim() ? slugify(input.slug) : slugify(payload.title))
    : (current.slug ?? slugify(payload.title));
  const needsSlugRetry = input.slug !== undefined || !current.slug;

  const runUpdate = async (slug: string) => {
    const { rows } = await query(
      `UPDATE content_items SET
          kind = $1, title = $2, slug = $3, short_description = $4, long_description = $5,
          cover_url = $6, segments = $7, interests = $8, tags = $9, status = $10,
          is_premium = $11, price = $12, media_url = $13, external_url = $14,
          duration_seconds = $15, transcript = $16, hook = $17, cta = $18,
          author = $19, pages = $20, course_id = $21, published_at = $22,
          updated_at = NOW()
        WHERE id = $23
        RETURNING *`,
      [
        payload.kind, payload.title, slug, payload.short_description, payload.long_description,
        payload.cover_url, payload.segments, payload.interests, payload.tags, payload.status,
        payload.is_premium, payload.price, payload.media_url, payload.external_url,
        payload.duration_seconds, payload.transcript, payload.hook, payload.cta,
        payload.author, payload.pages, payload.course_id, publishedAt, id,
      ]
    );
    return rows[0];
  };

  return needsSlugRetry
    ? withSlugRetry(baseSlug, id, runUpdate)
    : runUpdate(current.slug!);
}

export async function setContentStatus(user: SafeUser, id: number, status: ContentStatus) {
  validateStatus(status);
  const { rows: existing } = await query(
    `SELECT status, published_at, created_by FROM content_items WHERE id = $1`,
    [id]
  );
  if (existing.length === 0) throw new CmsError("Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
  assertCanMutate(user, existing[0].created_by);
  const wasPublished = existing[0].status === "published";
  const publishedAt = status === "published" && !wasPublished ? new Date() : existing[0].published_at;
  const { rows } = await query(
    `UPDATE content_items SET status = $1, published_at = $2, updated_at = NOW()
     WHERE id = $3 RETURNING id, status, published_at`,
    [status, publishedAt, id]
  );
  return rows[0];
}

export async function deleteContent(user: SafeUser, id: number) {
  const { rows: existing } = await query(`SELECT created_by FROM content_items WHERE id = $1`, [id]);
  if (existing.length === 0) throw new CmsError("Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
  assertCanMutate(user, existing[0].created_by);
  const { rows } = await query(`DELETE FROM content_items WHERE id = $1 RETURNING id`, [id]);
  return { id: rows[0].id };
}

// Episodes inherit ownership from their parent series. This guard is shared
// by createEpisode/updateEpisode/deleteEpisode below.
async function loadSeriesOwner(seriesId: number): Promise<{ id: number; kind: string; created_by: number | null } | null> {
  const { rows } = await query(
    `SELECT id, kind, created_by FROM content_items WHERE id = $1`,
    [seriesId]
  );
  return rows[0] ?? null;
}

// ── Episodes (for kind='serie') ───────────────────────────────────────
export interface EpisodeInput {
  title: string;
  description?: string | null;
  episode_kind?: EpisodeKind;
  media_url?: string | null;
  external_url?: string | null;
  duration_seconds?: number | null;
  transcript?: string | null;
  sort_order?: number;
}

export async function listEpisodes(seriesId: number) {
  const { rows } = await query(
    `SELECT * FROM content_episodes WHERE series_id = $1 ORDER BY sort_order, id`,
    [seriesId]
  );
  return rows;
}

export async function createEpisode(user: SafeUser, seriesId: number, input: EpisodeInput) {
  const parent = await loadSeriesOwner(seriesId);
  if (!parent) throw new CmsError("Série não encontrada", "SERIES_NOT_FOUND", 404);
  if (parent.kind !== "serie") throw new CmsError("Episódios só podem ser anexados a uma série", "NOT_A_SERIES", 400);
  assertCanMutate(user, parent.created_by);
  if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new CmsError("Título do episódio é obrigatório", "TITLE_REQUIRED", 400);
  }
  const epKind: EpisodeKind = input.episode_kind === "video" ? "video" : "audio";

  const { rows } = await query(
    `INSERT INTO content_episodes
       (series_id, title, description, episode_kind, media_url, external_url,
        duration_seconds, transcript, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      seriesId, input.title.trim(), input.description ?? null, epKind,
      input.media_url ?? null, input.external_url ?? null,
      toNumberOrNull(input.duration_seconds), input.transcript ?? null,
      toNumberOrNull(input.sort_order) ?? 0,
    ]
  );
  return rows[0];
}

export async function updateEpisode(user: SafeUser, seriesId: number, episodeId: number, input: Partial<EpisodeInput>) {
  const parent = await loadSeriesOwner(seriesId);
  if (!parent) throw new CmsError("Série não encontrada", "SERIES_NOT_FOUND", 404);
  assertCanMutate(user, parent.created_by);
  const { rows: existing } = await query(
    `SELECT * FROM content_episodes WHERE id = $1 AND series_id = $2`,
    [episodeId, seriesId]
  );
  if (existing.length === 0) throw new CmsError("Episódio não encontrado", "EPISODE_NOT_FOUND", 404);
  const cur = existing[0];

  const epKind: EpisodeKind = (input.episode_kind ?? cur.episode_kind) === "video" ? "video" : "audio";
  const title = input.title?.trim() ?? cur.title;

  const { rows } = await query(
    `UPDATE content_episodes SET
       title = $1, description = $2, episode_kind = $3, media_url = $4,
       external_url = $5, duration_seconds = $6, transcript = $7, sort_order = $8
     WHERE id = $9 RETURNING *`,
    [
      title,
      input.description ?? cur.description,
      epKind,
      input.media_url ?? cur.media_url,
      input.external_url ?? cur.external_url,
      input.duration_seconds !== undefined ? toNumberOrNull(input.duration_seconds) : cur.duration_seconds,
      input.transcript ?? cur.transcript,
      input.sort_order !== undefined ? (toNumberOrNull(input.sort_order) ?? 0) : cur.sort_order,
      episodeId,
    ]
  );
  return rows[0];
}

export async function deleteEpisode(user: SafeUser, seriesId: number, episodeId: number) {
  const parent = await loadSeriesOwner(seriesId);
  if (!parent) throw new CmsError("Série não encontrada", "SERIES_NOT_FOUND", 404);
  assertCanMutate(user, parent.created_by);
  const { rows } = await query(
    `DELETE FROM content_episodes WHERE id = $1 AND series_id = $2 RETURNING id`,
    [episodeId, seriesId]
  );
  if (rows.length === 0) throw new CmsError("Episódio não encontrado", "EPISODE_NOT_FOUND", 404);
  return { id: rows[0].id };
}

// ── Media assets ──────────────────────────────────────────────────────
export async function recordMediaAsset(payload: {
  uploadedBy: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  kind?: string;
}) {
  const { rows } = await query(
    `INSERT INTO media_assets
       (uploaded_by, filename, original_name, mime_type, size_bytes, storage_path, public_url, kind)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      payload.uploadedBy, payload.filename, payload.originalName, payload.mimeType,
      payload.sizeBytes, payload.storagePath, payload.publicUrl, payload.kind ?? null,
    ]
  );
  return rows[0];
}

export async function listMediaAssets(userId: number, page = 1, limit = 30) {
  const offset = (page - 1) * limit;
  const { rows } = await query(
    `SELECT id, filename, original_name, mime_type, size_bytes, public_url, kind, created_at, uploaded_by
       FROM media_assets
       WHERE uploaded_by = $1 OR $2::boolean = true
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [userId, false, limit, offset]
  );
  return rows;
}

// Surface existing courses (from the legacy seed) so the producer can
// see them in the CMS list and link them with kind='curso' content_items.
export async function listCoursesForCms() {
  const { rows } = await query(
    `SELECT c.id, c.title, c.life_context, c.is_premium, c.is_active,
            ci.id AS content_item_id, ci.status
       FROM courses c
       LEFT JOIN content_items ci ON ci.course_id = c.id
       ORDER BY c.id DESC`
  );
  return rows;
}

// Used by AppContext.refreshBooks() to know which books exist, even drafts not visible to the public.
// Public consumption goes through listPublicContent / getPublicContentDetail.
export const __noop = () => getClient; // keep import of getClient if needed later
