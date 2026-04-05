import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listForums,
  getForumPosts,
  getAllPosts,
  createPost,
  getPostDetail,
  togglePostLike,
  addComment,
  toggleCommentLike,
} from "./service.js";
import { AppError } from "../academia/service.js";

const router = Router();

router.get("/forums", async (req, res, next) => {
  try {
    const forums = await listForums();
    success(res, { forums });
  } catch (err) {
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

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const { forum_id, content, category, title } = req.body;
    const parsedForumId = parseInt(forum_id, 10);
    if (!forum_id || isNaN(parsedForumId) || parsedForumId < 1) {
      sendError(res, "forum_id é obrigatório e deve ser um número válido", "INVALID_FORUM_ID");
      return;
    }
    const post = await createPost(req.user!.id, forum_id, content, category, title);
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

export default router;
