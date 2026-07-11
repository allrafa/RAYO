import { query } from "../../db/index.js";
import { addXP, updateStreak } from "../gamification/service.js";
import { withResolvedBunnyFields } from "../../lib/bunnyStream.js";

const TODAY_KINDS = ["audio", "video", "reels"];
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
  // Task #86 — Bunny: derivados resolvidos no app via withResolvedBunnyFields.
  video_provider: string | null;
  video_external_id: string | null;
  video_thumbnail_url: string | null;
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
  ctaTarget: string | null;
  segments: string[];
  completedAt: string | null;
}

async function pickTodayItem(userId: number): Promise<ContentItemRow | null> {
  const { rows: userRows } = await query<{ segments: string[] | null }>(
    `SELECT segments FROM users WHERE id = $1`,
    [userId],
  );
  const segments = userRows[0]?.segments ?? [];

  const segmentFiltered = await query<ContentItemRow>(
    `SELECT id, kind, title, short_description, cover_url,
            duration_seconds, segments, hook, cta,
            media_url, external_url,
            video_provider, video_external_id, video_thumbnail_url
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
              media_url, external_url,
              video_provider, video_external_id, video_thumbnail_url
         FROM content_items
        WHERE status = 'published'
          AND kind = ANY($1::text[])
        ORDER BY id`,
      [TODAY_KINDS],
    );
    items = fallback.rows;
  }

  if (items.length === 0) return null;
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

  // Task #86 — quando o vídeo do dia veio do Bunny, ctaTarget aponta pro
  // embed Bunny (frontend abre direto no <iframe>). Senão cai no legado
  // external_url → media_url. Cards de capa também usam a thumb resolvida.
  const resolved = withResolvedBunnyFields(picked);
  const bunnyTarget = resolved.video_embed_url;

  // Task #167 — ctaTarget NUNCA pode ser null. Quando o conteúdo do dia
  // não tem URL externa nem embed Bunny, devolvemos um sentinel
  // `internal://content/<id>` que o frontend reconhece pra abrir o
  // player interno (mesmo fallback que `searchNavigate.ts` já usa pra
  // audio/video/reels sem URL externa). Sem isso o card "Hoje no RAYO"
  // ficava inerte e o usuário clicava sem nada acontecer.
  const externalTarget =
    bunnyTarget || picked.external_url?.trim() || picked.media_url?.trim() || null;
  const isInternal = !externalTarget;
  const ctaTarget = externalTarget || `internal://content/${picked.id}`;
  const ctaLabel = isInternal
    ? "Abrir conteúdo"
    : picked.cta?.trim() ||
      (picked.kind === "audio" ? "Ouvir agora" : "Assistir agora");

  return {
    id: picked.id,
    kind: picked.kind,
    title: picked.title,
    subtitle: picked.short_description,
    coverUrl: resolved.video_thumbnail_url || picked.cover_url,
    durationSeconds: picked.duration_seconds,
    hook: picked.hook,
    ctaLabel,
    ctaTarget,
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
  const picked = await pickTodayItem(userId);
  if (!picked) return { error: "ITEM_NOT_FOUND" };
  if (picked.id !== itemId) return { error: "INVALID_TODAY_ITEM" };

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

// ── Continue (Task #44) ──────────────────────────────────────────────
// Unifica "Continue de onde parou" usando duas fontes do servidor:
//   1. Cursos em progresso (user_course_progress) ordenados pelo MAX
//      do timestamp da última aula tocada/concluída do curso.
//   2. Conteúdos CMS (audio/video/reels) que o usuário marcou no
//      "Hoje no RAYO" nos últimos 30 dias — único proxy real de
//      engajamento por usuário com CMS hoje.
// O frontend mescla isso com o progresso de YouTube guardado em
// localStorage (não temos sincronização server-side ainda).
export interface ContinueItem {
  id: string;
  kind: "curso" | "audio" | "video" | "reels";
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  progress: number;
  lastAccessedAt: string;
  ctaTarget: string | null;
  courseId?: number;
  contentItemId?: number;
}

// Task #44 — Por design, o "Continue de onde parou" tem 2 fontes:
//   1) Backend (este arquivo): cursos em progresso + interações
//      recentes com conteúdo CMS (audio/video/reels/podcast).
//   2) Frontend (UnifiedContinue): progresso de YouTube vive em
//      localStorage no navegador (useVideoProgress) e por isso é
//      mesclado client-side. Sem store server-side de tempo de
//      playback YT, qualquer "merge no servidor" seria menos preciso
//      que o que o cliente já tem. O cliente ordena tudo por
//      lastAccessedAt antes de renderizar.
export async function getContinueItems(userId: number): Promise<ContinueItem[]> {
  const { rows: courseRows } = await query<{
    course_id: number;
    title: string;
    thumbnail: string;
    progress_percentage: string;
    enrolled_at: string;
    last_lesson_at: string | null;
  }>(
    `SELECT ucp.course_id,
            c.title,
            c.thumbnail,
            ucp.progress_percentage,
            ucp.enrolled_at,
            (
              SELECT MAX(COALESCE(ulp.completed_at, ulp.started_at))
                FROM user_lesson_progress ulp
                JOIN course_lessons cl ON cl.id = ulp.lesson_id
                JOIN course_modules cm ON cm.id = cl.module_id
               WHERE ulp.user_id = ucp.user_id
                 AND cm.course_id = ucp.course_id
            ) AS last_lesson_at
       FROM user_course_progress ucp
       JOIN courses c ON c.id = ucp.course_id
      WHERE ucp.user_id = $1
        AND ucp.completed_at IS NULL
        AND ucp.progress_percentage > 0
      ORDER BY COALESCE(
        (SELECT MAX(COALESCE(ulp.completed_at, ulp.started_at))
           FROM user_lesson_progress ulp
           JOIN course_lessons cl ON cl.id = ulp.lesson_id
           JOIN course_modules cm ON cm.id = cl.module_id
          WHERE ulp.user_id = ucp.user_id AND cm.course_id = ucp.course_id),
        ucp.enrolled_at
      ) DESC
      LIMIT 12`,
    [userId],
  );

  const courseItems: ContinueItem[] = courseRows.map((r) => ({
    id: `curso-${r.course_id}`,
    kind: "curso",
    title: r.title,
    subtitle: null,
    thumbnail: r.thumbnail || null,
    progress: Math.round(parseFloat(r.progress_percentage || "0")),
    lastAccessedAt: r.last_lesson_at || r.enrolled_at,
    ctaTarget: null,
    courseId: r.course_id,
  }));

  const { rows: cmsRows } = await query<{
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
    completed_at: string;
  }>(
    `SELECT ci.id, ci.kind, ci.title, ci.short_description,
            ci.cover_url, ci.media_url, ci.external_url,
            ci.video_provider, ci.video_external_id, ci.video_thumbnail_url,
            htc.completed_at
       FROM home_today_completions htc
       JOIN content_items ci ON ci.id = htc.content_item_id
      WHERE htc.user_id = $1
        AND htc.completed_date >= (CURRENT_DATE - INTERVAL '30 days')
        AND ci.status = 'published'
        AND ci.kind = ANY($2::text[])
      ORDER BY htc.completed_at DESC
      LIMIT 12`,
    [userId, TODAY_KINDS],
  );

  const cmsItems: ContinueItem[] = cmsRows.map((r) => {
    const resolved = withResolvedBunnyFields(r);
    return {
      id: `cms-${r.id}`,
      kind: r.kind as ContinueItem["kind"],
      title: r.title,
      subtitle: r.short_description,
      thumbnail: resolved.video_thumbnail_url || r.cover_url,
      progress: 100,
      lastAccessedAt: r.completed_at,
      ctaTarget:
        resolved.video_embed_url ||
        r.external_url?.trim() ||
        r.media_url?.trim() ||
        null,
      contentItemId: r.id,
    };
  });

  return [...courseItems, ...cmsItems].sort(
    (a, b) =>
      new Date(b.lastAccessedAt).getTime() -
      new Date(a.lastAccessedAt).getTime(),
  );
}

// ── XP history (Task #44) ────────────────────────────────────────────
// Agrupa xp_log do usuário em janelas semanais (últimas N semanas) +
// devolve o top 5 motivos de XP da janela toda. Usado pelo modal que
// abre ao tocar no card "XP semanal" da Home.
export interface XPHistoryWeek {
  weekStart: string;
  total: number;
}
export interface XPHistoryResponse {
  weeks: XPHistoryWeek[];
  topReasons: Array<{ reason: string; total: number }>;
}

export async function getXPHistory(
  userId: number,
  weeks = 6,
): Promise<XPHistoryResponse> {
  const { rows: weeklyRows } = await query<{ week_start: string; total: string }>(
    `SELECT date_trunc('week', created_at)::date AS week_start,
            SUM(amount)::text AS total
       FROM xp_log
      WHERE user_id = $1
        AND created_at >= (CURRENT_DATE - ($2::int * INTERVAL '7 days'))
      GROUP BY week_start
      ORDER BY week_start ASC`,
    [userId, weeks],
  );

  const { rows: reasonRows } = await query<{ reason: string; total: string }>(
    `SELECT reason, SUM(amount)::text AS total
       FROM xp_log
      WHERE user_id = $1
        AND created_at >= (CURRENT_DATE - ($2::int * INTERVAL '7 days'))
      GROUP BY reason
      ORDER BY SUM(amount) DESC
      LIMIT 5`,
    [userId, weeks],
  );

  return {
    weeks: weeklyRows.map((r) => ({
      weekStart: r.week_start,
      total: parseInt(r.total, 10) || 0,
    })),
    topReasons: reasonRows.map((r) => ({
      reason: r.reason,
      total: parseInt(r.total, 10) || 0,
    })),
  };
}

// ── Streak calendar (Task #44) ───────────────────────────────────────
// Marca cada dia dos últimos 30 dias como "ativo" se houve ao menos
// um xp_log nesse dia. Mostra também a sequência atual / mais longa
// consultando o registro do usuário.
export interface StreakCalendarResponse {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  days: Array<{ date: string; active: boolean }>;
}

export async function getStreakCalendar(
  userId: number,
  windowDays = 30,
): Promise<StreakCalendarResponse> {
  const { rows: userRows } = await query<{
    streak: number;
    longest_streak: number;
    last_activity_date: string | null;
  }>(
    `SELECT streak, COALESCE(longest_streak, 0) AS longest_streak,
            last_activity_date
       FROM users WHERE id = $1`,
    [userId],
  );
  const u = userRows[0] ?? {
    streak: 0,
    longest_streak: 0,
    last_activity_date: null,
  };

  const { rows: activeRows } = await query<{ day: string }>(
    `SELECT DISTINCT date_trunc('day', created_at)::date::text AS day
       FROM xp_log
      WHERE user_id = $1
        AND created_at >= (CURRENT_DATE - ($2::int * INTERVAL '1 day'))`,
    [userId, windowDays - 1],
  );
  const activeSet = new Set(activeRows.map((r) => r.day));

  const days: Array<{ date: string; active: boolean }> = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, active: activeSet.has(iso) });
  }

  return {
    currentStreak: u.streak ?? 0,
    longestStreak: u.longest_streak ?? 0,
    lastActivityDate: u.last_activity_date,
    days,
  };
}

// ── Palavra do dia (ENGAGEMENT_PLAN.md E1) ─────────────────────────────
// Versículo global determinístico por dia + amém comunitário (1/dia por
// usuário, +5 XP no primeiro). O contador é o social proof espiritual:
// "você e mais N pessoas disseram amém hoje".

const VERSE_AMEN_XP = 5;

export async function getVerseOfDay(userId: number) {
  const { verseForDate } = await import("./verses.js");
  const verse = verseForDate(new Date());
  const { rows } = await query<{ total: string; mine: string }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE user_id = $1)::text AS mine
       FROM verse_amens
      WHERE amen_date = CURRENT_DATE`,
    [userId],
  );
  return {
    ref: verse.ref,
    text: verse.text,
    theme: verse.theme,
    amens: parseInt(rows[0]?.total ?? "0", 10),
    amened: parseInt(rows[0]?.mine ?? "0", 10) > 0,
  };
}

export async function amenVerseOfDay(userId: number) {
  const { verseForDate } = await import("./verses.js");
  const verse = verseForDate(new Date());
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO verse_amens (user_id, amen_date, verse_ref)
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, amen_date) DO NOTHING
     RETURNING id`,
    [userId, verse.ref],
  );
  let xpAwarded = 0;
  let leveledUp = false;
  let newLevel: number | undefined;
  let currentStreak: number | undefined;
  if (inserted.length > 0) {
    const xp = await addXP(userId, VERSE_AMEN_XP, "verse_amen");
    xpAwarded = VERSE_AMEN_XP;
    leveledUp = xp.leveledUp;
    newLevel = xp.newLevel;
    // O amém do dia mantém a chama acesa (ENGAGEMENT_PLAN.md E2/E3):
    // é o toque diário de menor fricção — mesmo sem tempo pro conteúdo,
    // o versículo preserva a sequência. Idempotente por dia.
    const streak = await updateStreak(userId);
    currentStreak = streak.currentStreak;
  }
  const { rows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM verse_amens WHERE amen_date = CURRENT_DATE`,
  );
  return {
    amened: true,
    alreadyAmened: inserted.length === 0,
    amens: parseInt(rows[0]?.total ?? "0", 10),
    xpAwarded,
    leveledUp,
    newLevel,
    currentStreak,
  };
}
