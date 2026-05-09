import { query } from "../../db/index.js";
import { publishToUser } from "../messages/events.js";

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
