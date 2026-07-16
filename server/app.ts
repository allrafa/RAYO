// Task #234 — Factory pura que monta o app Express usado em produção e em
// testes de integração. NÃO faz I/O de boot (initializeSchema, bootstrap
// admins, billing sync), NÃO sobe http listener, NÃO anexa Socket.IO, e
// NÃO monta middleware dependente do boot (sitemap dinâmico, robots,
// blog feed, Vite/static, errorHandler). Esses concerns continuam em
// `server/index.ts:start()` — o que muda é só ter um único ponto de
// verdade pro wiring das rotas REST, reaproveitado por
// `tests/integration/helpers/app.ts`.
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import { securityMiddleware, corsMiddleware, rateLimiter } from "./middleware/security.js";
import { logger } from "./utils/logger.js";
import { error as sendError } from "./utils/response.js";
import healthRoutes from "./features/health/routes.js";
import authRoutes from "./features/auth/routes.js";
import { validateOAuthEnvAtBoot } from "./features/auth/oauth.js";
import userRoutes from "./features/users/routes.js";
import gamificationRoutes from "./features/gamification/routes.js";
import academiaRoutes from "./features/academia/routes.js";
import communityRoutes from "./features/community/routes.js";
import communityAdminRoutes from "./features/community/adminRoutes.js";
import dashboardRoutes from "./features/dashboard/routes.js";
import homeRoutes from "./features/home/routes.js";
import searchRoutes from "./features/search/routes.js";
import lgpdRoutes from "./features/lgpd/routes.js";
import messagesRoutes from "./features/messages/routes.js";
import notificationsRoutes from "./features/notifications/routes.js";
import pushRoutes from "./features/push/routes.js";
import aliancaRoutes from "./features/alianca/routes.js";
import momentoRoutes from "./features/momento/routes.js";
import adminRoutes from "./features/admin/routes.js";
import { adminCmsRouter, publicCmsRouter } from "./features/cms/routes.js";
import { adminHomeFeedRouter, publicHomeFeedRouter } from "./features/home-feed/routes.js";
import bundlesRoutes from "./features/bundles/routes.js";
import adminBundlesRoutes from "./features/bundles/adminRoutes.js";
import booksRouter from "./features/books/routes.js";
import { UPLOAD_ROOT } from "./features/cms/upload.js";
import {
  signLegacyUploadUrlIfPresent,
  streamLocalUpload,
} from "./lib/objectStorageBridge.js";
import { optionalAuth } from "./middleware/auth.js";
import { bunnyWebhookRouter, adminBunnyRouter } from "./features/bunny/routes.js";
import { logBunnyBootStatus } from "./lib/bunnyStream.js";
import { processStripeWebhook } from "./features/billing/webhookHandlers.js";
import { trailsRouter, billingRouter } from "./features/billing/routes.js";
import { adminTrailsRouter } from "./features/billing/adminRoutes.js";
import { blogRouter, contatoRouter } from "./features/marketing/routes.js";

export interface CreateAppOptions {
  /** Quando false, pula `validateOAuthEnvAtBoot()` (logs verbosos em test). Default: true. */
  validateAuthEnv?: boolean;
  /** Quando false, pula `logBunnyBootStatus()` (logs verbosos em test). Default: true. */
  logBunnyStatus?: boolean;
}

export function createApp(opts: CreateAppOptions = {}): Express {
  const app = express();

  // Task #51 — atrás do proxy Replit/deploy. Confiar em 1 hop dá `req.ip`
  // real sem permitir spoof de X-Forwarded-For por upstream.
  app.set("trust proxy", 1);

  app.use(securityMiddleware);
  app.use(cookieParser());

  // Task #86 — Webhook do Bunny precisa do RAW body pra validar HMAC.
  // Tem que vir ANTES do express.json global.
  app.use("/api/webhooks/bunny", rateLimiter(300, 15 * 60 * 1000), bunnyWebhookRouter);

  // Task #130 — Webhook do Stripe também precisa do raw body.
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      const sig = Array.isArray(signature) ? signature[0] : signature;
      try {
        await processStripeWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (err) {
        logger.error("StripeWebhook", `Webhook error: ${(err as Error).message}`);
        res.status(400).json({ error: (err as Error).message });
      }
    },
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Task #69 + #72 — Passport só pra OAuth. `session: false` nas estratégias
  // então sem express-session — sessão real continua sendo cookie `session_token`.
  app.use(passport.initialize());

  if (opts.validateAuthEnv ?? true) {
    validateOAuthEnvAtBoot();
  }

  app.use("/api", corsMiddleware);
  app.use("/api/health", healthRoutes);

  // Task #51 — limiters revisados (ver server/index.ts comentário original).
  const SENSITIVE_AUTH_PATHS = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/send-code",
    "/verify-code",
  ]);
  const isSensitiveAuthPost = (req: import("express").Request) =>
    req.method === "POST" && SENSITIVE_AUTH_PATHS.has(req.path);
  const isAuthMe = (req: import("express").Request) =>
    req.method === "GET" && req.path === "/me";
  const isOAuthPath = (req: import("express").Request) =>
    req.path === "/providers" ||
    req.path === "/google" ||
    req.path === "/google/callback" ||
    req.path === "/facebook" ||
    req.path === "/facebook/callback";
  const isVerifyEmailPath = (req: import("express").Request) =>
    req.method === "GET" &&
    (req.path === "/verify-email" || req.path === "/verification-status");
  app.use(
    "/api/auth",
    rateLimiter(20, 15 * 60 * 1000, {
      skip: (req) => !isSensitiveAuthPost(req),
    }),
    optionalAuth,
    rateLimiter(60, 15 * 60 * 1000, {
      keyByUser: true,
      skip: (req) => isSensitiveAuthPost(req) || isAuthMe(req) || isOAuthPath(req) || isVerifyEmailPath(req),
    }),
    authRoutes,
  );
  app.use("/api/users", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), userRoutes);
  app.use("/api/gamification", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), gamificationRoutes);
  app.use("/api/courses", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), academiaRoutes);
  app.use("/api/turmas", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), academiaRoutes);
  app.use("/api/community", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), communityRoutes);
  app.use("/api/dashboard", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), dashboardRoutes);
  app.use("/api/home", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), homeRoutes);
  app.use("/api/search", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), searchRoutes);
  app.use("/api/lgpd", optionalAuth, rateLimiter(20, 15 * 60 * 1000, { keyByUser: true }), lgpdRoutes);
  app.use("/api/messages", optionalAuth, rateLimiter(600, 15 * 60 * 1000, { keyByUser: true }), messagesRoutes);
  app.use("/api/notifications", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), notificationsRoutes);
  app.use("/api/push", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), pushRoutes);
  app.use("/api/alianca", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), aliancaRoutes);
  app.use("/api/momento", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), momentoRoutes);
  app.use("/api/admin", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), adminRoutes);
  app.use("/api/admin/community", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), communityAdminRoutes);
  app.use("/api/admin/cms", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), adminCmsRouter);
  app.use("/api/content", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), publicCmsRouter);
  app.use("/api/admin/home-feed", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), adminHomeFeedRouter);
  app.use("/api/home-feed", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), publicHomeFeedRouter);
  app.use("/api/bundles", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), bundlesRoutes);
  // Task #264 — Admin das trilhas curadas (marketplace_bundles). Montado antes
  // de nenhum catch-all /api/admin específico; o requireRole interno gateia.
  app.use("/api/admin/marketplace-bundles", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), adminBundlesRoutes);

  // Task #252 — progresso de leitura de livros (PDF reader MVP).
  app.use("/api/books", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), booksRouter);

  // Task #130 — Trilhas pagas (Stripe).
  app.use("/api/trails", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), trailsRouter);
  app.use("/api/billing", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), billingRouter);
  app.use("/api/admin/trails", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), adminTrailsRouter);

  // Task #70 — Site público (marketing).
  app.use("/api/blog", rateLimiter(180, 15 * 60 * 1000, { keyByUser: false }), blogRouter);
  app.use("/api/contato", contatoRouter);

  // Task #86 — Bunny Stream admin.
  app.use("/api/admin/bunny", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), adminBunnyRouter);

  if (opts.logBunnyStatus ?? true) {
    logBunnyBootStatus();
  }

  // Task #48 — `/uploads/*` apontando pro Object Storage.
  app.get("/uploads/*splat", async (req, res, next) => {
    try {
      const key = decodeURIComponent(req.path.replace(/^\/uploads\//, ""));
      if (!key || key.includes("..")) {
        res.status(404).end();
        return;
      }
      const signed = await signLegacyUploadUrlIfPresent(key);
      if (signed) {
        res.redirect(302, signed);
        return;
      }
      if (streamLocalUpload(key, UPLOAD_ROOT, res)) return;
      res.status(404).end();
    } catch (err) {
      next(err);
    }
  });

  // Task #111 — coletor de violações CSP.
  app.post(
    "/api/csp-report",
    express.json({
      type: ["application/csp-report", "application/reports+json", "application/json"],
      limit: "8kb",
    }),
    (req, res) => {
      try {
        const payload = req.body as
          | { "csp-report"?: Record<string, unknown> }
          | Array<{ body?: Record<string, unknown> }>
          | Record<string, unknown>;
        const reports = Array.isArray(payload)
          ? payload.map((p) => p.body || {})
          : [(payload as { "csp-report"?: Record<string, unknown> })?.["csp-report"] || payload || {}];
        for (const r of reports as Array<Record<string, unknown>>) {
          const summary = {
            doc: r["document-uri"] || r["documentURL"],
            blocked: r["blocked-uri"] || r["blockedURL"],
            directive: r["violated-directive"] || r["effectiveDirective"],
            source: r["source-file"] || r["sourceFile"],
            line: r["line-number"] || r["lineNumber"],
          };
          logger.warn("CSP", `report-only violation: ${JSON.stringify(summary)}`);
        }
      } catch {
        /* ignore malformed reports */
      }
      res.status(204).end();
    },
  );

  // Catch-all 404 pra rotas /api/* não casadas.
  app.all("/api/{*path}", (req, res) => {
    sendError(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
  });

  return app;
}
