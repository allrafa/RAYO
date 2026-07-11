import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import { query } from "../../db/index.js";
import { getVapidPublicKey, isPushConfigured } from "../../lib/push.js";

// Web Push (UX_PLAN.md estrutural) — inscrição de dispositivos.
// GET  /api/push/public-key   → chave pública VAPID (ou enabled:false)
// POST /api/push/subscribe    → upsert da subscription do navegador
// DELETE /api/push/subscribe  → remove por endpoint (logout/desativar)
const router = Router();

router.get("/public-key", (_req: Request, res: Response) => {
  success(res, {
    enabled: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
});

router.post("/subscribe", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      sendError(res, "Subscription inválida", "INVALID_SUBSCRIPTION", 400);
      return;
    }
    // Endpoint é único por dispositivo; se trocar de dono (outro login no
    // mesmo navegador), o upsert reatribui pro usuário atual.
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth`,
      [req.user!.id, endpoint, p256dh, auth],
    );
    success(res, { subscribed: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/subscribe", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endpoint = typeof (req.body as { endpoint?: unknown })?.endpoint === "string"
      ? (req.body as { endpoint: string }).endpoint
      : "";
    if (!endpoint) {
      sendError(res, "endpoint é obrigatório", "INVALID_SUBSCRIPTION", 400);
      return;
    }
    await query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, req.user!.id],
    );
    success(res, { subscribed: false });
  } catch (err) {
    next(err);
  }
});

export default router;
