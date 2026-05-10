import { query, getClient } from "../../db/index.js";
import { addXP, unlockBadge, checkMissionProgress } from "../gamification/service.js";
import { trackEvent } from "../analytics/service.js";
import { createNotification } from "../notifications/service.js";
import { sendClassInterestDigestEmail } from "../../lib/email.js";
import { logger } from "../../utils/logger.js";

const APP_URL =
  process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
const CLASS_INTEREST_EMAIL_COOLDOWN_HOURS = 24;

export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function listCourses(filters?: {
  life_context?: string;
  category?: string;
  search?: string;
}) {
  // Task #151 — LEFT JOIN trail_courses+trails pra expor trail_id/trail_slug
  // por curso. O frontend (Catálogo) usa esses campos pra mostrar o badge
  // "Parte da trilha X" e redirecionar pro /trilhas/:slug em vez do fluxo
  // antigo de "Garantir minha vaga"/waitlist em cursos que viraram bundle.
  // DISTINCT ON (c.id) na inner garante 1 linha por curso mesmo quando o
  // curso pertence a várias trilhas (trail_courses é M:N) — pegamos a
  // trilha ativa de menor id como "primária" pro catálogo (determinístico).
  // Outer query reaplica o ORDER BY students DESC pra ranking original.
  const where: string[] = ["c.is_active = true"];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.life_context) {
    where.push(`c.life_context = $${idx++}`);
    params.push(filters.life_context);
  }
  if (filters?.category) {
    where.push(`c.category = $${idx++}`);
    params.push(filters.category);
  }
  if (filters?.search) {
    where.push(`(c.title ILIKE $${idx} OR c.description ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  const sql = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        c.id, c.title, c.description, c.thumbnail, c.duration, c.total_lessons,
        c.rating, c.students, c.price, c.category, c.life_context, c.level,
        c.is_premium, c.instructor,
        t.id AS trail_id, t.slug AS trail_slug, t.title AS trail_title
      FROM courses c
      LEFT JOIN trail_courses tc ON tc.course_id = c.id
      LEFT JOIN trails t ON t.id = tc.trail_id AND t.active = TRUE
      WHERE ${where.join(" AND ")}
      ORDER BY c.id, (t.id IS NULL), t.id
    ) sub
    ORDER BY sub.students DESC, sub.id ASC`;
  const { rows } = await query(sql, params);
  return rows;
}

interface DBModule {
  id: number;
  title: string;
  description: string;
  sort_order: number;
}

interface DBLesson {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  duration: string;
  duration_seconds: number;
  video_url: string | null;
  content_type: string;
  sort_order: number;
  is_free_preview: boolean;
}

export async function getCourseDetail(courseId: number) {
  const { rows: courseRows } = await query(
    `SELECT * FROM courses WHERE id = $1 AND is_active = true`,
    [courseId]
  );
  if (courseRows.length === 0) return null;

  const { rows: moduleRows } = await query(
    `SELECT id, title, description, sort_order
     FROM course_modules WHERE course_id = $1 ORDER BY sort_order`,
    [courseId]
  );
  const modules = moduleRows as DBModule[];

  const moduleIds = modules.map((m) => m.id);
  let lessons: DBLesson[] = [];
  if (moduleIds.length > 0) {
    const { rows: lessonRows } = await query(
      `SELECT id, module_id, title, description, duration, duration_seconds,
        video_url, content_type, sort_order, is_free_preview
       FROM course_lessons WHERE module_id = ANY($1) ORDER BY sort_order`,
      [moduleIds]
    );
    lessons = lessonRows as DBLesson[];
  }

  const modulesWithLessons = modules.map((mod) => ({
    ...mod,
    lessons: lessons.filter((l) => l.module_id === mod.id),
  }));

  return {
    ...courseRows[0],
    modules: modulesWithLessons,
  };
}

export async function enrollInCourse(userId: number, courseId: number) {
  const { rows: courseRows } = await query(
    `SELECT id, total_lessons, title FROM courses WHERE id = $1 AND is_active = true`,
    [courseId]
  );
  if (courseRows.length === 0) throw new AppError("Curso não encontrado", "COURSE_NOT_FOUND", 404);

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { rows: inserted } = await client.query(
      `INSERT INTO user_course_progress (user_id, course_id, total_lessons)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_id) DO NOTHING
       RETURNING id`,
      [userId, courseId, courseRows[0].total_lessons]
    );

    if (inserted.length === 0) {
      await client.query("COMMIT");
      return { alreadyEnrolled: true, courseTitle: courseRows[0].title };
    }

    await client.query(
      `UPDATE courses SET students = students + 1 WHERE id = $1`,
      [courseId]
    );

    await client.query("COMMIT");

    trackEvent(userId, "course_enrolled", { course_id: courseId, course_title: courseRows[0].title });

    return { alreadyEnrolled: false, courseTitle: courseRows[0].title };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateLessonProgress(
  userId: number,
  lessonId: number,
  status: string,
  progressSeconds?: number
) {
  const { rows: lessonRows } = await query(
    `SELECT cl.id, cl.module_id, cl.duration_seconds, cm.course_id
     FROM course_lessons cl
     JOIN course_modules cm ON cm.id = cl.module_id
     WHERE cl.id = $1`,
    [lessonId]
  );
  if (lessonRows.length === 0) throw new AppError("Aula não encontrada", "LESSON_NOT_FOUND", 404);

  const courseId = lessonRows[0].course_id;

  const { rows: enrollCheck } = await query(
    `SELECT id FROM user_course_progress WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId]
  );
  if (enrollCheck.length === 0) throw new AppError("Não matriculado neste curso", "NOT_ENROLLED", 403);

  const isCompleting = status === "completed";

  const { rows: prevStatus } = await query(
    `SELECT status FROM user_lesson_progress WHERE user_id = $1 AND lesson_id = $2`,
    [userId, lessonId]
  );
  const wasAlreadyCompleted = prevStatus.length > 0 && prevStatus[0].status === 'completed';
  const isFirstCompletion = isCompleting && !wasAlreadyCompleted;

  await query(
    `INSERT INTO user_lesson_progress (user_id, lesson_id, status, progress_seconds, completed_at)
     VALUES ($1, $2, $3, $4, ${isCompleting ? "NOW()" : "NULL"})
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       status = $3,
       progress_seconds = COALESCE($4, user_lesson_progress.progress_seconds),
       completed_at = CASE WHEN $3 = 'completed' AND user_lesson_progress.completed_at IS NULL THEN NOW() ELSE user_lesson_progress.completed_at END`,
    [userId, lessonId, status, progressSeconds ?? 0]
  );

  const { rows: completedRows } = await query(
    `SELECT COUNT(*) as count FROM user_lesson_progress ulp
     JOIN course_lessons cl ON cl.id = ulp.lesson_id
     JOIN course_modules cm ON cm.id = cl.module_id
     WHERE ulp.user_id = $1 AND cm.course_id = $2 AND ulp.status = 'completed'`,
    [userId, courseId]
  );
  const completedLessons = parseInt(completedRows[0].count);

  const { rows: totalRows } = await query(
    `SELECT total_lessons FROM courses WHERE id = $1`,
    [courseId]
  );
  const totalLessons = totalRows[0].total_lessons;

  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const { rows: prevCourseProgress } = await query(
    `SELECT completed_at FROM user_course_progress WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId]
  );
  const wasCoursePreviouslyCompleted = prevCourseProgress.length > 0 && prevCourseProgress[0].completed_at !== null;
  const courseCompleted = progressPercentage >= 100;
  const isFirstCourseCompletion = courseCompleted && !wasCoursePreviouslyCompleted;

  await query(
    `UPDATE user_course_progress SET
       completed_lessons = $1,
       progress_percentage = $2,
       last_lesson_id = $3,
       completed_at = CASE WHEN $4 = true AND completed_at IS NULL THEN NOW() ELSE completed_at END
     WHERE user_id = $5 AND course_id = $6`,
    [completedLessons, progressPercentage, lessonId, courseCompleted, userId, courseId]
  );

  if (isFirstCompletion) {
    trackEvent(userId, "lesson_completed", { lesson_id: lessonId, course_id: courseId });
    try {
      await addXP(userId, 10, "watch_lesson");
      await checkMissionProgress(userId, "watch_lesson");
    } catch (err) {
      console.error("[Academia] Gamification error (non-blocking):", err);
    }
  }

  if (isFirstCourseCompletion) {
    trackEvent(userId, "course_completed", { course_id: courseId });
    try {
      await addXP(userId, 50, "complete_course");
      const { rows: completedCourseCount } = await query(
        `SELECT COUNT(*) as count FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL`,
        [userId]
      );
      const totalCompleted = parseInt(completedCourseCount[0].count);
      if (totalCompleted === 1) await unlockBadge(userId, "first_course");
      if (totalCompleted === 5) await unlockBadge(userId, "courses_5");
      if (totalCompleted === 10) await unlockBadge(userId, "courses_10");
    } catch (err) {
      console.error("[Academia] Badge/XP error (non-blocking):", err);
    }
  }

  return {
    completedLessons,
    totalLessons,
    progressPercentage,
    courseCompleted,
  };
}

export async function getUserProgress(userId: number) {
  const { rows } = await query(
    `SELECT ucp.course_id, ucp.enrolled_at, ucp.completed_at,
       ucp.progress_percentage, ucp.completed_lessons, ucp.total_lessons,
       ucp.last_lesson_id,
       c.title, c.description, c.thumbnail, c.duration, c.category,
       c.level, c.is_premium, c.instructor, c.rating
     FROM user_course_progress ucp
     JOIN courses c ON c.id = ucp.course_id
     WHERE ucp.user_id = $1
     ORDER BY ucp.enrolled_at DESC`,
    [userId]
  );
  return rows;
}

// Task #99 — Landing pública da turma. Retorna campos do "marketing" da
// turma + members count + (quando autenticado) flag is_member. Sem auth.
export async function getCourseLanding(courseId: number, viewerId?: number) {
  const { rows } = await query(
    `SELECT id, title, subtitle, description, thumbnail, hero_cover_url,
       duration, total_lessons, rating, students, price, category, life_context,
       level, is_premium, instructor, who_for, what_you_get, how_it_works,
       (SELECT COUNT(*)::int FROM user_course_progress ucp WHERE ucp.course_id = courses.id) AS members_count,
       (SELECT COUNT(*)::int FROM course_reviews cr WHERE cr.course_id = courses.id) AS reviews_count
     FROM courses WHERE id = $1 AND is_active = true`,
    [courseId],
  );
  if (rows.length === 0) return null;
  const course = rows[0];
  let isMember = false;
  let viewerCompletedLessons = 0;
  let viewerReview: { rating: number; comment: string | null; updated_at: string } | null = null;
  if (viewerId) {
    const { rows: m } = await query<{ completed_lessons: number }>(
      `SELECT completed_lessons FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
      [viewerId, courseId],
    );
    if (m.length > 0) {
      isMember = true;
      viewerCompletedLessons = Number(m[0].completed_lessons) || 0;
    }
    // Task #152 — viewer's existing review (se houver) pra UI mostrar
    // "Atualizar avaliação" em vez de "Avaliar este curso".
    // Task #155 — viewer sempre enxerga a própria avaliação (mesmo oculta)
    // pra poder editar ou remover. `is_hidden` é exposto pra UI sinalizar.
    const { rows: rv } = await query<{ rating: number; comment: string | null; updated_at: string; is_hidden: boolean }>(
      `SELECT rating, comment, updated_at, is_hidden FROM course_reviews
        WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
      [viewerId, courseId],
    );
    if (rv.length > 0) {
      viewerReview = { rating: rv[0].rating, comment: rv[0].comment, updated_at: rv[0].updated_at, is_hidden: rv[0].is_hidden };
    }
  }
  // Task #130 — expõe trilha vinculada (se houver) e flag de assinatura ativa
  // do viewer pra que o frontend (TurmaShell) renderize <TrailPaywall> em vez
  // do fluxo de "interesse" quando a turma é parte de trilha paga.
  const { rows: tr } = await query<{ trail_id: number; trail_slug: string }>(
    `SELECT t.id AS trail_id, t.slug AS trail_slug
       FROM trail_courses tc
       JOIN trails t ON t.id = tc.trail_id
      WHERE tc.course_id = $1 AND t.active = TRUE
      LIMIT 1`,
    [courseId],
  );
  const trailId = tr[0]?.trail_id ?? null;
  const trailSlug = tr[0]?.trail_slug ?? null;
  let hasTrailAccess = false;
  if (trailId && viewerId) {
    const { rows: sub } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM subscriptions
          WHERE user_id = $1 AND trail_id = $2
            AND status = ANY(ARRAY['active','trialing','past_due']::text[])
       ) AS exists`,
      [viewerId, trailId],
    );
    hasTrailAccess = !!sub[0]?.exists;
  }
  return {
    ...course,
    is_member: isMember,
    trail_id: trailId,
    trail_slug: trailSlug,
    has_trail_access: hasTrailAccess,
    // Task #152 — habilita CTA "Avaliar este curso" no frontend.
    // Critério: matrícula + ≥1 lição concluída. Frontend usa `viewer_review`
    // pra alternar entre "Avaliar" / "Atualizar avaliação".
    viewer_completed_lessons: viewerCompletedLessons,
    viewer_review: viewerReview,
    can_review: isMember && viewerCompletedLessons >= 1,
  };
}

// Task #152 — Submete (cria ou atualiza) a avaliação do aluno e recalcula
// `courses.rating` como AVG. Idempotente por (user_id, course_id) via UNIQUE.
// Critério de elegibilidade: matriculado + ≥1 lição concluída.
export async function submitCourseReview(
  userId: number,
  courseId: number,
  rating: number,
  comment?: string | null,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("Nota inválida (use 1 a 5)", "INVALID_RATING", 400);
  }
  const trimmedComment = comment ? String(comment).trim() : null;
  if (trimmedComment && trimmedComment.length > 1000) {
    throw new AppError("Comentário muito longo (até 1000 caracteres)", "COMMENT_TOO_LONG", 400);
  }

  const { rows: courseRows } = await query(
    `SELECT id FROM courses WHERE id = $1 AND is_active = true`,
    [courseId],
  );
  if (courseRows.length === 0) {
    throw new AppError("Curso não encontrado", "COURSE_NOT_FOUND", 404);
  }

  const { rows: progressRows } = await query<{ completed_lessons: number }>(
    `SELECT completed_lessons FROM user_course_progress WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId],
  );
  if (progressRows.length === 0) {
    throw new AppError("Você precisa estar matriculado para avaliar este curso", "NOT_ENROLLED", 403);
  }
  if ((progressRows[0].completed_lessons ?? 0) < 1) {
    throw new AppError(
      "Conclua ao menos uma aula antes de avaliar o curso",
      "REVIEW_NOT_ELIGIBLE",
      403,
    );
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    // Task #155 — devolve `is_hidden` no payload pra UI preservar o aviso
    // "ocultada pela moderação" mesmo após o aluno editar a própria review.
    const { rows: upserted } = await client.query<{ id: number; created_at: string; updated_at: string; is_hidden: boolean }>(
      `INSERT INTO course_reviews (user_id, course_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, course_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         updated_at = NOW()
       RETURNING id, created_at, updated_at, is_hidden`,
      [userId, courseId, rating, trimmedComment],
    );
    // Task #152 — recalcula `courses.rating` (AVG) e `courses.students`
    // (COUNT distinct de avaliadores) na mesma transação. Avaliações são a
    // fonte de verdade do social proof do catálogo: cursos só mostram
    // estrelas+contagem quando há reviews reais (Task #151 zerou seeds).
    // Task #155 — AVG/contagem ignoram avaliações ocultas pela moderação.
    await client.query(
      `UPDATE courses SET
         rating = COALESCE(
           (SELECT ROUND(AVG(rating)::numeric, 2) FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE),
           0
         ),
         students = (SELECT COUNT(DISTINCT user_id)::int FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE)
       WHERE id = $1`,
      [courseId],
    );
    await client.query("COMMIT");

    trackEvent(userId, "course_reviewed", { course_id: courseId, rating });

    const { rows: aggRows } = await query<{ avg: string | null; total: number }>(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*)::int AS total
         FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE`,
      [courseId],
    );
    return {
      review: {
        id: upserted[0].id,
        rating,
        comment: trimmedComment,
        created_at: upserted[0].created_at,
        updated_at: upserted[0].updated_at,
        is_hidden: upserted[0].is_hidden,
      },
      summary: {
        average: aggRows[0]?.avg ? Number(aggRows[0].avg) : 0,
        total: aggRows[0]?.total ?? 0,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Task #152 — Resumo público das avaliações (média + total + amostra recente).
// Task #155 — exclui avaliações ocultadas pela moderação.
export async function getCourseReviews(courseId: number, limit = 10) {
  const { rows: agg } = await query<{ avg: string | null; total: number }>(
    `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*)::int AS total
       FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE`,
    [courseId],
  );
  const { rows: recent } = await query(
    `SELECT cr.id, cr.rating, cr.comment, cr.created_at, cr.updated_at,
       u.id AS user_id, u.name AS user_name, u.avatar_url AS user_avatar
       FROM course_reviews cr
       JOIN users u ON u.id = cr.user_id
      WHERE cr.course_id = $1 AND cr.is_hidden = FALSE
      ORDER BY cr.updated_at DESC
      LIMIT $2`,
    [courseId, Math.max(1, Math.min(limit, 50))],
  );
  return {
    average: agg[0]?.avg ? Number(agg[0].avg) : 0,
    total: agg[0]?.total ?? 0,
    reviews: recent,
  };
}

// Task #155 — Aluno remove sua própria avaliação. Recalcula AVG/students.
// Idempotente: deletar duas vezes não falha (404 só se nunca existiu).
export async function deleteCourseReview(userId: number, courseId: number) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `DELETE FROM course_reviews WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId],
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      throw new AppError("Avaliação não encontrada", "REVIEW_NOT_FOUND", 404);
    }
    await client.query(
      `UPDATE courses SET
         rating = COALESCE(
           (SELECT ROUND(AVG(rating)::numeric, 2) FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE),
           0
         ),
         students = (SELECT COUNT(DISTINCT user_id)::int FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE)
       WHERE id = $1`,
      [courseId],
    );
    await client.query("COMMIT");
    trackEvent(userId, "course_review_deleted", { course_id: courseId });
    const { rows: aggRows } = await query<{ avg: string | null; total: number }>(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*)::int AS total
         FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE`,
      [courseId],
    );
    return {
      summary: {
        average: aggRows[0]?.avg ? Number(aggRows[0].avg) : 0,
        total: aggRows[0]?.total ?? 0,
      },
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// Task #155 — moderator+ oculta/reexibe uma avaliação abusiva sem apagar.
// Recalcula AVG/students do curso afetado.
export async function setCourseReviewHidden(
  reviewId: number,
  hidden: boolean,
  moderatorId: number,
) {
  const { rows: existing } = await query<{ id: number; course_id: number; is_hidden: boolean }>(
    `SELECT id, course_id, is_hidden FROM course_reviews WHERE id = $1`,
    [reviewId],
  );
  if (existing.length === 0) {
    throw new AppError("Avaliação não encontrada", "REVIEW_NOT_FOUND", 404);
  }
  const courseId = existing[0].course_id;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE course_reviews SET
         is_hidden = $2,
         hidden_at = CASE WHEN $2 = TRUE THEN NOW() ELSE NULL END,
         hidden_by = CASE WHEN $2 = TRUE THEN $3::int ELSE NULL END
       WHERE id = $1`,
      [reviewId, hidden, moderatorId],
    );
    await client.query(
      `UPDATE courses SET
         rating = COALESCE(
           (SELECT ROUND(AVG(rating)::numeric, 2) FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE),
           0
         ),
         students = (SELECT COUNT(DISTINCT user_id)::int FROM course_reviews WHERE course_id = $1 AND is_hidden = FALSE)
       WHERE id = $1`,
      [courseId],
    );
    await client.query("COMMIT");
    trackEvent(moderatorId, hidden ? "course_review_hidden" : "course_review_unhidden", {
      review_id: reviewId,
      course_id: courseId,
    });
    return { id: reviewId, course_id: courseId, is_hidden: hidden };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// Task #99 — Cria registro de "interesse" (modal Em breve). Rate-limit
// custo no service: dedupe por (user_id|email, course_id) nas últimas 24h.
export async function recordClassInterest(
  courseId: number,
  data: { name: string; email: string; message?: string; userId?: number },
) {
  const name = (data.name || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const message = (data.message || "").trim() || null;
  if (name.length < 2 || name.length > 120) {
    throw new AppError("Nome inválido (2-120 caracteres)", "INVALID_NAME", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new AppError("Email inválido", "INVALID_EMAIL", 400);
  }
  if (message && message.length > 1000) {
    throw new AppError("Mensagem muito longa (até 1000 caracteres)", "MESSAGE_TOO_LONG", 400);
  }

  const { rows: courseRows } = await query(
    `SELECT id, title FROM courses WHERE id = $1 AND is_active = true`,
    [courseId],
  );
  if (courseRows.length === 0) {
    throw new AppError("Turma não encontrada", "COURSE_NOT_FOUND", 404);
  }

  // Dedupe 24h por (user OR email) + course
  const { rows: dup } = await query(
    `SELECT id FROM class_interests
     WHERE course_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'
       AND (
         ($2::int IS NOT NULL AND user_id = $2::int)
         OR LOWER(email) = $3
       )
     LIMIT 1`,
    [courseId, data.userId ?? null, email],
  );
  if (dup.length > 0) {
    return { duplicated: true, courseTitle: courseRows[0].title };
  }

  await query(
    `INSERT INTO class_interests (user_id, course_id, name, email, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.userId ?? null, courseId, name, email, message],
  );

  if (data.userId) {
    trackEvent(data.userId, "class_interest", { course_id: courseId });
  }

  // Task #102 — fan-out de notificação + e-mail-resumo (throttled) para o
  // instrutor (líder) da turma. Best-effort: falhas no sino/Resend NÃO
  // devem reverter a captura de interesse (o lead já foi gravado).
  void notifyInstructorOfNewInterest(courseId, courseRows[0].title, { name, email, message }).catch(
    (err) => logger.error("Academia", `notifyInstructorOfNewInterest failed: ${err instanceof Error ? err.message : err}`),
  );

  return { duplicated: false, courseTitle: courseRows[0].title };
}

async function notifyInstructorOfNewInterest(
  courseId: number,
  courseTitle: string,
  latest: { name: string; email: string; message?: string | null },
): Promise<void> {
  // Resolver instrutor: courses.created_by (preferencial) → fallback para
  // content_items.created_by quando a turma é antiga (pré-Task #102 sem
  // backfill por algum motivo).
  const { rows: instrRows } = await query<{ user_id: number; name: string; email: string }>(
    `SELECT u.id AS user_id, u.name, u.email
       FROM courses c
       JOIN users u ON u.id = COALESCE(
         c.created_by,
         (SELECT created_by FROM content_items
           WHERE kind = 'curso' AND course_id = c.id
             AND created_by IS NOT NULL
           ORDER BY id ASC LIMIT 1)
       )
      WHERE c.id = $1`,
    [courseId],
  );
  const instructor = instrRows[0];
  if (!instructor) return;

  // Sino: sempre notifica em cada novo interesse, link para a turma.
  const link = `/turmas/${courseId}`;
  const bodyMsg = latest.message
    ? `${latest.name} (${latest.email}): "${latest.message.slice(0, 120)}${latest.message.length > 120 ? "…" : ""}"`
    : `${latest.name} (${latest.email}) demonstrou interesse em "${courseTitle}".`;
  await createNotification({
    userId: instructor.user_id,
    kind: "class_interest",
    title: `Novo interessado em "${courseTitle}"`,
    body: bodyMsg,
    link,
    payload: { course_id: courseId, course_title: courseTitle, lead_name: latest.name, lead_email: latest.email },
  });

  // E-mail-resumo: throttled por (course_id) para no máximo 1 envio por
  // janela de 24h. INSERT...ON CONFLICT garante atomicidade — o rowCount
  // > 0 indica que somos o "vencedor" do slot e devemos enviar.
  const { rowCount } = await query(
    `INSERT INTO class_interest_email_sent (course_id, last_sent_at)
     VALUES ($1, NOW())
     ON CONFLICT (course_id) DO UPDATE
       SET last_sent_at = NOW()
       WHERE class_interest_email_sent.last_sent_at < NOW() - INTERVAL '${CLASS_INTEREST_EMAIL_COOLDOWN_HOURS} hours'`,
    [courseId],
  );
  if (!rowCount) {
    logger.info(
      "Academia",
      `class_interest email cooldown active for course ${courseId}; skip digest`,
    );
    return;
  }

  // Agrega leads das últimas 24h (incluindo o atual) para o resumo.
  const { rows: recentRows } = await query<{
    name: string;
    email: string;
    message: string | null;
    created_at: string;
  }>(
    `SELECT name, email, message, created_at
       FROM class_interests
      WHERE course_id = $1
        AND created_at > NOW() - INTERVAL '${CLASS_INTEREST_EMAIL_COOLDOWN_HOURS} hours'
      ORDER BY created_at DESC
      LIMIT 10`,
    [courseId],
  );
  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM class_interests
      WHERE course_id = $1
        AND created_at > NOW() - INTERVAL '${CLASS_INTEREST_EMAIL_COOLDOWN_HOURS} hours'`,
    [courseId],
  );
  const total = parseInt(countRows[0]?.total ?? "0", 10);
  const courseLink = `${APP_URL.replace(/\/+$/, "")}${link}`;

  // Slot foi reservado atomicamente acima. Se o envio falhar (Resend
  // não configurado, erro 5xx, etc.), libera o slot imediatamente
  // (set para epoch) para que a próxima chamada dentro da janela
  // possa tentar de novo, em vez de queimar 24h sem entregar nada.
  const sendResult = await sendClassInterestDigestEmail(
    instructor.email,
    instructor.name,
    courseTitle,
    total,
    courseLink,
    recentRows,
  );
  if (!sendResult.sent) {
    await query(
      `UPDATE class_interest_email_sent SET last_sent_at = TIMESTAMP 'epoch' WHERE course_id = $1`,
      [courseId],
    );
    logger.warn(
      "Academia",
      `class_interest digest email failed for course ${courseId}: ${sendResult.error ?? "unknown"} — cooldown released`,
    );
  }
}

// Task #99 — Lista membros da turma (matriculados). requireAuth + matricula
// (ou moderator+) no router. Pageable, leve.
export async function getCourseMembers(courseId: number, page = 1, limit = 30) {
  const offset = (Math.max(1, page) - 1) * limit;
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM user_course_progress WHERE course_id = $1`,
    [courseId],
  );
  const total = countRows[0]?.total ?? 0;
  // Task #99 — payload inclui role (cliente/moderador/admin) e karma
  // (likes recebidos em posts + comments) pra UI da aba Membros.
  const { rows } = await query(
    `SELECT u.id, u.name, u.avatar_url, u.role, ucp.enrolled_at, ucp.progress_percentage,
       ucp.completed_at IS NOT NULL AS completed,
       (
         COALESCE((SELECT SUM(like_count) FROM posts    WHERE user_id = u.id AND is_hidden = FALSE), 0) +
         COALESCE((SELECT SUM(like_count) FROM comments WHERE user_id = u.id AND is_hidden = FALSE), 0)
       )::int AS karma
     FROM user_course_progress ucp
     JOIN users u ON u.id = ucp.user_id
     WHERE ucp.course_id = $1
     ORDER BY ucp.enrolled_at DESC
     LIMIT $2 OFFSET $3`,
    [courseId, limit, offset],
  );
  return { members: rows, total, page, limit, totalPages: Math.ceil(total / Math.max(1, limit)) };
}

// Helper: usado pela rota /members e pelas rotas de comunidade escopadas
// por turma (POST /community/posts com class_id) pra checar matrícula.
export async function isCourseMember(userId: number, courseId: number): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
    [userId, courseId],
  );
  return rows.length > 0;
}

export async function getCourseProgressWithLessons(userId: number, courseId: number) {
  const { rows: progressRows } = await query(
    `SELECT ucp.progress_percentage, ucp.completed_lessons, ucp.total_lessons,
       ucp.last_lesson_id, ucp.enrolled_at, ucp.completed_at
     FROM user_course_progress ucp
     WHERE ucp.user_id = $1 AND ucp.course_id = $2`,
    [userId, courseId]
  );

  if (progressRows.length === 0) return null;

  const { rows: lessonProgress } = await query(
    `SELECT ulp.lesson_id, ulp.status, ulp.progress_seconds, ulp.completed_at
     FROM user_lesson_progress ulp
     JOIN course_lessons cl ON cl.id = ulp.lesson_id
     JOIN course_modules cm ON cm.id = cl.module_id
     WHERE ulp.user_id = $1 AND cm.course_id = $2`,
    [userId, courseId]
  );

  return {
    ...progressRows[0],
    lessonProgress,
  };
}
