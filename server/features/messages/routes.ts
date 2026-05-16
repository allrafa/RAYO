import { Router } from "express";
import multer from "multer";
import path from "path";
import { parseBuffer as parseAudioBuffer } from "music-metadata";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listConversations,
  getOrCreateConversation,
  getMessages,
  getMessagesSince,
  sendMessage,
  markConversationRead,
  getUnreadConversationCount,
  searchUsers,
  setConversationArchived,
  deleteConversationForUser,
  toggleMessageReaction,
  removeMessageReaction,
  type MessageKind,
} from "./service.js";
import { publishToUser } from "./events.js";
import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { putPublicObject } from "../../lib/objectStorageBridge.js";
import { optimizeCmsImage } from "../../lib/imageOptimization.js";
import { logger } from "../../utils/logger.js";

const router = Router();

// Task #229 — Rota legada `GET /stream` (SSE) removida. Realtime de DM
// e notificações trafega exclusivamente pelo Socket.IO `/dm`.

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

// Task #222 — Gap-fill após reconectar: cliente passa `cursor` (last
// event id que tem em cache) e recebe tudo com id maior. Idempotente.
router.get("/conversations/:id/since", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const cursorRaw = req.query.cursor;
    const cursor = typeof cursorRaw === "string" ? parseInt(cursorRaw, 10) : 0;
    if (!Number.isFinite(cursor) || cursor < 0) {
      sendError(res, "Cursor inválido", "INVALID_CURSOR", 400);
      return;
    }
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 100, 200));
    const result = await getMessagesSince(conversationId, req.user!.id, cursor, limit);
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
// storage para conversas inexistentes/sem permissão (Task #79).
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

// ─────────── DM Upload (Task #79) ───────────
// Limites estritos para anexos de DM (acceptance da Task #79):
//  • imagem: jpeg/png/webp/gif, ≤5 MB
//  • áudio:  webm/ogg/mp4/mpeg/wav/x-m4a, ≤10 MB e duração ≤120s
// Validação inteira ANTES de gravar em Object Storage para evitar
// uploads órfãos / abuso de armazenamento.
const DM_IMAGE_MIMES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);
const DM_AUDIO_MIMES = new Set([
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a",
]);
const DM_IMAGE_MAX = 5 * 1024 * 1024;   // 5 MB
const DM_AUDIO_MAX = 10 * 1024 * 1024;  // 10 MB
const DM_AUDIO_MAX_SEC = 120;

function dmKindFromMime(mime: string): MessageKind | null {
  if (DM_IMAGE_MIMES.has(mime)) return "image";
  if (DM_AUDIO_MIMES.has(mime)) return "audio";
  return null;
}

function dmExtensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    case "image/gif":  return ".gif";
    case "audio/webm": return ".webm";
    case "audio/ogg":  return ".ogg";
    case "audio/mp4":  return ".m4a";
    case "audio/x-m4a": return ".m4a";
    case "audio/mpeg": return ".mp3";
    case "audio/wav":  return ".wav";
    default: return "";
  }
}

// Multer recusa MIMEs fora do allowlist no fileFilter; o limite é o teto
// absoluto (10 MB de áudio). Imagem maior que 5 MB ainda passa pelo
// multer e é rejeitada explicitamente abaixo, com mensagem amigável.
const dmUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DM_AUDIO_MAX },
  fileFilter: (_req, file, cb) => {
    if (dmKindFromMime(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
}).single("file");

// Upload de anexo (foto/áudio). Retorna a referência canônica
// (`objstore://...`) que o cliente envia em seguida via POST /messages.
router.post(
  "/conversations/:id/attachments",
  requireAuth,
  // 1) Membership ANTES de qualquer parsing/upload.
  async (req, res, next) => {
    try {
      const ok = await assertConversationMembership(req, res);
      if (!ok) return;
      next();
    } catch (err) {
      next(err);
    }
  },
  // 2) Multer (memória) com fileFilter restrito.
  (req, res, next) => dmUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(res, "Arquivo excede o tamanho máximo permitido", "FILE_TOO_LARGE", 413);
      return;
    }
    sendError(res, err instanceof Error ? err.message : "Upload inválido", "INVALID_UPLOAD", 400);
  }),
  // 3) Validação semântica + upload pra Object Storage.
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
        return;
      }
      const kind = dmKindFromMime(file.mimetype);
      if (!kind) {
        sendError(res, "Tipo de arquivo não suportado", "UNSUPPORTED_ATTACHMENT", 400);
        return;
      }

      let buffer = file.buffer;
      let mime = file.mimetype;
      const meta: Record<string, unknown> = { name: file.originalname };

      if (kind === "image") {
        if (file.size > DM_IMAGE_MAX) {
          sendError(res, "Imagem deve ter até 5 MB", "IMAGE_TOO_LARGE", 413);
          return;
        }
        try {
          const optimized = await optimizeCmsImage(buffer, mime);
          buffer = optimized.buffer;
          mime = optimized.mimetype;
        } catch {
          // se o sharp falhar, segue com o buffer original (já validado por mime).
        }
      } else {
        // kind === "audio". Tamanho já capado pelo multer (10 MB). Validar duração.
        try {
          const probed = await parseAudioBuffer(buffer, { mimeType: mime, size: buffer.length }, { duration: true });
          const durationSec = Math.round(probed.format.duration ?? 0);
          if (!durationSec || durationSec <= 0) {
            sendError(res, "Não foi possível ler a duração do áudio", "AUDIO_DURATION_INVALID", 400);
            return;
          }
          if (durationSec > DM_AUDIO_MAX_SEC) {
            sendError(res, "Áudio deve ter até 2 minutos", "AUDIO_TOO_LONG", 413);
            return;
          }
          meta.duration_sec = durationSec;
        } catch (err) {
          logger.warn("Messages", `audio probe failed: ${(err as Error)?.message ?? err}`);
          sendError(res, "Áudio inválido ou corrompido", "AUDIO_INVALID", 400);
          return;
        }
      }

      meta.mime = mime;
      meta.size = buffer.length;

      const ext = dmExtensionForMime(mime) || path.extname(file.originalname) || "";
      const safeName = `${Date.now()}-${Math.random().toString(16).slice(2, 10).padEnd(8, "0")}${ext}`;
      const key = `messages/${kind}/${safeName}`;
      await putPublicObject(key, buffer, mime);

      success(res, {
        attachment: {
          kind,
          attachment_url: `objstore://${key}`,
          attachment_meta: meta,
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
    // Task #229 — emite `message:typing` (nome do contrato Socket.IO).
    // Era `typing` na era SSE; o cliente unificado só escuta `message:typing`.
    publishToUser(recipientId, "message:typing", {
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

router.post("/conversations/:id/listening", requireAuth, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId) || conversationId < 1) {
      sendError(res, "ID de conversa inválido", "INVALID_CONVERSATION_ID", 400);
      return;
    }
    const messageIdRaw = req.body?.message_id;
    const messageId = typeof messageIdRaw === "number" ? messageIdRaw : parseInt(messageIdRaw, 10);
    if (!Number.isFinite(messageId) || messageId < 1) {
      sendError(res, "message_id é obrigatório", "INVALID_MESSAGE_ID", 400);
      return;
    }
    const userId = req.user!.id;
    const { rows } = await query<{ user_a_id: number; user_b_id: number; sender_id: number; kind: string }>(
      `SELECT c.user_a_id, c.user_b_id, m.sender_id, m.kind
         FROM conversations c
         JOIN messages m ON m.conversation_id = c.id
        WHERE c.id = $1 AND m.id = $2`,
      [conversationId, messageId]
    );
    if (rows.length === 0) {
      sendError(res, "Conversa ou mensagem não encontrada", "NOT_FOUND", 404);
      return;
    }
    const row = rows[0];
    if (row.user_a_id !== userId && row.user_b_id !== userId) {
      sendError(res, "Acesso negado a esta conversa", "FORBIDDEN", 403);
      return;
    }
    if (row.kind !== "audio") {
      sendError(res, "Mensagem não é de áudio", "NOT_AUDIO", 400);
      return;
    }
    // Só faz fan-out pro autor do áudio (e só se NÃO for o próprio listener).
    if (row.sender_id === userId) {
      success(res, { ok: true });
      return;
    }
    publishToUser(row.sender_id, "listening", {
      conversation_id: conversationId,
      user_id: userId,
      message_id: messageId,
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

// ─────────── Reactions (Task #148) ───────────
// POST /api/messages/:id/reactions  — toggle/swap emoji
// DELETE /api/messages/:id/reactions — remover reação do usuário
router.post("/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, "ID de mensagem inválido", "INVALID_MESSAGE_ID", 400);
      return;
    }
    const emoji = req.body?.emoji;
    if (typeof emoji !== "string" || !emoji) {
      sendError(res, "emoji é obrigatório", "EMOJI_REQUIRED", 400);
      return;
    }
    const result = await toggleMessageReaction(messageId, req.user!.id, emoji);
    success(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

router.delete("/:id/reactions", requireAuth, async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, "ID de mensagem inválido", "INVALID_MESSAGE_ID", 400);
      return;
    }
    const result = await removeMessageReaction(messageId, req.user!.id);
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
