import { query } from "../../db/index.js";
import { publishToUser } from "../messages/events.js";
import { sendPushToUser } from "../../lib/push.js";

export interface NotificationRow {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface CreateNotificationInput {
  userId: number;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  payload?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRow> {
  const { rows } = await query<NotificationRow>(
    `INSERT INTO notifications (user_id, kind, title, body, link, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, kind, title, body, link, payload, read_at, created_at`,
    [
      input.userId,
      input.kind,
      input.title,
      input.body ?? null,
      input.link ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  const notif = rows[0];
  // Real-time push so the bell can update without waiting for the next poll.
  publishToUser(input.userId, "notification:new", notif);
  // Web Push (fire-and-forget): faz o celular tocar mesmo com o app fechado.
  // No-op quando VAPID não está configurado.
  void sendPushToUser(input.userId, {
    title: notif.title,
    body: notif.body,
    link: notif.link,
  });
  // Also broadcast new unread count so the badge updates atomically.
  void getUnreadCount(input.userId)
    .then((unread) => publishToUser(input.userId, "notification:unread", { unread }))
    .catch(() => {
      /* best-effort */
    });
  return notif;
}

export async function listNotifications(
  userId: number,
  page: number = 1,
  limit: number = 20,
): Promise<{ notifications: NotificationRow[]; total: number; unread: number; page: number; limit: number }> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const offset = (safePage - 1) * safeLimit;

  const { rows } = await query<NotificationRow>(
    `SELECT id, kind, title, body, link, payload, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, offset],
  );

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM notifications WHERE user_id = $1`,
    [userId],
  );
  const total = parseInt(countRows[0]?.total ?? "0", 10);
  const unread = await getUnreadCount(userId);

  return { notifications: rows, total, unread, page: safePage, limit: safeLimit };
}

export async function getUnreadCount(userId: number): Promise<number> {
  const { rows } = await query<{ unread: string }>(
    `SELECT COUNT(*)::text AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return parseInt(rows[0]?.unread ?? "0", 10);
}

// Task #129 — kinds que somam pro badge da seção "Comunidade" (inclui
// turmas). "message" fica fora porque é contado pelo badge de Mensagens
// (via /api/messages/unread-count). Mantenha a lista alinhada com os
// `createNotification({ kind })` espalhados pelos features.
export const COMMUNITY_NOTIFICATION_KINDS = [
  "class_post",
  "class_interest",
  "post_moderated",
  // UX_PLAN.md J2 — loop social: interações no seu conteúdo.
  "post_comment",
  "comment_reply",
  "post_reaction",
  "comment_reaction",
] as const;

export interface UnreadBySection {
  messages: number;
  community: number;
}

// Devolve unread agregado por seção da nav. Mensagens vêm de
// `conversations`/`messages` (mesma fonte que o desktop sidebar usa via
// /api/messages/unread-count) — ler aqui evita um round-trip extra do
// cliente. Community vem das notifications dos kinds acima.
export async function getUnreadBySection(userId: number): Promise<UnreadBySection> {
  const { rows: msgRows } = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT m.conversation_id)::text AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       LEFT JOIN conversation_user_state s
         ON s.conversation_id = c.id AND s.user_id = $1
      WHERE m.sender_id <> $1
        AND m.read_at IS NULL
        AND (c.user_a_id = $1 OR c.user_b_id = $1)
        AND (s.deleted_at IS NULL)
        AND (s.cleared_at IS NULL OR m.created_at > s.cleared_at)`,
    [userId],
  );
  const { rows: comRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM notifications
      WHERE user_id = $1
        AND read_at IS NULL
        AND kind = ANY($2::text[])`,
    [userId, COMMUNITY_NOTIFICATION_KINDS as unknown as string[]],
  );
  return {
    messages: parseInt(msgRows[0]?.count ?? "0", 10),
    community: parseInt(comRows[0]?.count ?? "0", 10),
  };
}

export async function markRead(notificationId: number, userId: number): Promise<{ marked: boolean }> {
  const { rowCount } = await query(
    `UPDATE notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId],
  );
  const marked = (rowCount || 0) > 0;
  if (marked) {
    void getUnreadCount(userId)
      .then((unread) => publishToUser(userId, "notification:unread", { unread }))
      .catch(() => {
        /* best-effort */
      });
  }
  return { marked };
}

// Task #129 — marcar como lidas todas as notifications da seção
// Comunidade quando o usuário entra na aba (decremento on-view do badge).
// Mantemos a granularidade por kind pra não zerar mensagens (que são
// gerenciadas pelo fluxo de DM, não pelo bell).
export async function markCommunityRead(userId: number): Promise<{ marked: number }> {
  const { rowCount } = await query(
    `UPDATE notifications SET read_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL AND kind = ANY($2::text[])`,
    [userId, COMMUNITY_NOTIFICATION_KINDS as unknown as string[]],
  );
  const marked = rowCount || 0;
  if (marked > 0) {
    void getUnreadCount(userId)
      .then((unread) => publishToUser(userId, "notification:unread", { unread }))
      .catch(() => {
        /* best-effort */
      });
  }
  return { marked };
}

export async function markAllRead(userId: number): Promise<{ marked: number }> {
  const { rowCount } = await query(
    `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  const marked = rowCount || 0;
  if (marked > 0) {
    publishToUser(userId, "notification:unread", { unread: 0 });
  }
  return { marked };
}
