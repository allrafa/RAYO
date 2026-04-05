import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success } from "../../utils/response.js";
import { getDashboard } from "./service.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboard(req.user!.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
