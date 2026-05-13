import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireRole } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import { putPublicObject } from "../../lib/objectStorageBridge.js";
import { optimizeCmsImage } from "../../lib/imageOptimization.js";
import {
  listAdminForums,
  adminCreateForum,
  updateForum,
  setForumActive,
  getForumModerators,
  addForumModerator,
  removeForumModerator,
} from "./service.js";
import { AppError } from "../academia/service.js";

// Task #198 — CRUD admin de comunidades + gestão de moderadores per-community.
// Mountado em /api/admin/community (após optionalAuth + rateLimiter no
// server/index.ts). Toda rota exige requireRole("admin") — adicionar
// moderator local NÃO promove o usuário globalmente.
const router = Router();

router.use(requireRole("admin"));

// ───── Cover upload — sentinel objstore://forums/<file> ─────
const COVER_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COVER_MAX = 5 * 1024 * 1024;
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COVER_MAX },
  fileFilter: (_req, file, cb) => {
    if (COVER_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas JPG, PNG ou WebP são aceitos"));
  },
}).single("file");

function imageExt(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    default: return "";
  }
}

router.post(
  "/forums/cover",
  rateLimiter(30, 60 * 60 * 1000, { keyByUser: true }),
  (req, res, next) => coverUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(res, "Capa deve ter até 5 MB", "FILE_TOO_LARGE", 413);
      return;
    }
    sendError(res, err instanceof Error ? err.message : "Upload inválido", "INVALID_UPLOAD", 400);
  }),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
        return;
      }
      let buffer = file.buffer;
      let mime = file.mimetype;
      try {
        const optimized = await optimizeCmsImage(buffer, mime);
        buffer = optimized.buffer;
        mime = optimized.mimetype;
      } catch { /* sharp falhou — segue com original */ }
      const ext = imageExt(mime) || path.extname(file.originalname) || ".jpg";
      const safeName = `${Date.now()}-${Math.random().toString(16).slice(2, 10).padEnd(8, "0")}${ext}`;
      const key = `forums/${safeName}`;
      await putPublicObject(key, buffer, mime);
      success(res, { cover_url: `objstore://${key}`, mime, size: buffer.length }, 201);
    } catch (err) {
      next(err);
    }
  },
);

// ───── Forums CRUD ─────

router.get("/forums", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : null;
    const page = parseInt(String(req.query.page ?? "1"), 10);
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    const result = await listAdminForums({
      search,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 30,
    });
    success(res, result); // { forums, total, page, limit }
  } catch (err) { next(err); }
});

router.post("/forums", async (req, res, next) => {
  try {
    const forum = await adminCreateForum(req.user!.id, req.body || {});
    success(res, { forum }, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.patch("/forums/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    const result = await updateForum(id, req.body || {});
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/forums/:id/active", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    const active = req.body?.active !== false;
    const result = await setForumActive(id, active);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// ───── Moderadores per-community ─────

router.get("/forums/:id/moderators", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    const moderators = await getForumModerators(id);
    success(res, { moderators });
  } catch (err) { next(err); }
});

router.post("/forums/:id/moderators", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = parseInt(String(req.body?.user_id ?? ""), 10);
    if (!Number.isFinite(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    if (!Number.isFinite(userId) || userId < 1) {
      sendError(res, "user_id obrigatório", "INVALID_USER_ID", 400);
      return;
    }
    const result = await addForumModerator(id, userId, req.user!.id);
    success(res, result, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.delete("/forums/:id/moderators/:userId", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(id) || id < 1 || !Number.isFinite(userId) || userId < 1) {
      sendError(res, "Parâmetros inválidos", "INVALID_PARAMS", 400);
      return;
    }
    const result = await removeForumModerator(id, userId, req.user!.id);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

export default router;
