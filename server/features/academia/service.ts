import { query, getClient } from "../../db/index.js";
import { addXP, unlockBadge, checkMissionProgress } from "../gamification/service.js";
import { trackEvent } from "../analytics/service.js";

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
  let sql = `SELECT id, title, description, thumbnail, duration, total_lessons,
    rating, students, price, category, life_context, level, is_premium, instructor
    FROM courses WHERE is_active = true`;
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.life_context) {
    sql += ` AND life_context = $${idx++}`;
    params.push(filters.life_context);
  }
  if (filters?.category) {
    sql += ` AND category = $${idx++}`;
    params.push(filters.category);
  }
  if (filters?.search) {
    sql += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  sql += ` ORDER BY students DESC`;
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
       (SELECT COUNT(*)::int FROM user_course_progress ucp WHERE ucp.course_id = courses.id) AS members_count
     FROM courses WHERE id = $1 AND is_active = true`,
    [courseId],
  );
  if (rows.length === 0) return null;
  const course = rows[0];
  let isMember = false;
  if (viewerId) {
    const { rows: m } = await query(
      `SELECT 1 FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
      [viewerId, courseId],
    );
    isMember = m.length > 0;
  }
  return { ...course, is_member: isMember };
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

  return { duplicated: false, courseTitle: courseRows[0].title };
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
  const { rows } = await query(
    `SELECT u.id, u.name, u.avatar_url, ucp.enrolled_at, ucp.progress_percentage,
       ucp.completed_at IS NOT NULL AS completed
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
