import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { validateProfileUpdate } from "../auth/validation.js";
import { updateUserProfile } from "../auth/service.js";
import { success, error } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { query } from "../../db/index.js";

const router = Router();

// Task #44 — Perfil público mínimo de outro usuário (consumido pelo
// deep-link de busca). Devolve só campos seguros: id, name, segments
// (lista pública de contextos), level, xp, streak, total de badges
// conquistadas e data de entrada. Email, role e qualquer PII ficam
// fora. Requer auth pra evitar scraping anônimo.
router.get(
  "/:id/public",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id <= 0) {
        error(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
        return;
      }
      const userRes = await query<{
        id: number;
        name: string;
        segments: string[] | null;
        level: number;
        xp: number;
        streak: number;
        created_at: string;
      }>(
        `SELECT id, name, segments, level, xp, streak, created_at
           FROM users WHERE id = $1`,
        [id],
      );
      if (userRes.rows.length === 0) {
        error(res, "Usuário não encontrado", "USER_NOT_FOUND", 404);
        return;
      }
      const u = userRes.rows[0];
      const badgeCountRes = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM user_badges WHERE user_id = $1`,
        [id],
      );
      const badgeCount = Number.parseInt(
        badgeCountRes.rows[0]?.count ?? "0",
        10,
      );
      success(res, {
        user: {
          id: u.id,
          name: u.name,
          segments: u.segments ?? [],
          level: u.level,
          xp: u.xp,
          streak: u.streak,
          totalBadges: badgeCount,
          joinedAt: u.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch("/profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (!validation.valid) {
      error(res, validation.message, "VALIDATION_ERROR", 400);
      return;
    }

    const updatedUser = await updateUserProfile(req.user!.id, validation.data);
    success(res, { user: updatedUser });
  } catch (err) {
    next(err);
  }
});

export default router;
