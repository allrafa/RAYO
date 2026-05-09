import type { Request, Response, NextFunction } from "express";
import {
  getTrailIdForCourse,
  userHasActiveTrailAccess,
} from "../features/billing/service.js";
import { hasRole } from "./auth.js";

// Task #130 — Helper de gating para conteúdo gated por trilha.
// Resolve `course_id → trail_id` via cache curto. Quando a turma não
// pertence a nenhuma trilha ativa (course gratuito), libera. Quando pertence
// e o usuário não é assinante ativo (e não tem moderator+), 402 Payment
// Required com `{ trail_id, course_id }` pra UI conseguir renderizar paywall.
//
// `moderator+` sempre passa: necessário para que líderes/instrutores possam
// abrir as turmas que produzem.
export async function checkCourseAccess(
  req: Request,
  courseId: number,
): Promise<{ allowed: boolean; trailId: number | null }> {
  const trailId = await getTrailIdForCourse(courseId);
  if (trailId === null) return { allowed: true, trailId: null };
  if (hasRole(req.user, "moderator")) return { allowed: true, trailId };
  if (!req.user) return { allowed: false, trailId };
  const has = await userHasActiveTrailAccess(req.user.id, trailId);
  return { allowed: has, trailId };
}

export function requireTrailAccessForCourse(getCourseId: (req: Request) => number | null) {
  return async function gate(req: Request, res: Response, next: NextFunction) {
    const courseId = getCourseId(req);
    if (!courseId || isNaN(courseId)) return next();
    const { allowed, trailId } = await checkCourseAccess(req, courseId);
    if (allowed) return next();
    res.status(402).json({
      success: false,
      data: null,
      error: {
        code: "TRAIL_PAYMENT_REQUIRED",
        message: "Esta turma faz parte de uma trilha paga. Assine para acessar.",
        trail_id: trailId,
        course_id: courseId,
      },
    });
  };
}
