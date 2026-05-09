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
  setConversationArchived,
  deleteConversationForUser,
  type MessageKind,
} from "./service.js";
import { subscribeUser, publishToUser } from "./events.js";
import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { uploadMiddleware } from "../cms/upload.js";

const router = Router();

router.get("/stream", requireAuth, (req, res) => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(`event: connected\ndata: {}\n\n`);

  const send = (event: string, payload: unknown) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      /* socket gone */
    }
  };

  const unsubscribe = subscribeUser(userId, send);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch {
      /* */
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
    const scope = req.query.scope === "archived" ? "archived" : "active";
    const conversations = await listConversations(req.user!.id, scope);
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
    const { content, kind, attachment_url, attachment_meta } = req.body || {};
    const message = await sendMessage(conversationId, req.user!.id, {
      kind: (kind as MessageKind) || "text",
      content: typeof content === "string" ? content : "",
      attachmentUrl: typeof attachment_url === "string" ? attachment_url : null,
      attachmentMeta:
        attachment_meta && typeof attachment_meta === "object" ? attachment_meta : null,
    });
    success(res, { message }, 201);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

// Membership check ANTES do upload, para evitar gravar bytes em object
// storage para conversas inexistentes/sem permissão (Task #79 review).
async function assertConversationMembership(req: import("express").Request, res: import("express").Response): Promise<boolean> {
  const conversationId = parseInt(req.params.id, 10);
  if (isNaN(conversationId) || conversationId < 1) {
    sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
    return false;
  }
  const { rows } = await query<{ user_a_id: number; user_b_id: number }>(
    `SELECT user_a_id, user_b_id FROM conversations WHERE id = $1`,
    [conversationId]
  );
  if (rows.length === 0) {
    sendError(res, "Conversa não encontrada", "CONVERSATION_NOT_FOUND", 404);
    return false;
  }
  const conv = rows[0];
  const userId = req.user!.id;
  if (conv.user_a_id !== userId && conv.user_b_id !== userId) {
    sendError(res, "Acesso negado a esta conversa", "FORBIDDEN", 403);
    return false;
  }
  return true;
}

// Upload de anexo (foto/áudio). Retorna a referência canônica
// (`objstore://...`) que o cliente envia em seguida via POST /messages.
router.post(
  "/conversations/:id/attachments",
  requireAuth,
  // Membership ANTES do uploadMiddleware: rejeita 403/404 sem gravar
  // bytes em object storage.
  async (req, res, next) => {
    try {
      const ok = await assertConversationMembership(req, res);
      if (!ok) return;
      next();
    } catch (err) {
      next(err);
    }
  },
  (req, res, next) => uploadMiddleware(req, res, (err) => err ? next(err) : next()),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
        return;
      }
      const mime = file.mimetype;
      let kind: MessageKind;
      if (mime.startsWith("image/")) kind = "image";
      else if (mime.startsWith("audio/")) kind = "audio";
      else {
        sendError(res, "Tipo de arquivo não suportado para mensagens", "UNSUPPORTED_ATTACHMENT", 400);
        return;
      }
      success(res, {
        attachment: {
          kind,
          // file.path é a referência canônica `objstore://...`
          attachment_url: file.path,
          attachment_meta: {
            mime,
            size: file.size,
            name: file.originalname,
          },
        },
      }, 201);
    } catch (err) {
      next(err);
    }
  },
);

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

router.post("/conversations/:id/archive", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const archived = req.body?.archived !== false; // default = arquivar
    await setConversationArchived(conversationId, req.user!.id, archived);
    success(res, { archived });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.delete("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    await deleteConversationForUser(conversationId, req.user!.id);
    success(res, { deleted: true });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

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
