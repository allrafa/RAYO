import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import { listNotifications, markRead, markAllRead, getUnreadCount } from "./service.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const result = await listNotifications(req.user!.id, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const unread = await getUnreadCount(req.user!.id);
    success(res, { unread });
  } catch (err) {
    next(err);
  }
});

router.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await markAllRead(req.user!.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_ID", 400);
      return;
    }
    const result = await markRead(id, req.user!.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
