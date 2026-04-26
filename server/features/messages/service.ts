import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { trackEvent } from "../analytics/service.js";
import { publishToUser } from "./events.js";

const MAX_MESSAGE_LENGTH = 4000;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_RESULTS = 10;

interface ConversationRow {
  id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  last_message_created_at: string | null;
  unread_count: number;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

function orderUsers(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

async function assertConversationMember(conversationId: number, userId: number): Promise<{ user_a_id: number; user_b_id: number }> {
  const { rows } = await query<{ user_a_id: number; user_b_id: number }>(
    `SELECT user_a_id, user_b_id FROM conversations WHERE id = $1`,
    [conversationId]
  );
  if (rows.length === 0) {
    throw new AppError("Conversa não encontrada", "CONVERSATION_NOT_FOUND", 404);
  }
  if (rows[0].user_a_id !== userId && rows[0].user_b_id !== userId) {
    throw new AppError("Acesso negado a esta conversa", "FORBIDDEN", 403);
  }
  return rows[0];
}

export async function listConversations(userId: number): Promise<ConversationRow[]> {
  const { rows } = await query<ConversationRow>(
    `SELECT
       c.id,
       c.user_a_id,
       c.user_b_id,
       c.last_message_at,
       c.created_at,
       CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END AS other_user_id,
       u.name AS other_user_name,
       lm.content AS last_message_content,
       lm.sender_id AS last_message_sender_id,
       lm.created_at AS last_message_created_at,
       COALESCE(uc.unread_count, 0)::int AS unread_count
     FROM conversations c
     JOIN users u ON u.id = (CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END)
     LEFT JOIN LATERAL (
       SELECT m.content, m.sender_id, m.created_at
       FROM messages m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC
       LIMIT 1
     ) lm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM messages m
       WHERE m.conversation_id = c.id
         AND m.sender_id <> $1
         AND m.read_at IS NULL
     ) uc ON true
     WHERE c.user_a_id = $1 OR c.user_b_id = $1
     ORDER BY c.last_message_at DESC`,
    [userId]
  );
  return rows;
}

export async function getOrCreateConversation(userId: number, otherUserId: number): Promise<{ id: number; created: boolean; other_user_id: number; other_user_name: string }> {
  if (!Number.isInteger(otherUserId) || otherUserId < 1) {
    throw new AppError("ID de usuário inválido", "INVALID_USER_ID", 400);
  }
  if (otherUserId === userId) {
    throw new AppError("Não é possível conversar consigo mesmo", "INVALID_TARGET", 400);
  }

  const { rows: targetRows } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM users WHERE id = $1`,
    [otherUserId]
  );
  if (targetRows.length === 0) {
    throw new AppError("Usuário não encontrado", "USER_NOT_FOUND", 404);
  }

  const [aId, bId] = orderUsers(userId, otherUserId);

  // Atomic upsert: avoids race condition between two concurrent
  // POST /conversations calls for the same pair (would otherwise
  // hit UNIQUE constraint and return 500).
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO conversations (user_a_id, user_b_id)
     VALUES ($1, $2)
     ON CONFLICT (user_a_id, user_b_id) DO NOTHING
     RETURNING id`,
    [aId, bId]
  );

  if (inserted.length > 0) {
    trackEvent(userId, "conversation_started", { conversation_id: inserted[0].id, other_user_id: otherUserId });
    return {
      id: inserted[0].id,
      created: true,
      other_user_id: targetRows[0].id,
      other_user_name: targetRows[0].name,
    };
  }

  const { rows: existing } = await query<{ id: number }>(
    `SELECT id FROM conversations WHERE user_a_id = $1 AND user_b_id = $2`,
    [aId, bId]
  );

  if (existing.length === 0) {
    throw new AppError("Falha ao criar conversa", "CONVERSATION_CREATE_FAILED", 500);
  }

  return {
    id: existing[0].id,
    created: false,
    other_user_id: targetRows[0].id,
    other_user_name: targetRows[0].name,
  };
}

export async function getMessages(
  conversationId: number,
  userId: number,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: MessageRow[]; total: number; page: number; limit: number; totalPages: number; other_user_id: number; other_user_name: string }> {
  const conv = await assertConversationMember(conversationId, userId);
  const otherUserId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

  const { rows: otherRows } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [otherUserId]
  );

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM messages WHERE conversation_id = $1`,
    [conversationId]
  );
  const total = parseInt(countRows[0].total, 10);

  const offset = (page - 1) * limit;

  const { rows } = await query<MessageRow>(
    `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name,
            m.content, m.read_at, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );

  return {
    messages: rows.reverse(),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    other_user_id: otherUserId,
    other_user_name: otherRows[0]?.name || "Usuário",
  };
}

export async function sendMessage(conversationId: number, userId: number, content: string): Promise<MessageRow> {
  if (!content || content.trim().length === 0) {
    throw new AppError("Conteúdo da mensagem é obrigatório", "EMPTY_MESSAGE", 400);
  }
  const trimmed = content.trim();
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres`, "MESSAGE_TOO_LONG", 400);
  }

  const conv = await assertConversationMember(conversationId, userId);
  const recipientId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

  const { rows } = await query<MessageRow>(
    `INSERT INTO messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, conversation_id, sender_id, content, read_at, created_at`,
    [conversationId, userId, trimmed]
  );

  await query(
    `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
    [conversationId]
  );

  const { rows: senderRows } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [userId]
  );
  const message = rows[0];
  message.sender_name = senderRows[0]?.name || "Usuário";

  trackEvent(userId, "message_sent", { conversation_id: conversationId, message_id: message.id });

  // Real-time fan-out: notify both participants so the UI updates without polling.
  // We publish AFTER the DB writes succeed; fire-and-forget for unread refresh.
  const eventPayload = { conversation_id: conversationId, message };
  publishToUser(userId, "message:new", eventPayload);
  if (recipientId !== userId) {
    publishToUser(recipientId, "message:new", eventPayload);
    // The recipient's unread count may have changed (a new conversation may
    // now contain unread messages). Compute & broadcast asynchronously.
    void getUnreadConversationCount(recipientId)
      .then((count) => publishToUser(recipientId, "unread:changed", { count }))
      .catch(() => {
        /* best-effort */
      });
  }

  return message;
}

export async function markConversationRead(conversationId: number, userId: number): Promise<{ marked: number }> {
  await assertConversationMember(conversationId, userId);

  const { rowCount } = await query(
    `UPDATE messages SET read_at = NOW()
     WHERE conversation_id = $1
       AND sender_id <> $2
       AND read_at IS NULL`,
    [conversationId, userId]
  );

  const marked = rowCount || 0;
  if (marked > 0) {
    // Broadcast the new unread total so the navbar badge updates in real time
    // without the user needing to wait for the next poll cycle.
    void getUnreadConversationCount(userId)
      .then((count) => publishToUser(userId, "unread:changed", { count }))
      .catch(() => {
        /* best-effort */
      });
  }

  return { marked };
}

export async function getUnreadConversationCount(userId: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT m.conversation_id) AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.read_at IS NULL
       AND m.sender_id <> $1
       AND (c.user_a_id = $1 OR c.user_b_id = $1)`,
    [userId]
  );
  return parseInt(rows[0]?.count || "0", 10);
}

export async function searchUsers(userId: number, queryStr: string): Promise<Array<{ id: number; name: string }>> {
  const trimmed = (queryStr || "").trim();
  if (trimmed.length < SEARCH_MIN_LENGTH) {
    return [];
  }
  // Match by exact email (case-insensitive) OR partial name (anti-enumeration: only return name).
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  if (isEmail) {
    const { rows } = await query<{ id: number; name: string }>(
      `SELECT id, name FROM users
       WHERE LOWER(email) = LOWER($1)
         AND id <> $2
         AND password_hash <> 'DELETED'
       LIMIT 1`,
      [trimmed, userId]
    );
    return rows;
  }

  const namePattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
  const { rows } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM users
     WHERE name ILIKE $1
       AND id <> $2
       AND password_hash <> 'DELETED'
     ORDER BY name ASC
     LIMIT $3`,
    [namePattern, userId, SEARCH_MAX_RESULTS]
  );
  return rows;
}

export async function anonymizeUserMessages(userId: number, client?: { query: typeof query }): Promise<void> {
  const exec = client?.query || query;
  await exec(
    `UPDATE messages SET content = '[mensagem removida por solicitação LGPD]'
     WHERE sender_id = $1`,
    [userId]
  );
}
