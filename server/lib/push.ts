import { query } from "../db/index.js";
import { logger } from "../utils/logger.js";

// Web Push (UX_PLAN.md estrutural). Gate por env: sem as chaves VAPID o
// push fica desligado de forma limpa (isPushConfigured() = false, envio é
// no-op). Gere as chaves com `npx web-push generate-vapid-keys` e defina:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:contato@...)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@rayo.app.br";

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

let webpush: typeof import("web-push") | null = null;
async function getWebPush() {
  if (!isPushConfigured()) return null;
  if (!webpush) {
    const mod = await import("web-push");
    webpush = mod.default ?? mod;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
  return webpush;
}

export interface PushPayload {
  title: string;
  body?: string | null;
  link?: string | null;
}

// Envia para todos os dispositivos inscritos do usuário. Fire-and-forget
// por design: falha de push nunca pode quebrar quem chamou. Subscriptions
// mortas (404/410 do provedor) são removidas na hora.
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    const wp = await getWebPush();
    if (!wp) return;
    const { rows } = await query<{ id: number; endpoint: string; p256dh: string; auth: string }>(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );
    if (rows.length === 0) return;
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      link: payload.link ?? "/",
    });
    await Promise.all(
      rows.map(async (sub) => {
        try {
          await wp.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]).catch(() => {});
          } else {
            logger.warn("Push", `Falha ao enviar push (user ${userId}): ${(err as Error).message}`);
          }
        }
      }),
    );
  } catch (err) {
    logger.warn("Push", `sendPushToUser falhou (user ${userId}): ${(err as Error).message}`);
  }
}
