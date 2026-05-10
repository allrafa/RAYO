import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { trackEvent } from "../analytics/service.js";
import { publishToUser, getActiveSubscriberCount } from "./events.js";
import { createNotification } from "../notifications/service.js";
import { sendNewMessageEmail } from "../../lib/email.js";
import { logger } from "../../utils/logger.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";

const OFFLINE_THRESHOLD_MIN = 10;
const EMAIL_COOLDOWN_MIN = 60;
const APP_URL =
  process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

const MAX_MESSAGE_LENGTH = 4000;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_RESULTS = 10;

export type MessageKind = "text" | "image" | "audio";
const ALLOWED_KINDS: ReadonlySet<MessageKind> = new Set(["text", "image", "audio"]);

// Task #148 — set fechado de reações em mensagens de DM. Espelha o set
// de Comunidade (Task #122) e o `REACTION_EMOJIS` do frontend
// (src/components/EmojiReactionPicker.tsx). Qualquer emoji fora vira 400.
export const ALLOWED_DM_REACTION_EMOJIS = ["❤️", "😂", "🙏", "💡", "🔥", "👏"] as const;
export type DmReactionEmoji = (typeof ALLOWED_DM_REACTION_EMOJIS)[number];
const DM_REACTION_SET = new Set<string>(ALLOWED_DM_REACTION_EMOJIS);

function assertValidDmReactionEmoji(emoji: unknown): asserts emoji is DmReactionEmoji {
  if (typeof emoji !== "string" || !DM_REACTION_SET.has(emoji)) {
    throw new AppError("Emoji de reação inválido", "INVALID_REACTION_EMOJI", 400);
  }
}

export interface MessageReactionAggregate {
  emoji: string;
  count: number;
}

// Agrega reações em batch para uma lista de message_ids.
async function aggregateMessageReactions(
  messageIds: number[],
): Promise<Map<number, MessageReactionAggregate[]>> {
  const out = new Map<number, MessageReactionAggregate[]>();
  if (messageIds.length === 0) return out;
  const { rows } = await query<{ mid: number; emoji: string; cnt: number }>(
    `SELECT message_id AS mid, emoji, COUNT(*)::int AS cnt
       FROM message_reactions
      WHERE message_id = ANY($1::int[])
      GROUP BY message_id, emoji
      ORDER BY cnt DESC, emoji ASC`,
    [messageIds],
  );
  for (const r of rows) {
    const arr = out.get(r.mid) || [];
    arr.push({ emoji: r.emoji, count: r.cnt });
    out.set(r.mid, arr);
  }
  return out;
}

async function userMessageReactionsFor(
  messageIds: number[],
  userId: number | undefined,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!userId || messageIds.length === 0) return out;
  const { rows } = await query<{ mid: number; emoji: string }>(
    `SELECT message_id AS mid, emoji FROM message_reactions
      WHERE user_id = $1 AND message_id = ANY($2::int[])`,
    [userId, messageIds],
  );
  for (const r of rows) out.set(r.mid, r.emoji);
  return out;
}

export interface ConversationItem {
  id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar_url: string | null;
  last_message_kind: MessageKind | null;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  last_message_created_at: string | null;
  last_message_meta: Record<string, unknown> | null;
  unread_count: number;
  archived_at: string | null;
}

export interface MessageItem {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  kind: MessageKind;
  content: string;
  attachment_url: string | null;
  attachment_meta: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  reactions: MessageReactionAggregate[];
  user_reaction: string | null;
}

interface ConversationRowDb {
  id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar_url: string | null;
  last_message_kind: MessageKind | null;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  last_message_created_at: string | null;
  last_message_meta: Record<string, unknown> | null;
  unread_count: number;
  archived_at: string | null;
}

interface MessageRowDb {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  kind: MessageKind;
  content: string;
  attachment_url: string | null;
  attachment_meta: Record<string, unknown> | null;
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

async function resolveMessageRow(
  row: MessageRowDb,
  reactions: MessageReactionAggregate[] = [],
  userReaction: string | null = null,
): Promise<MessageItem> {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    kind: row.kind,
    content: row.content,
    attachment_url: await resolveStoredMediaUrl(row.attachment_url),
    attachment_meta: row.attachment_meta,
    read_at: row.read_at,
    created_at: row.created_at,
    reactions,
    user_reaction: userReaction,
  };
}

async function resolveConversationRow(row: ConversationRowDb): Promise<ConversationItem> {
  return {
    ...row,
    other_user_avatar_url: await resolveStoredMediaUrl(row.other_user_avatar_url),
  };
}

// Lista conversas. Por padrão devolve só as não-excluídas e não-arquivadas
// do ponto de vista do usuário. Quando `scope === "archived"` retorna só as
// arquivadas (ainda não excluídas).
export async function listConversations(
  userId: number,
  scope: "active" | "archived" = "active",
): Promise<ConversationItem[]> {
  const whereScope =
    scope === "archived"
      ? `s.archived_at IS NOT NULL AND s.deleted_at IS NULL`
      : `s.deleted_at IS NULL AND s.archived_at IS NULL`;

  const { rows } = await query<ConversationRowDb>(
    `SELECT
       c.id,
       c.user_a_id,
       c.user_b_id,
       c.last_message_at,
       c.created_at,
       CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END AS other_user_id,
       u.name AS other_user_name,
       u.avatar_url AS other_user_avatar_url,
       lm.kind AS last_message_kind,
       lm.content AS last_message_content,
       lm.sender_id AS last_message_sender_id,
       lm.created_at AS last_message_created_at,
       lm.attachment_meta AS last_message_meta,
       COALESCE(uc.unread_count, 0)::int AS unread_count,
       s.archived_at
     FROM conversations c
     JOIN users u ON u.id = (CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END)
     LEFT JOIN conversation_user_state s
       ON s.conversation_id = c.id AND s.user_id = $1
     LEFT JOIN LATERAL (
       SELECT m.kind, m.content, m.sender_id, m.created_at, m.attachment_meta
       FROM messages m
       WHERE m.conversation_id = c.id
         AND (s.cleared_at IS NULL OR m.created_at > s.cleared_at)
       ORDER BY m.created_at DESC
       LIMIT 1
     ) lm ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM messages m
       WHERE m.conversation_id = c.id
         AND m.sender_id <> $1
         AND m.read_at IS NULL
         AND (s.cleared_at IS NULL OR m.created_at > s.cleared_at)
     ) uc ON true
     WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
       AND (${whereScope})
     ORDER BY c.last_message_at DESC`,
    [userId]
  );
  return Promise.all(rows.map(resolveConversationRow));
}

export async function getOrCreateConversation(
  userId: number,
  otherUserId: number,
): Promise<{ id: number; created: boolean; other_user_id: number; other_user_name: string }> {
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

  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO conversations (user_a_id, user_b_id)
     VALUES ($1, $2)
     ON CONFLICT (user_a_id, user_b_id) DO NOTHING
     RETURNING id`,
    [aId, bId]
  );

  let convId: number;
  if (inserted.length > 0) {
    convId = inserted[0].id;
    trackEvent(userId, "conversation_started", { conversation_id: convId, other_user_id: otherUserId });
  } else {
    const { rows: existing } = await query<{ id: number }>(
      `SELECT id FROM conversations WHERE user_a_id = $1 AND user_b_id = $2`,
      [aId, bId]
    );
    if (existing.length === 0) {
      throw new AppError("Falha ao criar conversa", "CONVERSATION_CREATE_FAILED", 500);
    }
    convId = existing[0].id;
  }

  // Reabrir: se o usuário tinha excluído/arquivado essa conversa, reativa
  // o estado dele ao iniciar uma nova interação.
  await query(
    `INSERT INTO conversation_user_state (conversation_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (conversation_id, user_id) DO UPDATE
       SET archived_at = NULL, deleted_at = NULL`,
    [convId, userId]
  );

  return {
    id: convId,
    created: inserted.length > 0,
    other_user_id: targetRows[0].id,
    other_user_name: targetRows[0].name,
  };
}

export async function getMessages(
  conversationId: number,
  userId: number,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: MessageItem[]; total: number; page: number; limit: number; totalPages: number; other_user_id: number; other_user_name: string }> {
  const conv = await assertConversationMember(conversationId, userId);
  const otherUserId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

  const { rows: otherRows } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [otherUserId]
  );

  // Corte de "limpar histórico" (após excluir o lado dele e voltar a abrir).
  const { rows: stateRows } = await query<{ cleared_at: string | null }>(
    `SELECT cleared_at FROM conversation_user_state
      WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  const clearedAt = stateRows[0]?.cleared_at ?? null;

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM messages
      WHERE conversation_id = $1
        AND ($2::timestamp IS NULL OR created_at > $2)`,
    [conversationId, clearedAt]
  );
  const total = parseInt(countRows[0].total, 10);

  const offset = (page - 1) * limit;

  const { rows } = await query<MessageRowDb>(
    `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name,
            m.kind, m.content, m.attachment_url, m.attachment_meta,
            m.read_at, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
       AND ($4::timestamp IS NULL OR m.created_at > $4)
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset, clearedAt]
  );

  const ordered = rows.reverse();
  const ids = ordered.map((r) => r.id);
  const reactionsMap = await aggregateMessageReactions(ids);
  const userReactionMap = await userMessageReactionsFor(ids, userId);
  const resolved = await Promise.all(
    ordered.map((r) =>
      resolveMessageRow(r, reactionsMap.get(r.id) || [], userReactionMap.get(r.id) || null),
    ),
  );

  return {
    messages: resolved,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    other_user_id: otherUserId,
    other_user_name: otherRows[0]?.name || "Usuário",
  };
}

export interface SendMessageInput {
  kind?: MessageKind;
  content?: string;
  attachmentUrl?: string | null; // referência canônica ("objstore://...")
  attachmentMeta?: Record<string, unknown> | null;
}

// Reabre a conversa do lado de quem ainda tem estado "excluído/arquivado",
// para que mensagens novas sempre apareçam para os dois participantes.
async function reopenConversation(conversationId: number, userId: number): Promise<void> {
  await query(
    `INSERT INTO conversation_user_state (conversation_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (conversation_id, user_id) DO UPDATE
       SET deleted_at = NULL, archived_at = NULL`,
    [conversationId, userId]
  );
}

export async function sendMessage(
  conversationId: number,
  userId: number,
  input: SendMessageInput,
): Promise<MessageItem> {
  const kind = (input.kind ?? "text") as MessageKind;
  if (!ALLOWED_KINDS.has(kind)) {
    throw new AppError("Tipo de mensagem inválido", "INVALID_MESSAGE_KIND", 400);
  }
  const rawContent = (input.content ?? "").trim();
  let content = rawContent;
  let attachmentUrl: string | null = input.attachmentUrl ?? null;
  let attachmentMeta: Record<string, unknown> | null = input.attachmentMeta ?? null;

  if (kind === "text") {
    if (!content) {
      throw new AppError("Conteúdo da mensagem é obrigatório", "EMPTY_MESSAGE", 400);
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(`Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres`, "MESSAGE_TOO_LONG", 400);
    }
    attachmentUrl = null;
    attachmentMeta = null;
  } else {
    if (!attachmentUrl) {
      throw new AppError("Anexo é obrigatório para esse tipo de mensagem", "ATTACHMENT_REQUIRED", 400);
    }
    // Anexo só pode ser referência canônica do object storage do servidor,
    // dentro do namespace de mensagens. Bloqueia injeção de URL externa
    // (phishing/abuso) e reuso de chaves de outros módulos (ex.: CMS).
    const expectedPrefix = `objstore://messages/${kind}/`;
    if (!attachmentUrl.startsWith(expectedPrefix)) {
      throw new AppError("Anexo inválido", "INVALID_ATTACHMENT_URL", 400);
    }
    // Defesa em profundidade: meta confiável é exigida e o mime tem que
    // bater com a allowlist do endpoint de upload.
    const mimeFromMeta = typeof attachmentMeta?.mime === "string" ? attachmentMeta.mime : "";
    if (!mimeFromMeta) {
      throw new AppError("Metadata do anexo é obrigatória", "ATTACHMENT_META_REQUIRED", 400);
    }
    const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const ALLOWED_AUDIO_MIMES = new Set([
      "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a",
    ]);
    if (kind === "image" && !ALLOWED_IMAGE_MIMES.has(mimeFromMeta)) {
      throw new AppError("Mime do anexo não corresponde ao tipo", "ATTACHMENT_MIME_MISMATCH", 400);
    }
    if (kind === "audio" && !ALLOWED_AUDIO_MIMES.has(mimeFromMeta)) {
      throw new AppError("Mime do anexo não corresponde ao tipo", "ATTACHMENT_MIME_MISMATCH", 400);
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(`Legenda excede ${MAX_MESSAGE_LENGTH} caracteres`, "MESSAGE_TOO_LONG", 400);
    }
    // Para mensagens de mídia, content guarda apenas legenda opcional.
  }

  const conv = await assertConversationMember(conversationId, userId);
  const recipientId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

  const { rows } = await query<MessageRowDb>(
    `INSERT INTO messages (conversation_id, sender_id, kind, content, attachment_url, attachment_meta)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, conversation_id, sender_id, kind, content, attachment_url, attachment_meta, read_at, created_at`,
    [conversationId, userId, kind, content, attachmentUrl, attachmentMeta]
  );

  await query(`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, [conversationId]);

  // Reabrir o lado do destinatário se ele tinha arquivado/excluído a conversa.
  await reopenConversation(conversationId, recipientId);

  const { rows: senderRows } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [userId]
  );
  const dbRow = rows[0];
  dbRow.sender_name = senderRows[0]?.name || "Usuário";
  const message = await resolveMessageRow(dbRow);

  trackEvent(userId, "message_sent", {
    conversation_id: conversationId,
    message_id: message.id,
    kind,
  });

  const eventPayload = { conversation_id: conversationId, message };
  publishToUser(userId, "message:new", eventPayload);
  if (recipientId !== userId) {
    publishToUser(recipientId, "message:new", eventPayload);
    void getUnreadConversationCount(recipientId)
      .then((count) => publishToUser(recipientId, "unread:changed", { count }))
      .catch(() => {});

    let preview: string;
    if (kind === "image") {
      preview = "📷 Foto";
    } else if (kind === "audio") {
      const dur = typeof attachmentMeta?.duration_sec === "number" ? attachmentMeta.duration_sec : null;
      const mm = dur != null ? Math.floor(dur / 60) : null;
      const ss = dur != null ? Math.floor(dur % 60) : null;
      preview = dur != null && mm != null && ss != null
        ? `🎤 Áudio (${mm}:${ss.toString().padStart(2, "0")})`
        : "🎤 Áudio";
    } else {
      preview = content;
    }
    void notifyRecipient({
      conversationId,
      recipientId,
      senderName: message.sender_name,
      preview,
      messageId: message.id,
    }).catch((err) => {
      logger.error("Messages", `notifyRecipient failed: ${err instanceof Error ? err.message : err}`);
    });
  }

  return message;
}

interface NotifyRecipientArgs {
  conversationId: number;
  recipientId: number;
  senderName: string;
  preview: string;
  messageId: number;
}

async function notifyRecipient(args: NotifyRecipientArgs): Promise<void> {
  const { conversationId, recipientId, senderName, preview, messageId } = args;
  const link = `/conversas/${conversationId}`;

  await createNotification({
    userId: recipientId,
    kind: "message",
    title: `Nova mensagem de ${senderName}`,
    body: preview.length > 160 ? `${preview.slice(0, 157)}…` : preview,
    link,
    payload: { conversation_id: conversationId, message_id: messageId, sender_name: senderName },
  });

  if (getActiveSubscriberCount(recipientId) > 0) return;
  const { rows } = await query<{ email: string; name: string; offline_min: string | null }>(
    `SELECT email, name,
            EXTRACT(EPOCH FROM (NOW() - COALESCE(last_active_at, created_at)))::numeric / 60 AS offline_min
     FROM users WHERE id = $1`,
    [recipientId],
  );
  const row = rows[0];
  if (!row) return;
  const offlineMin = row.offline_min == null ? Number.POSITIVE_INFINITY : parseFloat(row.offline_min);
  if (offlineMin < OFFLINE_THRESHOLD_MIN) return;

  const { rowCount } = await query(
    `INSERT INTO dm_email_sent (conversation_id, recipient_id, last_sent_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (conversation_id) DO UPDATE
       SET last_sent_at = NOW(), recipient_id = EXCLUDED.recipient_id
       WHERE dm_email_sent.last_sent_at < NOW() - INTERVAL '${EMAIL_COOLDOWN_MIN} minutes'`,
    [conversationId, recipientId],
  );
  if (!rowCount) {
    logger.info("Messages", `email cooldown active for conversation ${conversationId}; skip email`);
    return;
  }

  const conversationLink = `${APP_URL.replace(/\/+$/, "")}${link}`;
  logger.info("Messages", `queued email notification for offline recipient ${recipientId} (conv ${conversationId})`);
  void sendNewMessageEmail(row.email, row.name, senderName, preview, conversationLink).catch(() => {});
}

export async function markConversationRead(conversationId: number, userId: number): Promise<{ marked: number }> {
  const conv = await assertConversationMember(conversationId, userId);

  // Respeita o corte cleared_at do leitor: mensagens antes do corte estão
  // escondidas para ele, então não devem virar "lido" e nem disparar
  // recibo para o remetente original (Task #79 review).
  const { rows: stateRows } = await query<{ cleared_at: string | null }>(
    `SELECT cleared_at FROM conversation_user_state
      WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  const clearedAt = stateRows[0]?.cleared_at ?? null;

  const { rows: updated, rowCount } = await query<{ id: number; read_at: string }>(
    `UPDATE messages SET read_at = NOW()
     WHERE conversation_id = $1
       AND sender_id <> $2
       AND read_at IS NULL
       AND ($3::timestamp IS NULL OR created_at > $3)
     RETURNING id, read_at`,
    [conversationId, userId, clearedAt]
  );

  const marked = rowCount || 0;
  if (marked > 0) {
    void getUnreadConversationCount(userId)
      .then((count) => publishToUser(userId, "unread:changed", { count }))
      .catch(() => {});

    const otherUserId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;
    if (otherUserId !== userId) {
      const readAt = updated[0]?.read_at ?? new Date().toISOString();
      const messageIds = updated.map((r) => r.id);
      publishToUser(otherUserId, "message:read", {
        conversation_id: conversationId,
        reader_id: userId,
        message_ids: messageIds,
        read_at: readAt,
      });
    }
  }

  return { marked };
}

export async function getUnreadConversationCount(userId: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT m.conversation_id) AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     LEFT JOIN conversation_user_state s
       ON s.conversation_id = c.id AND s.user_id = $1
     WHERE m.read_at IS NULL
       AND m.sender_id <> $1
       AND (c.user_a_id = $1 OR c.user_b_id = $1)
       AND (s.deleted_at IS NULL)
       AND (s.cleared_at IS NULL OR m.created_at > s.cleared_at)`,
    [userId]
  );
  return parseInt(rows[0]?.count || "0", 10);
}

// ─────────────────────────── Archive / Delete ───────────────────────────

export async function setConversationArchived(
  conversationId: number,
  userId: number,
  archived: boolean,
): Promise<void> {
  await assertConversationMember(conversationId, userId);
  await query(
    `INSERT INTO conversation_user_state (conversation_id, user_id, archived_at)
     VALUES ($1, $2, ${archived ? "NOW()" : "NULL"})
     ON CONFLICT (conversation_id, user_id) DO UPDATE
       SET archived_at = ${archived ? "NOW()" : "NULL"}`,
    [conversationId, userId]
  );
  trackEvent(userId, archived ? "conversation_archived" : "conversation_unarchived", {
    conversation_id: conversationId,
  });
}

// "Excluir" do ponto de vista de um participante: marca deleted_at e
// cleared_at = NOW(), de modo que a conversa some da listagem dele e o
// histórico antigo seja escondido. Se a outra pessoa enviar uma mensagem
// nova, a conversa volta a aparecer (sem o histórico anterior ao corte).
export async function deleteConversationForUser(
  conversationId: number,
  userId: number,
): Promise<void> {
  await assertConversationMember(conversationId, userId);
  await query(
    `INSERT INTO conversation_user_state (conversation_id, user_id, deleted_at, cleared_at, archived_at)
     VALUES ($1, $2, NOW(), NOW(), NULL)
     ON CONFLICT (conversation_id, user_id) DO UPDATE
       SET deleted_at = NOW(), cleared_at = NOW(), archived_at = NULL`,
    [conversationId, userId]
  );
  trackEvent(userId, "conversation_deleted", { conversation_id: conversationId });
  void getUnreadConversationCount(userId)
    .then((count) => publishToUser(userId, "unread:changed", { count }))
    .catch(() => {});
}

// ─────────────────────────── Search ───────────────────────────

export async function searchUsers(userId: number, queryStr: string): Promise<Array<{ id: number; name: string; avatar_url: string | null }>> {
  const trimmed = (queryStr || "").trim();
  if (trimmed.length < SEARCH_MIN_LENGTH) return [];
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  const rowsRaw = await (async () => {
    if (isEmail) {
      const { rows } = await query<{ id: number; name: string; avatar_url: string | null }>(
        `SELECT id, name, avatar_url FROM users
         WHERE LOWER(email) = LOWER($1)
           AND id <> $2
           AND password_hash <> 'DELETED'
         LIMIT 1`,
        [trimmed, userId]
      );
      return rows;
    }
    const namePattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    const { rows } = await query<{ id: number; name: string; avatar_url: string | null }>(
      `SELECT id, name, avatar_url FROM users
       WHERE name ILIKE $1
         AND id <> $2
         AND password_hash <> 'DELETED'
       ORDER BY name ASC
       LIMIT $3`,
      [namePattern, userId, SEARCH_MAX_RESULTS]
    );
    return rows;
  })();

  return Promise.all(
    rowsRaw.map(async (r) => ({
      id: r.id,
      name: r.name,
      avatar_url: await resolveStoredMediaUrl(r.avatar_url),
    }))
  );
}

// ─────────────────────────── Reactions (Task #148) ───────────────────────────

interface MessageReactionResult {
  reactions: MessageReactionAggregate[];
  user_reaction: string | null;
}

// Carrega a mensagem + valida que o userId é membro da conversa.
// Retorna o conversation_id e o other participant para o fan-out SSE.
async function loadMessageForReaction(
  messageId: number,
  userId: number,
): Promise<{ conversationId: number; otherUserId: number }> {
  const { rows } = await query<{ conversation_id: number; user_a_id: number; user_b_id: number }>(
    `SELECT m.conversation_id, c.user_a_id, c.user_b_id
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = $1`,
    [messageId],
  );
  if (rows.length === 0) {
    throw new AppError("Mensagem não encontrada", "MESSAGE_NOT_FOUND", 404);
  }
  const row = rows[0];
  if (row.user_a_id !== userId && row.user_b_id !== userId) {
    throw new AppError("Acesso negado", "FORBIDDEN", 403);
  }
  return {
    conversationId: row.conversation_id,
    otherUserId: row.user_a_id === userId ? row.user_b_id : row.user_a_id,
  };
}

function publishReactionUpdate(
  conversationId: number,
  messageId: number,
  reactions: MessageReactionAggregate[],
  selfId: number,
  otherId: number,
): void {
  const payload = {
    conversation_id: conversationId,
    message_id: messageId,
    reactions,
  };
  publishToUser(selfId, "message:reaction", payload);
  if (otherId !== selfId) publishToUser(otherId, "message:reaction", payload);
}

// POST: aplica/troca/remove (toggle) a reação do usuário na mensagem.
// Mesma semântica do toggle de Comunidade (Task #122): se já existe e é o
// mesmo emoji → remove; se já existe e é diferente → troca; se não existe → cria.
export async function toggleMessageReaction(
  messageId: number,
  userId: number,
  emoji: string,
): Promise<MessageReactionResult> {
  assertValidDmReactionEmoji(emoji);
  const { conversationId, otherUserId } = await loadMessageForReaction(messageId, userId);

  const { rows: existing } = await query<{ emoji: string }>(
    `SELECT emoji FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId],
  );

  let userReaction: string | null = null;
  if (existing.length === 0) {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji`,
      [messageId, userId, emoji],
    );
    userReaction = emoji;
  } else if (existing[0].emoji === emoji) {
    await query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId],
    );
    userReaction = null;
  } else {
    await query(
      `UPDATE message_reactions SET emoji = $3 WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId, emoji],
    );
    userReaction = emoji;
  }

  const reactionsMap = await aggregateMessageReactions([messageId]);
  const reactions = reactionsMap.get(messageId) || [];

  publishReactionUpdate(conversationId, messageId, reactions, userId, otherUserId);

  return { reactions, user_reaction: userReaction };
}

// DELETE: remove a reação do usuário na mensagem (idempotente).
export async function removeMessageReaction(
  messageId: number,
  userId: number,
): Promise<MessageReactionResult> {
  const { conversationId, otherUserId } = await loadMessageForReaction(messageId, userId);

  await query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId],
  );

  const reactionsMap = await aggregateMessageReactions([messageId]);
  const reactions = reactionsMap.get(messageId) || [];

  publishReactionUpdate(conversationId, messageId, reactions, userId, otherUserId);

  return { reactions, user_reaction: null };
}

export async function anonymizeUserMessages(userId: number, client?: { query: typeof query }): Promise<void> {
  const exec = client?.query || query;
  await exec(
    `UPDATE messages SET content = '[mensagem removida por solicitação LGPD]',
            kind = 'text', attachment_url = NULL, attachment_meta = NULL
     WHERE sender_id = $1`,
    [userId]
  );
}
