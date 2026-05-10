import { query, getClient } from "../../db/index.js";
import type { SafeUser } from "../auth/service.js";

export class HomeFeedError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type HomeFeedSection =
  | "recently_played"
  | "made_for_you"
  | "trending"
  | "podcasts";

export const VALID_SECTIONS: HomeFeedSection[] = [
  "recently_played",
  "made_for_you",
  "trending",
  "podcasts",
];

export const SECTION_LABELS: Record<HomeFeedSection, string> = {
  recently_played: "Tocados recentemente",
  made_for_you: "Feito para você",
  trending: "Em alta no RAYO",
  podcasts: "Podcasts",
};

export interface HomeFeedItemRow {
  id: number;
  section: HomeFeedSection;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  gradient: string | null;
  badge_text: string | null;
  meta_text: string | null;
  progress: number | null;
  sort_order: number;
  is_active: boolean;
  content_item_id: number | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

// Possible visibility states the admin UI surfaces per card. These describe
// the *linked content* (not the card itself):
//   - "ok"          → no link or linked content is published
//   - "draft"       → linked content_item exists but is in draft (not yet
//                      published — work-in-progress)
//   - "archived"    → linked content_item was retired by a producer (Task #26).
//                      Hidden from the public feed for the same reason as draft,
//                      but surfaced distinctly in admin so producers know it
//                      was an intentional retirement (not unfinished work).
//   - "missing"     → content_item_id is set but the row was deleted
//                     (FK uses ON DELETE SET NULL, so the column is null in
//                      practice; we expose this state defensively in case
//                      the FK ever changes or the join misses)
export type LinkedContentStatus = "ok" | "draft" | "archived" | "missing";

export interface AdminHomeFeedItemRow extends HomeFeedItemRow {
  linked_content_status: "draft" | "published" | "archived" | null;
  linked_content_title: string | null;
  linked_content_kind: string | null;
  link_state: LinkedContentStatus;
}

export interface HomeFeedItemInput {
  section: HomeFeedSection;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  gradient?: string | null;
  badge_text?: string | null;
  meta_text?: string | null;
  progress?: number | null;
  sort_order?: number;
  is_active?: boolean;
  content_item_id?: number | null;
}

function validateSection(section: unknown): asserts section is HomeFeedSection {
  if (typeof section !== "string" || !VALID_SECTIONS.includes(section as HomeFeedSection)) {
    throw new HomeFeedError(
      `Seção inválida. Use uma de: ${VALID_SECTIONS.join(", ")}`,
      "INVALID_SECTION",
      400,
    );
  }
}

function toIntOrNull(v: unknown, min?: number, max?: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (min !== undefined && i < min) return min;
  if (max !== undefined && i > max) return max;
  return i;
}

function buildPayload(input: HomeFeedItemInput) {
  validateSection(input.section);
  if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new HomeFeedError("Título é obrigatório", "TITLE_REQUIRED", 400);
  }
  if (input.title.length > 200) {
    throw new HomeFeedError("Título muito longo (máx 200)", "TITLE_TOO_LONG", 400);
  }

  return {
    section: input.section,
    title: input.title.trim(),
    subtitle: input.subtitle?.toString().trim() || null,
    image_url: input.image_url?.toString().trim() || null,
    gradient: input.gradient?.toString().trim() || null,
    badge_text: input.badge_text?.toString().trim() || null,
    meta_text: input.meta_text?.toString().trim() || null,
    progress: toIntOrNull(input.progress, 0, 100),
    sort_order: toIntOrNull(input.sort_order) ?? 0,
    is_active: input.is_active === undefined ? true : !!input.is_active,
    content_item_id: toIntOrNull(input.content_item_id),
  };
}

export async function listAdminHomeFeed(filters?: { section?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.section && filters.section !== "all") {
    validateSection(filters.section);
    where.push(`h.section = $${idx++}`);
    params.push(filters.section);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  // LEFT JOIN content_items so producers can see at a glance whether a card's
  // linked content is published, in draft, or missing entirely. We expose the
  // raw status as well as a derived `link_state` to keep the UI logic simple.
  const { rows } = await query(
    `SELECT h.id, h.section, h.title, h.subtitle, h.image_url, h.gradient,
            h.badge_text, h.meta_text, h.progress, h.sort_order, h.is_active,
            h.content_item_id, h.created_by, h.created_at, h.updated_at,
            ci.status   AS linked_content_status,
            ci.title    AS linked_content_title,
            ci.kind     AS linked_content_kind
       FROM home_feed_items h
       LEFT JOIN content_items ci ON ci.id = h.content_item_id
       ${whereClause}
       ORDER BY h.section, h.sort_order, h.id`,
    params,
  );
  const items: AdminHomeFeedItemRow[] = (rows as Array<
    HomeFeedItemRow & {
      linked_content_status: "draft" | "published" | "archived" | null;
      linked_content_title: string | null;
      linked_content_kind: string | null;
    }
  >).map((r) => {
    let link_state: LinkedContentStatus = "ok";
    if (r.content_item_id !== null) {
      if (r.linked_content_status === null) link_state = "missing";
      else if (r.linked_content_status === "archived") link_state = "archived";
      else if (r.linked_content_status !== "published") link_state = "draft";
    }
    return { ...r, link_state };
  });
  return { items };
}

export async function listPublicHomeFeed() {
  // Filter out cards whose linked content is not published. Cards without a
  // link (content_item_id IS NULL) remain visible — they are static
  // promotions curated by producers and have no detail page to 404 on.
  const { rows } = await query(
    `SELECT h.id, h.section, h.title, h.subtitle, h.image_url, h.gradient,
            h.badge_text, h.meta_text, h.progress, h.sort_order,
            h.content_item_id
       FROM home_feed_items h
       LEFT JOIN content_items ci ON ci.id = h.content_item_id
       WHERE h.is_active = TRUE
         AND (h.content_item_id IS NULL OR ci.status = 'published')
       ORDER BY h.section, h.sort_order, h.id`,
  );
  // Group items by section so the frontend can render rails directly.
  const sections: Record<HomeFeedSection, HomeFeedItemRow[]> = {
    recently_played: [],
    made_for_you: [],
    trending: [],
    podcasts: [],
  };
  for (const r of rows as HomeFeedItemRow[]) {
    if (sections[r.section]) sections[r.section].push(r);
  }
  return { sections };
}

export async function createHomeFeedItem(user: SafeUser, input: HomeFeedItemInput) {
  const payload = buildPayload(input);
  const { rows } = await query(
    `INSERT INTO home_feed_items
       (section, title, subtitle, image_url, gradient, badge_text, meta_text,
        progress, sort_order, is_active, content_item_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      payload.section, payload.title, payload.subtitle, payload.image_url,
      payload.gradient, payload.badge_text, payload.meta_text, payload.progress,
      payload.sort_order, payload.is_active, payload.content_item_id, user.id,
    ],
  );
  return rows[0];
}

export async function updateHomeFeedItem(
  _user: SafeUser,
  id: number,
  input: Partial<HomeFeedItemInput>,
) {
  const { rows: existing } = await query(
    `SELECT * FROM home_feed_items WHERE id = $1`,
    [id],
  );
  if (existing.length === 0) {
    throw new HomeFeedError("Item não encontrado", "ITEM_NOT_FOUND", 404);
  }
  const cur = existing[0] as HomeFeedItemRow;
  // Distinguish "key omitted" (keep current value) from "key explicitly
  // present" (apply the new value, including `null` to clear the field).
  const has = (k: keyof HomeFeedItemInput) =>
    Object.prototype.hasOwnProperty.call(input, k);
  const merged: HomeFeedItemInput = {
    section: (has("section") ? input.section : cur.section) as HomeFeedSection,
    title: has("title") ? (input.title as string) : cur.title,
    subtitle: has("subtitle") ? input.subtitle ?? null : cur.subtitle,
    image_url: has("image_url") ? input.image_url ?? null : cur.image_url,
    gradient: has("gradient") ? input.gradient ?? null : cur.gradient,
    badge_text: has("badge_text") ? input.badge_text ?? null : cur.badge_text,
    meta_text: has("meta_text") ? input.meta_text ?? null : cur.meta_text,
    progress: has("progress") ? input.progress ?? null : cur.progress,
    sort_order: has("sort_order") ? (input.sort_order as number) : cur.sort_order,
    is_active: has("is_active") ? !!input.is_active : cur.is_active,
    content_item_id: has("content_item_id") ? input.content_item_id ?? null : cur.content_item_id,
  };
  const payload = buildPayload(merged);
  const { rows } = await query(
    `UPDATE home_feed_items SET
        section = $1, title = $2, subtitle = $3, image_url = $4, gradient = $5,
        badge_text = $6, meta_text = $7, progress = $8, sort_order = $9,
        is_active = $10, content_item_id = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *`,
    [
      payload.section, payload.title, payload.subtitle, payload.image_url,
      payload.gradient, payload.badge_text, payload.meta_text, payload.progress,
      payload.sort_order, payload.is_active, payload.content_item_id, id,
    ],
  );
  return rows[0];
}

export async function deleteHomeFeedItem(_user: SafeUser, id: number) {
  const { rows } = await query(
    `DELETE FROM home_feed_items WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new HomeFeedError("Item não encontrado", "ITEM_NOT_FOUND", 404);
  }
  return { id: rows[0].id };
}

// Bulk reorder: receives an ordered list of ids per section, rewrites
// `sort_order` accordingly. Wrapped in a transaction so a partial failure
// rolls back, and we validate up-front that every id belongs to `section`
// before issuing any UPDATEs.
export async function reorderHomeFeed(
  _user: SafeUser,
  section: string,
  orderedIds: number[],
) {
  validateSection(section);
  if (!Array.isArray(orderedIds)) {
    throw new HomeFeedError("ordered_ids deve ser um array", "INVALID_ORDER", 400);
  }
  const ids = orderedIds
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return { reordered: 0 };
  // Pre-validate ownership: every id must exist in this section.
  const { rows: owned } = await query<{ id: number }>(
    `SELECT id FROM home_feed_items WHERE section = $1 AND id = ANY($2::int[])`,
    [section, ids],
  );
  const ownedSet = new Set(owned.map((r) => Number(r.id)));
  const stray = ids.filter((id) => !ownedSet.has(id));
  if (stray.length > 0) {
    throw new HomeFeedError(
      `IDs não pertencem à seção '${section}': ${stray.join(", ")}`,
      "INVALID_ORDER",
      400,
    );
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        `UPDATE home_feed_items SET sort_order = $1, updated_at = NOW()
          WHERE id = $2 AND section = $3`,
        [i, ids[i], section],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return { reordered: ids.length };
}
