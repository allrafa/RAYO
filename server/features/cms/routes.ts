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
  getLinkedHomeCards,
  deleteContent,
  listEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  listMediaAssets,
  recordMediaAsset,
  listCoursesForCms,
  createCourseFromCms,
  getCourseAdmin,
  updateCourseLanding,
  listClassInterests,
  exportClassInterestsCsv,
  notifyClassInterests,
  resendClassInterestNotification,
  listCourseModulesWithLessons,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
  createCourseLesson,
  updateCourseLesson,
  deleteCourseLesson,
  CmsError,
  VALID_KINDS,
} from "./service.js";
import { uploadMiddleware, publicUrlFor, inferAssetKindFromMime } from "./upload.js";
import { fetchYouTubeMetadata, extractYouTubeVideoId } from "../../lib/youtubeMetadata.js";

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof CmsError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }
  next(err);
}

function parseId(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Admin router (mounted at /api/admin/cms) ──────────────────────────
//
// IMPORTANT — route order matters. Express matches in registration order, and
// `/:id` is a catch-all for any single-segment path. Every fixed-prefix route
// (`/kinds`, `/courses`, `/courses/:id/modules*`, `/media/*`) MUST be declared
// BEFORE the `/:id` family or it gets shadowed (e.g. `GET /media/list` would
// resolve to `GET /:id` with id="media" and return INVALID_ID).
export const adminCmsRouter = Router();
adminCmsRouter.use(requireRole("producer"));

// 1) Fixed paths — declared first to avoid `/:id` shadowing.
adminCmsRouter.get("/kinds", (_req, res) => {
  success(res, { kinds: VALID_KINDS });
});

adminCmsRouter.get("/courses", async (_req, res, next) => {
  try {
    const courses = await listCoursesForCms();
    success(res, { courses });
  } catch (err) { next(err); }
});

adminCmsRouter.post("/courses", async (req: Request, res, next) => {
  try {
    const result = await createCourseFromCms(req.user!, req.body);
    success(res, result, 201);
  } catch (err) { handle(err, res, next); }
});

// Task #100 — Painel Turmas. Carrega/edita os campos de landing rica
// (subtitle, hero_cover_url, who_for, what_you_get, how_it_works) e
// expõe os interessados capturados pelo modal "Em breve".
adminCmsRouter.get("/courses/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const course = await getCourseAdmin(id);
    if (!course) { sendError(res, "Turma não encontrada", "COURSE_NOT_FOUND", 404); return; }
    success(res, { course });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/courses/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const course = await updateCourseLanding(req.user!, id, req.body);
    success(res, { course });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.get("/courses/:id/interests", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
    const limit = parseInt(String(req.query.limit ?? "50"), 10) || 50;
    const data = await listClassInterests(req.user!, id, page, limit);
    success(res, data);
  } catch (err) { handle(err, res, next); }
});

// Task #106 — disparo em lote de "matrícula aberta" pra lista de interessados.
// Idempotente em relação a (course_id, email): linhas com `notified_at`
// preenchido são puladas. Producer só notifica suas turmas; moderator+ qualquer.
adminCmsRouter.post("/courses/:id/notify-interests", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const customMessage = typeof req.body?.message === "string" ? req.body.message : null;
    const result = await notifyClassInterests(req.user!, id, { customMessage });
    if (!result.email_configured) {
      sendError(
        res,
        "Resend não está configurado neste ambiente. Configure RESEND_API_KEY antes de notificar.",
        "EMAIL_NOT_CONFIGURED",
        503,
      );
      return;
    }
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// Task #107 — reenviar aviso para UMA linha específica (ex.: caiu no spam,
// pessoa pediu de novo). Diferente do disparo em lote, ignora o estado de
// `notified_at` e atualiza pro novo timestamp em sucesso.
adminCmsRouter.post("/courses/:courseId/interests/:id/resend", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const interestId = parseId(req.params.id);
    if (!courseId || !interestId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await resendClassInterestNotification(req.user!, courseId, interestId);
    if (!result.email_configured) {
      sendError(
        res,
        "Resend não está configurado neste ambiente. Configure RESEND_API_KEY antes de notificar.",
        "EMAIL_NOT_CONFIGURED",
        503,
      );
      return;
    }
    if (!result.sent) {
      sendError(res, "Falha ao reenviar o e-mail. Tente novamente em instantes.", "SEND_FAILED", 502);
      return;
    }
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.get("/courses/:id/interests.csv", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const { filename, csv } = await exportClassInterestsCsv(req.user!, id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { handle(err, res, next); }
});

// Course module/lesson authoring (replaces seedCourses-only authoring).
adminCmsRouter.get("/courses/:courseId/modules", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    if (!courseId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const modules = await listCourseModulesWithLessons(courseId);
    success(res, { modules });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/courses/:courseId/modules", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    if (!courseId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const m = await createCourseModule(courseId, req.body);
    success(res, { module: m }, 201);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/courses/:courseId/modules/:moduleId", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const moduleId = parseId(req.params.moduleId);
    if (!courseId || !moduleId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const m = await updateCourseModule(courseId, moduleId, req.body);
    success(res, { module: m });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.delete("/courses/:courseId/modules/:moduleId", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const moduleId = parseId(req.params.moduleId);
    if (!courseId || !moduleId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await deleteCourseModule(courseId, moduleId);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/courses/:courseId/modules/:moduleId/lessons", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const moduleId = parseId(req.params.moduleId);
    if (!courseId || !moduleId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const lesson = await createCourseLesson(courseId, moduleId, req.body);
    success(res, { lesson }, 201);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/courses/:courseId/modules/:moduleId/lessons/:lessonId", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const moduleId = parseId(req.params.moduleId);
    const lessonId = parseId(req.params.lessonId);
    if (!courseId || !moduleId || !lessonId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const lesson = await updateCourseLesson(courseId, moduleId, lessonId, req.body);
    success(res, { lesson });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.delete("/courses/:courseId/modules/:moduleId/lessons/:lessonId", async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    const moduleId = parseId(req.params.moduleId);
    const lessonId = parseId(req.params.lessonId);
    if (!courseId || !moduleId || !lessonId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await deleteCourseLesson(courseId, moduleId, lessonId);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// Media uploads (also fixed paths — must come before `/:id`).
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

// Task #183 — Buscar metadata pública de um vídeo do YouTube (capa +
// duração) sob demanda, pra alimentar o botão "Buscar do YouTube" no
// AdminCmsForm. Sem auth extra porque o adminCmsRouter já exige
// `producer+`. Nunca lança — devolve `{ found:false }` se a URL não for
// do YouTube ou se a metadata não puder ser obtida.
adminCmsRouter.post("/youtube-metadata", async (req, res, next) => {
  try {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) { sendError(res, "URL é obrigatória", "URL_REQUIRED", 400); return; }
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      success(res, { found: false, reason: "NOT_YOUTUBE" });
      return;
    }
    const meta = await fetchYouTubeMetadata(url);
    if (!meta) { success(res, { found: false, reason: "FETCH_FAILED" }); return; }
    success(res, {
      found: true,
      videoId: meta.videoId,
      thumbnailUrl: meta.thumbnailUrl,
      durationSeconds: meta.durationSeconds,
      title: meta.title,
    });
  } catch (err) { next(err); }
});

// 2) Content list/create at the router root.
adminCmsRouter.get("/", async (req, res, next) => {
  try {
    const { kind, status, segment, search, page, limit } = req.query;
    const result = await listAdminContent({
      kind: kind as string | undefined,
      status: status as string | undefined,
      segment: segment as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/", async (req: Request, res, next) => {
  try {
    const result = await createContent(req.user!, req.body);
    success(res, { item: result.item, youtube_autofill: result.youtubeAutofill }, 201);
  } catch (err) { handle(err, res, next); }
});

// 3) `/:id` family — last, so it never shadows the routes above.
adminCmsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await getAdminContentDetail(id);
    if (!item) { sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404); return; }
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await updateContent(req.user!, id, req.body);
    success(res, { item: result.item, youtube_autofill: result.youtubeAutofill });
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/:id/publish", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await setContentStatus(req.user!, id, "published");
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminCmsRouter.post("/:id/unpublish", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await setContentStatus(req.user!, id, "draft");
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// Pre-flight for the unpublish flow: returns the curated home-feed cards
// that point at this content item, so the CMS can warn producers that
// unpublishing will silently hide those rails (Task #25 hides them; this
// surfaces the impact before the producer commits).
adminCmsRouter.get("/:id/linked-home-cards", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const linked_home_cards = await getLinkedHomeCards(id);
    success(res, { linked_home_cards });
  } catch (err) { handle(err, res, next); }
});

// Task #26: archive a content_item without deleting it. Archived rows are
// hidden from every public listing/detail (just like drafts) but stay in the
// admin list with a distinct badge so producers can find/restore them later.
adminCmsRouter.post("/:id/archive", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await setContentStatus(req.user!, id, "archived");
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

// Restore an archived item back to draft (the producer must explicitly
// publish again to make it public). Reject the call if the item isn't
// actually archived, so the route name matches its semantics: this isn't a
// generic "force to draft" endpoint — `/unpublish` already covers that — and
// silently transitioning a non-archived item would mask client bugs.
adminCmsRouter.post("/:id/unarchive", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const detail = await getAdminContentDetail(id);
    if (!detail) { sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404); return; }
    if (detail.status !== "archived") {
      sendError(
        res,
        "Apenas conteúdos arquivados podem ser restaurados.",
        "NOT_ARCHIVED",
        409,
      );
      return;
    }
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

// Episodes (series) — nested under `/:id/episodes`.
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

// ── Public router (mounted at /api/content) ───────────────────────────
export const publicCmsRouter = Router();
publicCmsRouter.use(optionalAuth);

publicCmsRouter.get("/", async (req, res, next) => {
  try {
    const { kind, segment, interest, search, page, limit, mine } = req.query;
    // Auto-personalise by user segments + interests when authenticated and the
    // caller didn't pass explicit `segment` / `interest` filters. `mine=0`
    // opts out of all auto-personalisation.
    const wantsAuto = !!req.user && mine !== "0";
    const userInterests = wantsAuto && interest === undefined
      ? (req.user!.interests ?? [])
      : undefined;
    const userSegments = wantsAuto && segment === undefined
      ? (req.user!.segments ?? [])
      : undefined;
    const result = await listPublicContent({
      kind: kind as string | undefined,
      segment: segment as string | undefined,
      interest: interest as string | undefined,
      userInterests,
      userSegments,
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
