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
import { subscribeUser, publishToUser } from "./events.js";
import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";

const router = Router();

// Real-time event stream (SSE). Replaces the legacy polling on the conversations
// list and the unread-count badge. The connection is kept alive with periodic
// comment heartbeats; EventSource auto-reconnects if the link drops.
router.get("/stream", requireAuth, (req, res) => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Disable proxy buffering (nginx/Replit) so events flush immediately.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Initial handshake so the client knows the stream is live.
  res.write(`event: connected\ndata: {}\n\n`);

  const send = (event: string, payload: unknown) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // If the socket is gone, cleanup will run via the 'close' handler.
    }
  };

  const unsubscribe = subscribeUser(userId, send);

  // Heartbeat (SSE comment) to keep proxies and the browser from idling out.
  const heartbeat = setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch {
      // Ignored; close handler will run.
    }
  }, 25_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);
  res.on("close", cleanup);
});

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

// Ephemeral "typing" signal. Validates that the caller belongs to the
// conversation, then fans out a `typing` event to the OTHER participant
// via SSE. Nothing is persisted — if no SSE subscriber is listening,
// the signal is silently dropped (which is fine; recipients auto-clear
// the indicator after a few seconds without new pings).
router.post("/conversations/:id/typing", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const userId = req.user!.id;
    const { rows } = await query<{ user_a_id: number; user_b_id: number }>(
      `SELECT user_a_id, user_b_id FROM conversations WHERE id = $1`,
      [conversationId]
    );
    if (rows.length === 0) {
      sendError(res, "Conversa não encontrada", "CONVERSATION_NOT_FOUND", 404);
      return;
    }
    const conv = rows[0];
    if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
      sendError(res, "Acesso negado a esta conversa", "FORBIDDEN", 403);
      return;
    }
    const recipientId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;
    publishToUser(recipientId, "typing", {
      conversation_id: conversationId,
      user_id: userId,
    });
    success(res, { ok: true });
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
