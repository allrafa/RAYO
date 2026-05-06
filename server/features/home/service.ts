import { query } from "../../db/index.js";
import { addXP, updateStreak } from "../gamification/service.js";

// Kinds eligible for the "Hoje no RAIO" daily prompt. Keep this short:
// the block exists to nudge a single, low-friction interaction per day,
// so longer formats (serie/curso/livro) are deliberately excluded —
// those have their own surfaces.
const TODAY_KINDS = ["audio", "video", "reels"];

// XP awarded for completing today's item. Kept modest so it stacks with
// (and does not dwarf) existing daily missions / streak bonuses.
const TODAY_XP = 15;

interface ContentItemRow {
  id: number;
  kind: string;
  title: string;
  short_description: string | null;
  cover_url: string | null;
  duration_seconds: number | null;
  segments: string[] | null;
  hook: string | null;
  cta: string | null;
  media_url: string | null;
  external_url: string | null;
}

function epochDay(d = new Date()): number {
  return Math.floor(d.getTime() / 86400000);
}

export interface TodayItem {
  id: number;
  kind: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  durationSeconds: number | null;
  hook: string | null;
  ctaLabel: string;
  // Where the primary CTA should take the user. Frontend opens this in
  // a new tab when present; null means "no destination" (rare — the
  // user can still mark complete). external_url wins over media_url so
  // producers can override the played asset with e.g. a YouTube link.
  ctaTarget: string | null;
  segments: string[];
  completedAt: string | null;
}

// Shared between getTodayItem and completeTodayItem so the completion
// endpoint can verify that a client is claiming the *current* daily
// item — never an arbitrary published content row. Both code paths
// MUST use this helper, otherwise the rotation can drift across the
// two endpoints and let users farm XP by replaying yesterday's item.
async function pickTodayItem(userId: number): Promise<ContentItemRow | null> {
  const { rows: userRows } = await query<{ segments: string[] | null }>(
    `SELECT segments FROM users WHERE id = $1`,
    [userId],
  );
  const segments = userRows[0]?.segments ?? [];

  // Prefer items whose segments overlap the user's segments. Fall back to
  // any published audio/video/reels if the segment-filtered pool is empty
  // (e.g. brand-new platform with little content, or user with unusual
  // segment combinations).
  const segmentFiltered = await query<ContentItemRow>(
    `SELECT id, kind, title, short_description, cover_url,
            duration_seconds, segments, hook, cta,
            media_url, external_url
       FROM content_items
      WHERE status = 'published'
        AND kind = ANY($1::text[])
        AND ($2::text[] = '{}' OR segments && $2::text[])
      ORDER BY id`,
    [TODAY_KINDS, segments],
  );

  let items = segmentFiltered.rows;
  if (items.length === 0) {
    const fallback = await query<ContentItemRow>(
      `SELECT id, kind, title, short_description, cover_url,
              duration_seconds, segments, hook, cta,
              media_url, external_url
         FROM content_items
        WHERE status = 'published'
          AND kind = ANY($1::text[])
        ORDER BY id`,
      [TODAY_KINDS],
    );
    items = fallback.rows;
  }

  if (items.length === 0) return null;

  // Deterministic rotation: same user gets the same item all day, but the
  // (epochDay + userId) seed shifts the choice across days *and* across
  // users on the same day, so it never feels like everyone is being told
  // to consume the exact same thing.
  const idx = (epochDay() + userId) % items.length;
  return items[idx];
}

export async function getTodayItem(userId: number): Promise<TodayItem | null> {
  const picked = await pickTodayItem(userId);
  if (!picked) return null;

  const { rows: compRows } = await query<{ completed_at: string }>(
    `SELECT completed_at
       FROM home_today_completions
      WHERE user_id = $1 AND completed_date = CURRENT_DATE`,
    [userId],
  );

  return {
    id: picked.id,
    kind: picked.kind,
    title: picked.title,
    subtitle: picked.short_description,
    coverUrl: picked.cover_url,
    durationSeconds: picked.duration_seconds,
    hook: picked.hook,
    ctaLabel:
      picked.cta?.trim() ||
      (picked.kind === "audio" ? "Ouvir agora" : "Assistir agora"),
    ctaTarget:
      picked.external_url?.trim() || picked.media_url?.trim() || null,
    segments: picked.segments ?? [],
    completedAt: compRows[0]?.completed_at ?? null,
  };
}

export interface CompleteResult {
  alreadyCompleted: boolean;
  xpAwarded: number;
  newTotalXP?: number;
  newLevel?: number;
  leveledUp?: boolean;
  currentStreak?: number;
}

export async function completeTodayItem(
  userId: number,
  itemId: number,
): Promise<
  CompleteResult | { error: "ITEM_NOT_FOUND" } | { error: "INVALID_TODAY_ITEM" }
> {
  // Bind completion to today's deterministic item: the client cannot
  // claim XP by passing the id of any other published content row, even
  // one whose kind is in TODAY_KINDS. This also implicitly enforces the
  // kind allow-list (pickTodayItem only ever returns audio/video/reels).
  const picked = await pickTodayItem(userId);
  if (!picked) {
    return { error: "ITEM_NOT_FOUND" };
  }
  if (picked.id !== itemId) {
    return { error: "INVALID_TODAY_ITEM" };
  }

  // ON CONFLICT makes this endpoint safe to call repeatedly — the second
  // call returns alreadyCompleted=true with no extra XP. The unique index
  // on (user_id, completed_date) is what guarantees once-per-day semantics.
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO home_today_completions (user_id, content_item_id, completed_date)
     VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (user_id, completed_date) DO NOTHING
     RETURNING id`,
    [userId, picked.id],
  );

  if (inserted.length === 0) {
    return { alreadyCompleted: true, xpAwarded: 0 };
  }

  const xp = await addXP(userId, TODAY_XP, "today_complete");
  const streak = await updateStreak(userId);

  return {
    alreadyCompleted: false,
    xpAwarded: TODAY_XP,
    newTotalXP: xp.newTotalXP,
    newLevel: xp.newLevel,
    leveledUp: xp.leveledUp,
    currentStreak: streak.currentStreak,
  };
}
