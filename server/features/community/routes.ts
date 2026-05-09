import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import { putPublicObject } from "../../lib/objectStorageBridge.js";
import { optimizeCmsImage } from "../../lib/imageOptimization.js";
import {
  listForums,
  getForumBySlug,
  getForumIdBySlug,
  getMySubscribedForums,
  getForumPosts,
  getAllPosts,
  createPost,
  getPostDetail,
  togglePostLike,
  addComment,
  toggleCommentLike,
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
      sendError(res, "Vídeo não é permitido em posts. Use o CMS para vídeos.", "VIDEO_NOT_ALLOWED", 415);
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

router.get("/forums/:id/posts", async (req, res, next) => {
  try {
    const forumId = parseInt(req.params.id, 10);
    if (isNaN(forumId) || forumId < 1) {
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
    const result = await getAllPosts(page, limit, userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/posts", requireAuth, postCreateLimiter, async (req, res, next) => {
  try {
    const { forum_id, content, category, title, images } = req.body;
    const parsedForumId = parseInt(forum_id, 10);
    if (!forum_id || isNaN(parsedForumId) || parsedForumId < 1) {
      sendError(res, "Selecione uma comunidade para publicar", "INVALID_FORUM_ID", 400);
      return;
    }
    const post = await createPost(req.user!.id, parsedForumId, content, category, title, images);
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
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
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
