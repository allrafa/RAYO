import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireRole, optionalAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listAdminContent,
  listPublicContent,
  getAdminContentDetail,
  getPublicContentDetail,
  createContent,
  updateContent,
  setContentStatus,
  deleteContent,
  listEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  listMediaAssets,
  recordMediaAsset,
  listCoursesForCms,
  CmsError,
  VALID_KINDS,
} from "./service.js";
import { uploadMiddleware, publicUrlFor, inferAssetKindFromMime } from "./upload.js";

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof CmsError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }
  next(err);
}

function parseId(value: string, label = "ID inválido"): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Admin router (mounted at /api/admin/cms) ──────────────────────────
export const adminCmsRouter = Router();
adminCmsRouter.use(requireRole("producer"));

adminCmsRouter.get("/kinds", (_req, res) => {
  success(res, { kinds: VALID_KINDS });
});

adminCmsRouter.get("/courses", async (_req, res, next) => {
  try {
    const courses = await listCoursesForCms();
    success(res, { courses });
  } catch (err) { next(err); }
});

adminCmsRouter.get("/", async (req, res, next) => {
  try {
    const { kind, status, search, page, limit } = req.query;
    const result = await listAdminContent({
      kind: kind as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await getAdminContentDetail(id);
    if (!item) { sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404); return; }
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/", async (req: Request, res, next) => {
  try {
    const item = await createContent(req.user!, req.body);
    success(res, { item }, 201);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await updateContent(req.user!, id, req.body);
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/:id/publish", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await setContentStatus(req.user!, id, "published");
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/:id/unpublish", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await setContentStatus(req.user!, id, "draft");
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await deleteContent(req.user!, id);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// Episodes (series)
adminCmsRouter.get("/:id/episodes", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const episodes = await listEpisodes(id);
    success(res, { episodes });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/:id/episodes", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const ep = await createEpisode(req.user!, id, req.body);
    success(res, { episode: ep }, 201);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/:id/episodes/:epId", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const epId = parseId(req.params.epId);
    if (!id || !epId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const ep = await updateEpisode(req.user!, id, epId, req.body);
    success(res, { episode: ep });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.delete("/:id/episodes/:epId", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const epId = parseId(req.params.epId);
    if (!id || !epId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await deleteEpisode(req.user!, id, epId);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// Media uploads
adminCmsRouter.get("/media/list", async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const items = await listMediaAssets(req.user!.id, page, limit);
    success(res, { items });
  } catch (err) { next(err); }
});

adminCmsRouter.post("/media/upload", (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      sendError(res, err.message || "Falha no upload", "UPLOAD_FAILED", 400);
      return;
    }
    if (!req.file) {
      sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
      return;
    }
    try {
      const url = publicUrlFor(req.file.path);
      const asset = await recordMediaAsset({
        uploadedBy: req.user!.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        publicUrl: url,
        kind: inferAssetKindFromMime(req.file.mimetype),
      });
      success(res, { asset }, 201);
    } catch (e) { next(e); }
  });
});

// ── Public router (mounted at /api/content) ───────────────────────────
export const publicCmsRouter = Router();
publicCmsRouter.use(optionalAuth);

publicCmsRouter.get("/", async (req, res, next) => {
  try {
    const { kind, segment, search, page, limit } = req.query;
    const result = await listPublicContent({
      kind: kind as string | undefined,
      segment: segment as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

publicCmsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await getPublicContentDetail(id);
    if (!item) { sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404); return; }
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});
