import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireRole } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  getOverviewStats,
  listUsers,
  updateUserRole,
  listModerationPosts,
  listModerationComments,
  setPostHidden,
  setCommentHidden,
  AdminError,
} from "./service.js";
import type { UserRole } from "../auth/service.js";

const router = Router();

// All routes require at least moderator. Role-checks tighten on individual routes.
router.use(requireRole("moderator"));

function parsePagination(req: Request): { page: number; limit: number } {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const rawLimit = parseInt((req.query.limit as string) || "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit };
}

function parseStatus(value: unknown): "all" | "visible" | "hidden" | null {
  if (value === undefined || value === null || value === "") return "all";
  if (value === "all" || value === "visible" || value === "hidden") return value;
  return null;
}

router.get("/overview", async (_req, res, next) => {
  try {
    const stats = await getOverviewStats();
    success(res, stats);
  } catch (err) {
    next(err);
  }
});

// User management is admin-only (least privilege). Moderators can hide content
// but not browse the full member directory or change roles.
router.get("/users", requireRole("admin"), async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req);
    const search = (req.query.search as string) || undefined;
    const role = (req.query.role as UserRole | "all" | undefined) || "all";
    const segment = (req.query.segment as string | undefined) || "all";
    const premium = (req.query.premium as "all" | "yes" | "no" | undefined) || "all";

    if (premium !== "all" && premium !== "yes" && premium !== "no") {
      sendError(res, "Filtro premium inválido", "INVALID_PREMIUM_FILTER", 400);
      return;
    }

    const result = await listUsers({ page, limit, search, role, segment, premium });
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/users/:id/role",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId) || targetId < 1) {
        sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
        return;
      }
      const { role } = req.body as { role?: UserRole };
      if (!role) {
        sendError(res, "Papel é obrigatório", "ROLE_REQUIRED", 400);
        return;
      }
      const updated = await updateUserRole(targetId, role, req.user!.id);
      success(res, { user: updated });
    } catch (err) {
      if (err instanceof AdminError) {
        sendError(res, err.message, err.code, err.statusCode);
        return;
      }
      next(err);
    }
  },
);

router.get("/moderation/posts", async (req, res, next) => {
  try {
    const status = parseStatus(req.query.status);
    if (status === null) {
      sendError(res, "Status inválido", "INVALID_STATUS", 400);
      return;
    }
    const { page, limit } = parsePagination(req);
    const result = await listModerationPosts(status, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/moderation/posts/:id/hide", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    await setPostHidden(id, true, req.user!.id);
    success(res, { hidden: true });
  } catch (err) {
    if (err instanceof AdminError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/moderation/posts/:id/restore", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    await setPostHidden(id, false, req.user!.id);
    success(res, { hidden: false });
  } catch (err) {
    if (err instanceof AdminError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.get("/moderation/comments", async (req, res, next) => {
  try {
    const status = parseStatus(req.query.status);
    if (status === null) {
      sendError(res, "Status inválido", "INVALID_STATUS", 400);
      return;
    }
    const { page, limit } = parsePagination(req);
    const result = await listModerationComments(status, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/moderation/comments/:id/hide", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      sendError(res, "ID de comentário inválido", "INVALID_COMMENT_ID", 400);
      return;
    }
    await setCommentHidden(id, true, req.user!.id);
    success(res, { hidden: true });
  } catch (err) {
    if (err instanceof AdminError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/moderation/comments/:id/restore", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      sendError(res, "ID de comentário inválido", "INVALID_COMMENT_ID", 400);
      return;
    }
    await setCommentHidden(id, false, req.user!.id);
    success(res, { hidden: false });
  } catch (err) {
    if (err instanceof AdminError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

export default router;
