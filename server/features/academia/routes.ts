import { Router } from "express";
import { requireAuth, hasRole } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  AppError,
  listCourses,
  getCourseDetail,
  enrollInCourse,
  updateLessonProgress,
  getUserProgress,
  getCourseProgressWithLessons,
  getCourseLanding,
  recordClassInterest,
  getCourseMembers,
  isCourseMember,
} from "./service.js";

const router = Router();

// Task #99 — Captura de interesse: rate-limit duro per usuário/IP.
const interestLimiter = rateLimiter(5, 60 * 60 * 1000, { keyByUser: true });

router.get("/", async (req, res, next) => {
  try {
    const { life_context, category, search } = req.query;
    const courses = await listCourses({
      life_context: life_context as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
    });
    success(res, { courses });
  } catch (err) {
    next(err);
  }
});

router.get("/my-progress", requireAuth, async (req, res, next) => {
  try {
    const progress = await getUserProgress(req.user!.id);
    success(res, { progress });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de curso inválido", "INVALID_COURSE_ID");
      return;
    }
    const course = await getCourseDetail(courseId);
    if (!course) {
      sendError(res, "Curso não encontrado", "COURSE_NOT_FOUND", 404);
      return;
    }
    success(res, { course });
  } catch (err) {
    next(err);
  }
});

// Task #99 — Landing pública da turma (mini-Skool). Sem requireAuth.
router.get("/:id/landing", async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de turma inválido", "INVALID_COURSE_ID");
      return;
    }
    const turma = await getCourseLanding(courseId, req.user?.id);
    if (!turma) {
      sendError(res, "Turma não encontrada", "COURSE_NOT_FOUND", 404);
      return;
    }
    success(res, { turma });
  } catch (err) {
    next(err);
  }
});

// Task #99 — Captura de interesse (modal "Em breve"). Sem checkout. Aceita
// usuário anônimo (pré-cadastro) OU autenticado (auto-preenche userId).
router.post("/:id/interest", interestLimiter, async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de turma inválido", "INVALID_COURSE_ID");
      return;
    }
    const { name, email, message } = req.body || {};
    const result = await recordClassInterest(courseId, {
      name,
      email,
      message,
      userId: req.user?.id,
    });
    success(res, result, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #99 — Lista membros da turma. requireAuth + (membro OU moderator+).
router.get("/:id/members", requireAuth, async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de turma inválido", "INVALID_COURSE_ID");
      return;
    }
    const member = await isCourseMember(req.user!.id, courseId);
    if (!member && !hasRole(req.user, "moderator")) {
      sendError(res, "Apenas membros da turma podem ver a lista", "NOT_A_MEMBER", 403);
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit || "30"), 10) || 30, 100));
    const result = await getCourseMembers(courseId, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/progress", requireAuth, async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de curso inválido", "INVALID_COURSE_ID");
      return;
    }
    const progress = await getCourseProgressWithLessons(req.user!.id, courseId);
    success(res, { progress });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/enroll", requireAuth, async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      sendError(res, "ID de curso inválido", "INVALID_COURSE_ID");
      return;
    }
    const result = await enrollInCourse(req.user!.id, courseId);
    if (result.alreadyEnrolled) {
      sendError(res, "Você já está matriculado neste curso", "ALREADY_ENROLLED");
      return;
    }
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
});

router.patch("/lessons/:id/progress", requireAuth, async (req, res, next) => {
  try {
    const lessonId = parseInt(req.params.id, 10);
    if (isNaN(lessonId)) {
      sendError(res, "ID de aula inválido", "INVALID_LESSON_ID");
      return;
    }
    const { status, progressSeconds } = req.body;
    if (!status || !["in_progress", "completed"].includes(status)) {
      sendError(res, "Status inválido (use: in_progress, completed)", "INVALID_STATUS");
      return;
    }
    const result = await updateLessonProgress(req.user!.id, lessonId, status, progressSeconds);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
