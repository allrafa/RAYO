import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  BillingError,
  listTrails,
  getTrailBySlug,
  createCheckoutSession,
  createBillingPortalSession,
  listUserSubscriptions,
} from "./service.js";

export const trailsRouter = Router();
export const billingRouter = Router();

// Lista pública de trilhas — visitante anônimo vê preços.
trailsRouter.get("/", async (req, res, next) => {
  try {
    const trails = await listTrails(req.user?.id);
    success(res, { trails });
  } catch (err) {
    next(err);
  }
});

trailsRouter.get("/:slug", async (req, res, next) => {
  try {
    const trail = await getTrailBySlug(req.params.slug, req.user?.id);
    if (!trail) {
      sendError(res, "Trilha não encontrada", "TRAIL_NOT_FOUND", 404);
      return;
    }
    success(res, { trail });
  } catch (err) {
    next(err);
  }
});

// Checkout — exige auth e tem rate-limit duro (5/h).
const checkoutLimiter = rateLimiter(5, 60 * 60 * 1000, { keyByUser: true });
trailsRouter.post("/:slug/checkout", requireAuth, checkoutLimiter, async (req, res, next) => {
  try {
    const interval = String(req.body?.interval || "month") as "month" | "year";
    if (interval !== "month" && interval !== "year") {
      sendError(res, "Interval inválido (use month|year)", "INVALID_INTERVAL", 400);
      return;
    }
    const origin = (req.headers.origin as string) || `https://${req.get("host")}`;
    const result = await createCheckoutSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userName: req.user!.name ?? null,
      trailSlug: req.params.slug,
      interval,
      successUrl: `${origin}/trilhas/sucesso?slug=${encodeURIComponent(req.params.slug)}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/trilhas/${encodeURIComponent(req.params.slug)}`,
    });
    success(res, result);
  } catch (err) {
    if (err instanceof BillingError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

billingRouter.post("/portal", requireAuth, async (req, res, next) => {
  try {
    const origin = (req.headers.origin as string) || `https://${req.get("host")}`;
    const returnUrl = String(req.body?.return_url || `${origin}/perfil`);
    const result = await createBillingPortalSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userName: req.user!.name ?? null,
      returnUrl,
    });
    success(res, result);
  } catch (err) {
    if (err instanceof BillingError) {
      sendError(res, err.message, err.code, err.statusCode);
      return;
    }
    next(err);
  }
});

billingRouter.get("/subscriptions", requireAuth, async (req, res, next) => {
  try {
    const subscriptions = await listUserSubscriptions(req.user!.id);
    success(res, { subscriptions });
  } catch (err) {
    next(err);
  }
});
