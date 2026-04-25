import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadConversationCount,
  searchUsers,
} from "./service.js";
import { AppError } from "../academia/service.js";

const router = Router();

router.get("/conversations", requireAuth, async (req, res, next) => {
  try {
    const conversations = await listConversations(req.user!.id);
    success(res, { conversations });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/conversations", requireAuth, async (req, res, next) => {
  try {
    const { user_id } = req.body || {};
    const otherId = parseInt(user_id, 10);
    if (!user_id || isNaN(otherId)) {
      sendError(res, "user_id é obrigatório", "INVALID_USER_ID", 400);
      return;
    }
    const result = await getOrCreateConversation(req.user!.id, otherId);
    success(res, { conversation: result }, result.created ? 201 : 200);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.get("/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 100));
    const result = await getMessages(conversationId, req.user!.id, page, limit);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const { content } = req.body || {};
    const message = await sendMessage(conversationId, req.user!.id, content);
    success(res, { message }, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.post("/conversations/:id/read", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const result = await markConversationRead(conversationId, req.user!.id);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const count = await getUnreadConversationCount(req.user!.id);
    success(res, { count });
  } catch (err) {
    next(err);
  }
});

router.get("/users/search", requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || "";
    const results = await searchUsers(req.user!.id, q);
    success(res, { users: results });
  } catch (err) {
    next(err);
  }
});

export default router;
