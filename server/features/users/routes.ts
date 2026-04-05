import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { validateProfileUpdate } from "../auth/validation.js";
import { updateUserProfile } from "../auth/service.js";
import { success, error } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

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
