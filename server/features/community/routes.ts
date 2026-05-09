import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth, hasRole } from "../../middleware/auth.js";
import { isCourseMember } from "../academia/service.js";
import { checkCourseAccess } from "../../middleware/requireTrailAccess.js";
import { query as dbQuery } from "../../db/index.js";

// Task #130 — gating compartilhado da comunidade. Quando a turma tem trilha
// paga vinculada e o usuário não assina, devolve 402 TRAIL_PAYMENT_REQUIRED
// (com trail_id+trail_slug pra que o frontend renderize <TrailPaywall>).
// Para turmas grátis ou usuários com assinatura ativa, segue o gate de
// matrícula original (404 pra não vazar a existência da turma).
async function gateClassPostsAccess(
  req: import("express").Request,
  res: import("express").Response,
  classId: number,
): Promise<boolean> {
  const { allowed, trailId } = await checkCourseAccess(req, classId);
  if (!allowed) {
    let trailSlug: string | null = null;
    if (trailId) {
      const { rows } = await dbQuery<{ slug: string }>(
        `SELECT slug FROM trails WHERE id = $1`,
        [trailId],
      );
      trailSlug = rows[0]?.slug ?? null;
    }
    res.status(402).json({
      success: false,
      data: null,
      error: {
        code: "TRAIL_PAYMENT_REQUIRED",
        message: "Esta comunidade faz parte de uma trilha paga. Assine para acessar.",
        trail_id: trailId,
        trail_slug: trailSlug,
        course_id: classId,
      },
    });
    return false;
  }
  // Trilha grátis ou subscriber: continua exigindo matrícula (privacidade
  // intra-turma — não-membros recebem 404 pra não vazar a turma).
  const userId = req.user?.id;
  if (!userId) {
    sendError(res, "Turma não encontrada", "COURSE_NOT_FOUND", 404);
    return false;
  }
  const member = await isCourseMember(userId, classId);
  if (!member && !hasRole(req.user, "moderator")) {
    sendError(res, "Turma não encontrada", "COURSE_NOT_FOUND", 404);
    return false;
  }
  return true;
}
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import { putPublicObject } from "../../lib/objectStorageBridge.js";
import { optimizeCmsImage } from "../../lib/imageOptimization.js";
import {
  listForums,
  getForumBySlug,
  getForumIdBySlug,
  getMySubscribedForums,
  getTrendingPosts,
  getForumPosts,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  setPostSaved,
  getUserSavedPosts,
  getPostDetail,
  togglePostLike,
  togglePostReaction,
  addComment,
  toggleCommentLike,
  toggleCommentReaction,
  ALLOWED_REACTION_EMOJIS,
  setForumSubscription,
  getUserPosts,
  getUserComments,
  getUserCommunities,
  getUserKarma,
} from "./service.js";
import { getUserBadges } from "../gamification/service.js";
import { AppError } from "../academia/service.js";

const router = Router();

// ───── Upload de fotos para posts (Task #92) ─────
//
// REGRA INVIOLÁVEL: posts SÓ aceitam imagens. Vídeo é exclusivo do CMS via
// Bunny Stream e está bloqueado tanto no fileFilter (allowlist mime) quanto
// no service (validação do prefix `objstore://posts/`).
//
// Multer próprio (memoryStorage) — NÃO reutilizamos o uploadMiddleware do
// CMS porque ele aceita vídeos, PDFs e áudio. Espelha o padrão usado em
// `messages/routes.ts` (membership/auth ANTES, fileFilter restrito,
// validação semântica, otimização com sharp, gravação em Object Storage).
const POST_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const POST_IMAGE_MAX = 5 * 1024 * 1024; // 5 MB
const postImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: POST_IMAGE_MAX },
  fileFilter: (_req, file, cb) => {
    if (POST_IMAGE_MIMES.has(file.mimetype)) return cb(null, true);
    // Vídeo é bloqueado explicitamente — REGRA INVIOLÁVEL Task #92.
    if (file.mimetype.startsWith("video/")) {
      const err = new Error("Vídeo não é permitido em posts");
      (err as Error & { mimetype?: string }).mimetype = file.mimetype;
      return cb(err as Error);
    }
    cb(new Error("Apenas imagens JPG, PNG ou WebP são permitidas"));
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

// 60 uploads/h por usuário — uma sessão de composer com 4 fotos cabe folgada.
const postUploadLimiter = rateLimiter(60, 60 * 60 * 1000, { keyByUser: true });
// 30 posts/h por usuário (anti-spam, separado do limiter geral de /api/community).
const postCreateLimiter = rateLimiter(30, 60 * 60 * 1000, { keyByUser: true });

router.post(
  "/posts/attachments",
  requireAuth,
  postUploadLimiter,
  (req, res, next) => postImageUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(res, "Imagem deve ter até 5 MB", "FILE_TOO_LARGE", 413);
      return;
    }
    // Task #92 — distingue vídeo (regra inviolável: só fotos) de outros tipos
    // pra que o cliente possa exibir mensagem específica e o teste de
    // segurança consiga acionar a allowlist.
    const message = err instanceof Error ? err.message : "Upload inválido";
    if (/v[ií]deo|video/i.test(message) || (err as { mimetype?: string })?.mimetype?.startsWith?.("video/")) {
      // Spec Task #92: vídeo retorna 400 (validation error) com code explícito.
      sendError(res, "Vídeo não é permitido em posts. Use o CMS para vídeos.", "VIDEO_NOT_ALLOWED", 400);
      return;
    }
    sendError(res, message, "INVALID_UPLOAD", 400);
  }),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
        return;
      }
      if (!POST_IMAGE_MIMES.has(file.mimetype)) {
        sendError(res, "Tipo de imagem não suportado", "UNSUPPORTED_IMAGE", 400);
        return;
      }

      let buffer = file.buffer;
      let mime = file.mimetype;
      try {
        const optimized = await optimizeCmsImage(buffer, mime);
        buffer = optimized.buffer;
        mime = optimized.mimetype;
      } catch {
        // se sharp falhar, segue com buffer original (já validado por mime).
      }

      const ext = imageExt(mime) || path.extname(file.originalname) || ".jpg";
      const safeName = `${Date.now()}-${Math.random().toString(16).slice(2, 10).padEnd(8, "0")}${ext}`;
      const key = `posts/${safeName}`;
      await putPublicObject(key, buffer, mime);

      success(res, {
        attachment: {
          attachment_url: `objstore://${key}`,
          mime,
          size: buffer.length,
        },
      }, 201);
    } catch (err) {
      next(err);
    }
  },
);

// ───── Forums ─────

router.get("/forums", async (req, res, next) => {
  try {
    const forums = await listForums(req.user?.id);
    success(res, { forums });
  } catch (err) {
    next(err);
  }
});

// Task #92 — "Em alta" (trending) calculado em runtime: likes + comments
// nas últimas 48h. Suporta filtro por comunidade via `?forum_id=`.
router.get("/posts/trending", requireAuth, async (req, res, next) => {
  try {
    const forumIdRaw = String(req.query.forum_id || "").trim();
    const forumId = forumIdRaw ? parseInt(forumIdRaw, 10) : undefined;
    if (forumIdRaw && (isNaN(forumId!) || forumId! < 1)) {
      sendError(res, "forum_id inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    // Task #99/#130 — escopo opcional por turma. Trilha paga ⇒ 402; depois
    // matrícula ⇒ 404. `gateClassPostsAccess` cobre os dois casos.
    const classIdRaw = String(req.query.class_id || "").trim();
    let classId: number | undefined;
    if (classIdRaw) {
      const cid = parseInt(classIdRaw, 10);
      if (isNaN(cid) || cid < 1) {
        sendError(res, "class_id inválido", "INVALID_CLASS_ID", 400);
        return;
      }
      if (!(await gateClassPostsAccess(req, res, cid))) return;
      classId = cid;
    }
    const limit = parseInt(String(req.query.limit || "20"), 10);
    const result = await getTrendingPosts({
      forumId,
      classId,
      limit: Number.isFinite(limit) ? limit : 20,
      userId: req.user?.id,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// Task #92 — comunidades inscritas pelo viewer (Reddit-style "Suas comunidades").
// DECLARADO ANTES de `/forums/:id/...` pra evitar conflito com a rota dinâmica.
router.get("/forums/me", requireAuth, async (req, res, next) => {
  try {
    const result = await getMySubscribedForums(req.user!.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.get("/forums/by-slug/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      sendError(res, "Slug inválido", "INVALID_SLUG", 400);
      return;
    }
    const forum = await getForumBySlug(slug, req.user?.id);
    success(res, { forum });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #92 — `:idOrSlug` aceita ID numérico OU slug (ex `c/casados`).
router.get("/forums/:idOrSlug/posts", async (req, res, next) => {
  try {
    const raw = String(req.params.idOrSlug || "").trim();
    let forumId: number;
    if (/^\d+$/.test(raw)) {
      forumId = parseInt(raw, 10);
    } else if (/^[a-z0-9-]+$/i.test(raw)) {
      try {
        forumId = await getForumIdBySlug(raw.toLowerCase());
      } catch {
        sendError(res, "Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
        return;
      }
    } else {
      sendError(res, "ID/slug de fórum inválido", "INVALID_FORUM_ID");
      return;
    }
    if (!Number.isFinite(forumId) || forumId < 1) {
      sendError(res, "ID de fórum inválido", "INVALID_FORUM_ID");
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
    const userId = req.user?.id;
    const result = await getForumPosts(forumId, page, limit, userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// Task #92 — slug-based subscribe (URL canônica). Aceita `POST` com body
// `{subscribed:bool}` (default true) e `DELETE` como atalho de unsubscribe.
router.post("/forums/by-slug/:slug/subscribe", requireAuth, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      sendError(res, "Slug inválido", "INVALID_SLUG", 400);
      return;
    }
    const forumId = await getForumIdBySlug(slug);
    const subscribed = req.body?.subscribed !== false;
    const result = await setForumSubscription(forumId, req.user!.id, subscribed);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.delete("/forums/by-slug/:slug/subscribe", requireAuth, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      sendError(res, "Slug inválido", "INVALID_SLUG", 400);
      return;
    }
    const forumId = await getForumIdBySlug(slug);
    const result = await setForumSubscription(forumId, req.user!.id, false);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/forums/:id/subscribe", requireAuth, async (req, res, next) => {
  try {
    const forumId = parseInt(req.params.id, 10);
    if (isNaN(forumId) || forumId < 1) {
      sendError(res, "ID de fórum inválido", "INVALID_FORUM_ID", 400);
      return;
    }
    const subscribed = req.body?.subscribed !== false;
    const result = await setForumSubscription(forumId, req.user!.id, subscribed);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// ───── Posts ─────

router.get("/posts", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
    const userId = req.user?.id;
    // Task #99 — quando ?class_id=N, lista posts dessa turma. Sem param,
    // o service filtra por class_id IS NULL (não vaza posts de turma).
    const classIdRaw = String(req.query.class_id || "").trim();
    let classId: number | undefined;
    if (classIdRaw) {
      const cid = parseInt(classIdRaw, 10);
      if (isNaN(cid) || cid < 1) {
        sendError(res, "class_id inválido", "INVALID_CLASS_ID", 400);
        return;
      }
      // Task #130 — gating em camadas: trilha paga ⇒ 402 TRAIL_PAYMENT_REQUIRED;
      // depois matrícula ⇒ 404 (não vaza turma).
      if (!(await gateClassPostsAccess(req, res, cid))) return;
      classId = cid;
    }
    const result = await getAllPosts(page, limit, userId, classId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/posts", requireAuth, postCreateLimiter, async (req, res, next) => {
  try {
    const { forum_id, content, category, title, images, class_id } = req.body;
    const parsedForumId = parseInt(forum_id, 10);
    if (!forum_id || isNaN(parsedForumId) || parsedForumId < 1) {
      sendError(res, "Selecione uma comunidade para publicar", "INVALID_FORUM_ID", 400);
      return;
    }
    // Task #99/#130 — class_id opcional. Quando vem, valida trilha paga
    // (402) + matrícula (service ainda revalida pra evitar TOCTOU).
    let classId: number | null = null;
    if (class_id !== undefined && class_id !== null && class_id !== "") {
      const cid = parseInt(String(class_id), 10);
      if (isNaN(cid) || cid < 1) {
        sendError(res, "class_id inválido", "INVALID_CLASS_ID", 400);
        return;
      }
      if (!(await gateClassPostsAccess(req, res, cid))) return;
      classId = cid;
    }
    const post = await createPost(req.user!.id, parsedForumId, content, category, title, images, classId);
    success(res, { post }, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.get("/posts/:id", async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID");
      return;
    }
    const userId = req.user?.id;
    const post = await getPostDetail(postId, userId);
    success(res, { post });
  } catch (err) {
    if (err instanceof AppError) {
      // Task #130 — quando getPostDetail bloqueia por trilha paga, propaga
      // os campos extras (trail_id/trail_slug/class_id) no payload pra que
      // o frontend renderize <TrailPaywall> em vez de toast genérico.
      if (err.code === "TRAIL_PAYMENT_REQUIRED") {
        const extra = err as unknown as { trail_id?: number; trail_slug?: string; class_id?: number };
        res.status(err.statusCode).json({
          success: false,
          data: null,
          error: {
            code: err.code,
            message: err.message,
            trail_id: extra.trail_id ?? null,
            trail_slug: extra.trail_slug ?? null,
            class_id: extra.class_id ?? null,
          },
        });
        return;
      }
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #93 — autor edita conteúdo/categoria/título do próprio post.
router.patch("/posts/:id", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    const { content, category, title, images } = req.body || {};
    const result = await updatePost(postId, req.user!.id, { content, category, title, images });
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #93 — soft delete (autor OU moderador+).
router.delete("/posts/:id", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    const role = req.user?.role || "client";
    const isModeratorPlus = role === "moderator" || role === "admin";
    // Task #94 — `reason` é opcional e só é registrado quando o requester
    // é moderator+ (pra autores excluindo o próprio post o campo é ignorado).
    const reason = isModeratorPlus && typeof req.body?.reason === "string"
      ? req.body.reason
      : null;
    const result = await deletePost(postId, req.user!.id, isModeratorPlus, reason);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #93 — Salvar/Desalvar post. Toggle via body `{saved:bool}`.
router.post("/posts/:id/save", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    const saved = req.body?.saved !== false;
    const result = await setPostSaved(postId, req.user!.id, saved);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #93 — DELETE explícito como atalho idempotente para desalvar
// (POST /save {saved:false} continua funcionando como toggle).
router.delete("/posts/:id/save", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID", 400);
      return;
    }
    const result = await setPostSaved(postId, req.user!.id, false);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #93 — posts salvos: privado, só o próprio usuário pode ler a
// própria lista. Aceita "me" como atalho. Outros IDs respondem 403.
router.get("/users/:id/saved", requireAuth, async (req, res, next) => {
  try {
    const raw = req.params.id;
    const targetId = raw === "me" ? req.user!.id : parseInt(raw, 10);
    if (!Number.isFinite(targetId) || targetId < 1) {
      sendError(res, "ID inválido", "INVALID_USER_ID", 400);
      return;
    }
    if (targetId !== req.user!.id) {
      sendError(res, "Posts salvos são privados", "FORBIDDEN", 403);
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
    const result = await getUserSavedPosts(req.user!.id, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/posts/:id/like", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID");
      return;
    }
    const result = await togglePostLike(postId, req.user!.id);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/posts/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID");
      return;
    }
    const { content, parent_id } = req.body;
    const comment = await addComment(postId, req.user!.id, content, parent_id);
    success(res, { comment }, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/comments/:id/like", requireAuth, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    if (isNaN(commentId)) {
      sendError(res, "ID de comentário inválido", "INVALID_COMMENT_ID");
      return;
    }
    const result = await toggleCommentLike(commentId, req.user!.id);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Task #122 — reações multi-emoji em posts e comentários.
// Body: `{ emoji: "❤️" | "😂" | "🙏" | "💡" | "🔥" | "👏" }`. Toggle:
// mesmo emoji remove, emoji diferente troca, novo adiciona. Devolve o
// agregado pra UI atualizar sem precisar re-fetch do post inteiro.
router.post("/posts/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId) || postId < 1) {
      sendError(res, "ID de post inválido", "INVALID_POST_ID");
      return;
    }
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "";
    const result = await togglePostReaction(postId, req.user!.id, emoji);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/comments/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    if (isNaN(commentId) || commentId < 1) {
      sendError(res, "ID de comentário inválido", "INVALID_COMMENT_ID");
      return;
    }
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "";
    const result = await toggleCommentReaction(commentId, req.user!.id, emoji);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Lista pública dos emojis permitidos — usado pelo frontend pra montar o
// picker sem hardcode duplicado. Read-only, cacheável.
router.get("/reactions/allowed", (_req, res) => {
  success(res, { emojis: ALLOWED_REACTION_EMOJIS });
});

// ───── Perfil público (Reddit-style) ─────

router.get("/users/:id/posts", requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1) {
      sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
    const result = await getUserPosts(targetId, req.user?.id, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1) {
      sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));
    const result = await getUserComments(targetId, page, limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/communities", requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1) {
      sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
      return;
    }
    const result = await getUserCommunities(targetId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// Task #92 — badges públicos (somente conquistados) pro tab "Conquistas"
// no perfil. Reutiliza getUserBadges do gamification mas filtra apenas
// os já ganhos pra não vazar a lista de badges não obtidos.
router.get("/users/:id/badges", requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1) {
      sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
      return;
    }
    const all = await getUserBadges(targetId);
    const earned = all.filter((b) => b.earned);
    success(res, { badges: earned, total: earned.length });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/karma", requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId < 1) {
      sendError(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
      return;
    }
    const result = await getUserKarma(targetId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
