import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listCourses,
  getCourseDetail,
  enrollInCourse,
  updateLessonProgress,
  getUserProgress,
  getCourseProgressWithLessons,
} from "./service.js";

const router = Router();

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
