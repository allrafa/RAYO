import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import { securityMiddleware, corsMiddleware, rateLimiter } from "./middleware/security.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeSchema } from "./db/schema.js";
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
import adminRoutes from "./features/admin/routes.js";
import { bootstrapAdminsFromEnv } from "./features/admin/bootstrap.js";
import { adminCmsRouter, publicCmsRouter } from "./features/cms/routes.js";
import { adminHomeFeedRouter, publicHomeFeedRouter } from "./features/home-feed/routes.js";
import bundlesRoutes from "./features/bundles/routes.js";
import { UPLOAD_ROOT } from "./features/cms/upload.js";
import {
  signLegacyUploadUrlIfPresent,
  streamLocalUpload,
  backfillLocalUploads,
} from "./lib/objectStorageBridge.js";
import { optionalAuth } from "./middleware/auth.js";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { applyPublicMeta, resolvePublicMeta } from "./features/seo/publicMeta.js";
import http from "http";
import { initRealtime } from "./realtime/io.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

if (!process.env.DATABASE_URL) {
  logger.error("Server", "DATABASE_URL environment variable is required.");
  process.exit(1);
}

// Task #51 — the app sits behind the Replit proxy (and any deploy proxy in
// production). Trust a single hop so `req.ip` reflects the real client
// without letting arbitrary upstream callers spoof X-Forwarded-For to evade
// the rate limiter.
app.set("trust proxy", 1);

app.use(securityMiddleware);
app.use(cookieParser());

// Task #86 — Webhook do Bunny precisa do RAW body pra validar HMAC, então
// é montado ANTES do express.json global (que consumiria/parseraria o
// body e quebraria a assinatura). O router interno usa `express.raw`
// próprio. NÃO mover pra baixo de express.json.
import { bunnyWebhookRouter as _bunnyWebhookRouterEarly } from "./features/bunny/routes.js";
app.use("/api/webhooks/bunny", rateLimiter(300, 15 * 60 * 1000), _bunnyWebhookRouterEarly);

// Task #130 — Webhook do Stripe TAMBÉM precisa do raw body pra validar
// assinatura. Mesmo padrão: montado ANTES do express.json. Lê os bytes
// brutos via express.raw e delega pro stripe-replit-sync que valida e
// sincroniza tudo.
import { processStripeWebhook } from "./features/billing/webhookHandlers.js";
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

// Task #69 + #72 — Passport só pra OAuth (Google/Facebook). Usamos `session: false`
// nas estratégias então não precisa de express-session — a sessão real
// continua sendo o cookie httpOnly `session_token` da própria app.
app.use(passport.initialize());

// Task #69 — valida no boot se Google OAuth está plenamente configurado.
// Se as credenciais existem mas GOOGLE_REDIRECT_URI faltar, loga erro
// explícito (em prod) ou info (em dev) para sinalizar misconfig.
validateOAuthEnvAtBoot();

app.use("/api", corsMiddleware);
app.use("/api/health", healthRoutes);
// Task #51 — limiters revisados:
//   * Cada limiter tem agora seu próprio bucket interno.
//   * Rotas autenticadas usam `keyByUser: true` (rodando `optionalAuth`
//     antes do limiter), então cada usuário tem seu próprio orçamento e
//     usuários atrás de proxy compartilhado não brigam pelo mesmo IP.
//   * `/api/auth/me` é chamado em todo boot/refresh e foi removido da
//     contagem para não estourar o orçamento de auth com refreshes.
//   * Endpoints de escrita sensíveis em `/api/auth` (login, register,
//     password reset, código de verificação) ganharam um sub-limiter
//     estrito que continua protegendo contra brute force.
//   * LGPD migrou para o prefixo dedicado `/api/lgpd` para não rodar seu
//     limiter apertado em cima de toda chamada `/api/users/*`.
// Endpoints autenticados como `/change-password` ficam DE FORA dessa lista:
// eles já têm sessão (req.user existe), então o limiter geral por usuário
// abaixo cobre o caso. A lista aqui é só para POSTs anônimos onde o brute-
// force é o vetor real.
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
// Task #69 — endpoints OAuth: /providers é polled pelo AuthPage e os
// /callback são one-shot do provider; nenhum é vetor de brute-force por
// senha. Ficam de fora do limiter geral pra não estourar o orçamento.
const isOAuthPath = (req: import("express").Request) =>
  req.path === "/providers" ||
  req.path === "/google" ||
  req.path === "/google/callback" ||
  req.path === "/facebook" ||
  req.path === "/facebook/callback";
// Task #207 — magic link de e-mail (GET, idempotente, token cripto-aleatório
// de 256 bits) e polling de status (GET, requireAuth + limiter próprio
// 120/15m no router). Ambos ficam fora do limiter geral de 60/15m porque
// o painel inline pode chamar /verification-status a cada 4s enquanto
// aberto e estouraria o orçamento global em poucos minutos.
const isVerifyEmailPath = (req: import("express").Request) =>
  req.method === "GET" &&
  (req.path === "/verify-email" || req.path === "/verification-status");
app.use(
  "/api/auth",
  // Strict per-IP limiter that ONLY applies to sensitive write endpoints
  // (login/register/password reset/code verification). This is the
  // brute-force guard. Intentionally keyed by IP — authenticated user
  // keying does not apply here because most of these endpoints are hit
  // before the user has a session.
  rateLimiter(20, 15 * 60 * 1000, {
    skip: (req) => !isSensitiveAuthPost(req),
  }),
  // Hydrate req.user (when a session cookie exists) so the next limiter
  // can bucket by user id instead of IP.
  optionalAuth,
  // General limiter for the rest of /api/auth (logout, etc). Skips both
  // the sensitive POSTs (already covered above) and GET /me, which is
  // called on every app boot/refresh and is not an abuse vector.
  rateLimiter(60, 15 * 60 * 1000, {
    keyByUser: true,
    skip: (req) => isSensitiveAuthPost(req) || isAuthMe(req) || isOAuthPath(req) || isVerifyEmailPath(req),
  }),
  authRoutes,
);
app.use("/api/users", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), userRoutes);
app.use("/api/gamification", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), gamificationRoutes);
app.use("/api/courses", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), academiaRoutes);
// Task #99 — alias `/api/turmas` aponta pros mesmos handlers (rename UX-only,
// tabela `courses` mantida no DB pra evitar drift de migração).
app.use("/api/turmas", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), academiaRoutes);
app.use("/api/community", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), communityRoutes);
app.use("/api/dashboard", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), dashboardRoutes);
app.use("/api/home", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), homeRoutes);
app.use("/api/search", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), searchRoutes);
app.use("/api/lgpd", optionalAuth, rateLimiter(20, 15 * 60 * 1000, { keyByUser: true }), lgpdRoutes);
// Higher cap because the DM UI polls (messages every 10s, conversations every 30s,
// unread-count every 20s); each authenticated user must comfortably fit a 15-min
// active session without hitting 429.
app.use("/api/messages", optionalAuth, rateLimiter(600, 15 * 60 * 1000, { keyByUser: true }), messagesRoutes);
app.use("/api/notifications", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), notificationsRoutes);
app.use("/api/admin", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), adminRoutes);
app.use("/api/admin/community", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), communityAdminRoutes);
app.use("/api/admin/cms", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), adminCmsRouter);
app.use("/api/content", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), publicCmsRouter);
app.use("/api/admin/home-feed", optionalAuth, rateLimiter(300, 15 * 60 * 1000, { keyByUser: true }), adminHomeFeedRouter);
app.use("/api/home-feed", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), publicHomeFeedRouter);
app.use("/api/bundles", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), bundlesRoutes);

// Task #130 — Trilhas pagas (Stripe). Catálogo público + checkout/portal
// autenticados; admin CRUD em /api/admin/trails.
import { trailsRouter, billingRouter } from "./features/billing/routes.js";
import { adminTrailsRouter } from "./features/billing/adminRoutes.js";
app.use("/api/trails", optionalAuth, rateLimiter(240, 15 * 60 * 1000, { keyByUser: true }), trailsRouter);
app.use("/api/billing", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), billingRouter);
app.use("/api/admin/trails", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), adminTrailsRouter);

// Task #70 — Site público (marketing). Endpoints sem auth: leitura do blog
// e formulário /contato. O rate-limit de /contato (3/h por IP) vive dentro
// do próprio router para não conflitar com leitura do blog.
import { blogRouter, contatoRouter } from "./features/marketing/routes.js";
app.use("/api/blog", rateLimiter(180, 15 * 60 * 1000, { keyByUser: false }), blogRouter);
app.use("/api/contato", contatoRouter);

// Task #86 — Bunny Stream admin (upload/status/delete). O webhook
// (`/api/webhooks/bunny`) é montado lá em cima ANTES do express.json
// pra preservar o raw body necessário pra HMAC.
import { adminBunnyRouter } from "./features/bunny/routes.js";
import { logBunnyBootStatus } from "./lib/bunnyStream.js";
app.use("/api/admin/bunny", optionalAuth, rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }), adminBunnyRouter);
logBunnyBootStatus();

// Task #48 — `/uploads/*` is now backed by Replit Object Storage. The
// URL contract is unchanged so `users.avatar_url` /
// `media_assets.public_url` rows keep resolving. Falls back to the old
// on-disk uploads/ tree for any file the boot-time backfill hasn't
// migrated yet (e.g. running locally with a fresh bucket).
app.get("/uploads/*splat", async (req, res, next) => {
  try {
    const key = decodeURIComponent(
      req.path.replace(/^\/uploads\//, ""),
    );
    if (!key || key.includes("..")) {
      res.status(404).end();
      return;
    }
    // Task #48 — prefer external signed URL: redirects clients to the
    // bucket directly so static assets are served via the storage CDN
    // rather than proxied through the app server.
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

// Task #111 — coletor de violações CSP (registrado em module scope ANTES
// do catch-all 404 abaixo). Aceita JSON legacy (`application/csp-report`)
// e a Reporting API moderna (`application/reports+json`). Loga apenas
// document-uri, blocked-uri, violated-directive, source-file e line —
// payloads completos podem inflar disk e vazar paths internos. Sem
// rate-limit por IP de propósito: reports legítimos vêm direto do
// browser de cada usuário; o `limit: 8kb` do body parser já protege
// contra abuso.
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

app.all("/api/{*path}", (req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
});

async function start() {
  try {
    logger.info("Server", "Initializing database schema...");
    await initializeSchema();
    logger.info("Server", "Database schema ready.");

    // Task #130 — Stripe billing schema (trails, trail_courses, subscriptions)
    // + setup do stripe-replit-sync (cria schema `stripe.*`, registra
    // managed webhook e roda backfill). Best-effort: se a connection
    // Stripe não estiver configurada (dev sem secrets), loga e segue.
    try {
      const { migrateBilling } = await import("./features/billing/migrate.js");
      await migrateBilling();
      const { runMigrations } = await import("stripe-replit-sync");
      await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
      const { getStripeSync } = await import("./stripeClient.js");
      const sync = await getStripeSync();
      const isProd = process.env.REPLIT_DEPLOYMENT === "1";
      const webhookBase = process.env.PUBLIC_SITE_URL
        || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : null);
      if (webhookBase) {
        await sync.findOrCreateManagedWebhook(`${webhookBase}/api/stripe/webhook`);
      }
      // syncBackfill traz produtos/preços/customers/subscriptions existentes
      // pra schema stripe.*. Não-bloqueante porque pode demorar em contas
      // grandes; no boot inicial roda em background.
      void sync.syncBackfill().catch((err: Error) => {
        logger.warn("Stripe", `syncBackfill failed: ${err.message}`);
      });
      logger.info("Stripe", `Billing initialized (${isProd ? "production" : "development"} mode)`);
    } catch (err) {
      logger.warn("Stripe", `Billing init skipped: ${(err as Error).message}`);
    }

    await bootstrapAdminsFromEnv();

    // Task #48 — fire-and-forget backfill of any pre-existing on-disk
    // uploads to object storage. Idempotent (skips files already
    // present), so safe to run on every boot. Non-blocking so a slow or
    // huge media tree doesn't delay the listen() call.
    void backfillLocalUploads(UPLOAD_ROOT);

    // SEO público: sitemap.xml e robots.txt. Precisam vir ANTES do
    // middleware do Vite/SPA pra não cair no fallback de index.html.
    // Domínio canônico configurável via env (default: rayo.app.br).
    const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://rayo.app.br").replace(/\/+$/, "");
    // Task #70 — sitemap inclui todas as páginas públicas marketing + posts
    // do blog (artigos publicados). Posts são lidos a quente do banco a cada
    // request; com cache HTTP de 1h o custo é insignificante.
    // Task #111 — `lastmod` para páginas marketing estáticas. Em ordem de
    // preferência: BUILD_TIME (env, geralmente injetada pelo CI/Replit
    // Deploy), depois mtime de package.json (proxy de "última build"),
    // depois "agora" (boot do processo). Garante que o sitemap reflita
    // mudanças reais ao invés de carimbar `today` em todo request.
    let MARKETING_LASTMOD: string;
    try {
      if (process.env.BUILD_TIME && !Number.isNaN(Date.parse(process.env.BUILD_TIME))) {
        MARKETING_LASTMOD = new Date(process.env.BUILD_TIME).toISOString().slice(0, 10);
      } else {
        const pkgStat = await fs.stat(path.resolve(process.cwd(), "package.json")).catch(() => null);
        MARKETING_LASTMOD = (pkgStat?.mtime ?? new Date()).toISOString().slice(0, 10);
      }
    } catch {
      MARKETING_LASTMOD = new Date().toISOString().slice(0, 10);
    }

    const PUBLIC_PAGES: ReadonlyArray<{ path: string; priority: string; changefreq: string }> = [
      { path: "/", priority: "1.0", changefreq: "weekly" },
      { path: "/recursos", priority: "0.9", changefreq: "monthly" },
      { path: "/como-funciona", priority: "0.9", changefreq: "monthly" },
      { path: "/empresa", priority: "0.7", changefreq: "monthly" },
      { path: "/contato", priority: "0.6", changefreq: "yearly" },
      { path: "/faq", priority: "0.7", changefreq: "monthly" },
      { path: "/imprensa", priority: "0.6", changefreq: "monthly" },
      { path: "/blog", priority: "0.8", changefreq: "weekly" },
      { path: "/privacy", priority: "0.5", changefreq: "yearly" },
      { path: "/terms", priority: "0.5", changefreq: "yearly" },
      { path: "/excluir-dados", priority: "0.5", changefreq: "yearly" },
    ];
    app.get("/sitemap.xml", async (_req, res) => {
      const today = new Date().toISOString().slice(0, 10);
      const urls: string[] = PUBLIC_PAGES.map(
        (p) =>
          `  <url>\n    <loc>${PUBLIC_SITE_URL}${p.path}</loc>\n    <lastmod>${MARKETING_LASTMOD}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
      );
      try {
        const { query: dbQuery } = await import("./db/index.js");
        // Blog posts publicados.
        const { rows: blogRows } = await dbQuery(
          `SELECT slug, COALESCE(updated_at, published_at, created_at) AS lastmod
             FROM content_items
            WHERE kind = 'artigo' AND status = 'published' AND slug IS NOT NULL
            ORDER BY published_at DESC NULLS LAST
            LIMIT 1000`,
        );
        for (const r of blogRows as Array<{ slug: string; lastmod: Date | null }>) {
          const lm = r.lastmod ? new Date(r.lastmod).toISOString().slice(0, 10) : today;
          urls.push(
            `  <url>\n    <loc>${PUBLIC_SITE_URL}/blog/${encodeURIComponent(r.slug)}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
          );
        }
        // Task #111 — turmas ativas. Landing /turmas/:id é pública (servida
        // pelo SPA + meta tags via resolvePublicMeta), então entram no
        // sitemap. lastmod = courses.updated_at (real, não placeholder).
        const { rows: turmaRows } = await dbQuery(
          `SELECT id, COALESCE(updated_at, created_at) AS lastmod
             FROM courses
            WHERE is_active = TRUE
            ORDER BY updated_at DESC NULLS LAST
            LIMIT 1000`,
        );
        for (const r of turmaRows as Array<{ id: number; lastmod: Date | null }>) {
          const lm = r.lastmod ? new Date(r.lastmod).toISOString().slice(0, 10) : today;
          urls.push(
            `  <url>\n    <loc>${PUBLIC_SITE_URL}/turmas/${r.id}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
          );
        }
      } catch (err) {
        logger.warn("Sitemap", `Failed to fetch dynamic urls for sitemap: ${(err as Error).message}`);
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    });
    app.get("/robots.txt", (_req, res) => {
      // Task #111 — `/turmas/` virou indexável (landings públicas com OG +
      // JSON-LD Course). `/u/` continua disallow pra indexação geral mas
      // bots de link preview (Facebook/WhatsApp/LinkedIn) ignoram robots
      // pra unfurls — meta tags do `/u/:id` vão aparecer mesmo assim.
      const allows = [
        "/$", "/recursos", "/como-funciona", "/empresa", "/contato",
        "/faq", "/imprensa", "/blog", "/turmas", "/privacy", "/terms",
        "/excluir-dados",
      ];
      const body =
        `User-agent: *\n${allows.map((a) => `Allow: ${a}`).join("\n")}\n` +
        `Disallow: /api/\nDisallow: /admin\nDisallow: /perfil\nDisallow: /conversas\nDisallow: /u/\n\n` +
        `Sitemap: ${PUBLIC_SITE_URL}/sitemap.xml\n`;
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(body);
    });

    // Task #111 — /.well-known/security.txt (RFC 9116). Sinaliza canal
    // de segurança para pesquisadores e bug-bounty hunters.
    app.get("/.well-known/security.txt", (_req, res) => {
      // Env-driven (Task #111 review): time de segurança pode trocar
      // contatos sem rebuild. Defaults seguros pra produção.
      const securityContact =
        (process.env.SECURITY_CONTACT_EMAIL || "security@rayo.app.br").trim();
      const dpoContact =
        (process.env.DPO_CONTACT_EMAIL || "dpo@rayo.app.br").trim();
      const policyUrl =
        (process.env.SECURITY_POLICY_URL || `${PUBLIC_SITE_URL}/privacy`).trim();
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      const body =
        `Contact: mailto:${securityContact}\n` +
        `Contact: mailto:${dpoContact}\n` +
        `Expires: ${expires.toISOString()}\n` +
        `Preferred-Languages: pt-BR, en\n` +
        `Canonical: ${PUBLIC_SITE_URL}/.well-known/security.txt\n` +
        `Policy: ${policyUrl}\n`;
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(body);
    });

    // Task #111 — RSS 2.0 do blog. Útil pra leitores RSS, agregadores
    // (Feedly etc.) e pra reabastecer índices de buscadores em paralelo
    // com o sitemap. Cache HTTP de 1h alinhado ao sitemap.
    app.get("/blog/feed.xml", async (_req, res) => {
      try {
        const { query: dbQuery } = await import("./db/index.js");
        const { rows } = await dbQuery(
          `SELECT slug, title, short_description, author,
                  COALESCE(published_at, created_at) AS pub_at
             FROM content_items
            WHERE kind = 'artigo' AND status = 'published' AND slug IS NOT NULL
            ORDER BY published_at DESC NULLS LAST
            LIMIT 30`,
        );
        const escapeXml = (s: string): string =>
          (s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
        const items = (rows as Array<{
          slug: string;
          title: string;
          short_description: string | null;
          author: string | null;
          pub_at: Date | null;
        }>)
          .map((r) => {
            const link = `${PUBLIC_SITE_URL}/blog/${encodeURIComponent(r.slug)}`;
            const pub = r.pub_at ? new Date(r.pub_at).toUTCString() : new Date().toUTCString();
            return (
              `    <item>\n` +
              `      <title>${escapeXml(r.title)}</title>\n` +
              `      <link>${link}</link>\n` +
              `      <guid isPermaLink="true">${link}</guid>\n` +
              `      <pubDate>${pub}</pubDate>\n` +
              (r.author ? `      <author>noreply@rayo.app.br (${escapeXml(r.author)})</author>\n` : "") +
              `      <description>${escapeXml(r.short_description || "")}</description>\n` +
              `    </item>`
            );
          })
          .join("\n");
        const lastBuild = new Date().toUTCString();
        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
          `  <channel>\n` +
          `    <title>Blog · RAYO</title>\n` +
          `    <link>${PUBLIC_SITE_URL}/blog</link>\n` +
          `    <description>Reflexões, práticas e estudos sobre família, relacionamentos e formação espiritual.</description>\n` +
          `    <language>pt-BR</language>\n` +
          `    <lastBuildDate>${lastBuild}</lastBuildDate>\n` +
          `    <atom:link href="${PUBLIC_SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />\n` +
          items +
          `\n  </channel>\n</rss>\n`;
        res.set("Content-Type", "application/rss+xml; charset=utf-8");
        // 15min: balanço entre frescor para leitores RSS/agregadores e
        // custo de hit no banco (cada miss faz 1 query + render).
        res.set("Cache-Control", "public, max-age=900, s-maxage=900");
        res.send(xml);
      } catch (err) {
        logger.warn("RSS", `Failed to build blog feed: ${(err as Error).message}`);
        res.status(500).send("Failed to build feed");
      }
    });

    // Task #111 — Permissions-Policy: nega APIs sensíveis que o app não
    // usa (camera/mic/geolocation/payment/usb). Reduz superfície de ataque
    // se algum bundle 3p tentar usar. Aplicado apenas a respostas HTML
    // (rotas API não precisam). Roda ANTES do middleware SEO.
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      const accept = String(req.headers.accept || "");
      if (!accept.includes("text/html")) return next();
      res.set(
        "Permissions-Policy",
        "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
      );
      // microphone=(self) porque DM permite gravação de áudio in-app.
      // Task #111 — CSP report-only: monitora violações sem bloquear nada
      // (helmet's CSP está off no projeto). Define uma política realista
      // baseada nos hosts conhecidos do app (Bunny CDN, Object Storage,
      // Resend não precisa, OAuth via redirect). Browsers postam violações
      // pro endpoint /api/csp-report — útil pra detectar XSS, supply-chain
      // de bundle e CDNs novas que entrarem sem registro.
      const cspReportOnly = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "connect-src 'self' https://*.b-cdn.net https://*.bunnycdn.com https://storage.googleapis.com",
        "frame-src 'self' https://iframe.mediadelivery.net",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "report-uri /api/csp-report",
      ].join("; ");
      res.set("Content-Security-Policy-Report-Only", cspReportOnly);
      next();
    });

    // (CSP report endpoint movido para top-level — antes do `/api/*`
    // catch-all 404 que vive em module scope.)

    // SEO/SSR-leve: para rotas públicas registradas em PUBLIC_META, lemos
    // o index.html, injetamos <title>, meta tags, OpenGraph e (quando
    // aplicável) um <noscript> com o conteúdo plain-HTML. Em dev o HTML
    // passa por vite.transformIndexHtml para manter HMR. Em prod o
    // index.html é lido uma vez e cacheado em memória. Esse middleware
    // precisa rodar ANTES do vite.middlewares/static para interceptar
    // a entrega do shell SPA.
    const projectRoot = path.resolve(__dirname, "..");
    const indexHtmlPath = isDev
      ? path.resolve(projectRoot, "index.html")
      : path.resolve(projectRoot, "build", "index.html");
    const buildPath = path.resolve(projectRoot, "build");

    if (isDev) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      // Middleware SEO em dev: re-lê o template a cada request (HMR-friendly).
      // Resolver async pra cobrir rotas dinâmicas (/blog/:slug, /u/:id, /turmas/:id)
      // além das estáticas em PUBLIC_META.
      app.use(async (req, res, next) => {
        if (req.method !== "GET") return next();
        const accept = String(req.headers.accept || "");
        if (!accept.includes("text/html")) return next();
        try {
          const meta = await resolvePublicMeta(req.path);
          if (!meta) return next();
          const raw = await fs.readFile(indexHtmlPath, "utf-8");
          const transformed = await vite.transformIndexHtml(req.originalUrl, raw);
          const finalHtml = applyPublicMeta(transformed, meta);
          res.set("Content-Type", "text/html; charset=utf-8");
          // Task #203 — index.html NUNCA pode ser cacheado pelo browser/CDN.
          // Os chunks com hash continuam cacheáveis longos; só o HTML precisa
          // ser fresco pra apontar pros chunks atuais (evita ChunkLoadError
          // após deploy em quem tinha o HTML antigo cacheado).
          res.set("Cache-Control", "no-cache, no-store, must-revalidate");
          res.send(finalHtml);
        } catch (err) {
          logger.warn("PublicSEO", `Failed to render ${req.path}: ${(err as Error).message}`);
          next();
        }
      });
      app.use(vite.middlewares);
      logger.info("Server", "Vite dev middleware attached.");
    } else {
      // Em prod, lê index.html uma vez e cacheia. Se a leitura falhar
      // (build ausente), seguimos sem SEO injection — o static fallback
      // ainda devolve a página, só sem as meta tags ricas.
      let prodIndexHtml: string | null = null;
      try {
        prodIndexHtml = await fs.readFile(indexHtmlPath, "utf-8");
      } catch (err) {
        logger.warn("PublicSEO", `Could not preload index.html: ${(err as Error).message}`);
      }
      app.use(async (req, res, next) => {
        if (req.method !== "GET" || !prodIndexHtml) return next();
        const accept = String(req.headers.accept || "");
        if (!accept.includes("text/html")) return next();
        try {
          const meta = await resolvePublicMeta(req.path);
          if (!meta) return next();
          const finalHtml = applyPublicMeta(prodIndexHtml, meta);
          res.set("Content-Type", "text/html; charset=utf-8");
          // Task #203 — index.html NUNCA pode ser cacheado pelo browser/CDN.
          // Os chunks com hash continuam cacheáveis longos; só o HTML precisa
          // ser fresco pra apontar pros chunks atuais (evita ChunkLoadError
          // após deploy em quem tinha o HTML antigo cacheado).
          res.set("Cache-Control", "no-cache, no-store, must-revalidate");
          res.send(finalHtml);
        } catch (err) {
          logger.warn("PublicSEO", `Failed to render ${req.path}: ${(err as Error).message}`);
          next();
        }
      });
      app.use(express.static(buildPath, {
        // Task #203 — cache agressivo SÓ para assets com hash (chunks JS/CSS,
        // imagens). index.html cai no fallback abaixo com no-store, garantindo
        // que cada navegação revalide os hashes atuais dos chunks.
        index: false,
        setHeaders: (res, filePath) => {
          if (/\.html?$/i.test(filePath)) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (/\/assets\//.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }));
      // SPA fallback: in Express 5 the legacy `app.get("*")` throws at
      // startup ("Missing parameter name") because path-to-regexp v8 no
      // longer accepts bare "*" as a wildcard. A trailing middleware is
      // the version-agnostic equivalent and only fires for unmatched
      // non-/api requests.
      app.use((_req, res) => {
        // Task #203 — SPA fallback nunca pode ser cacheado.
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(path.join(buildPath, "index.html"));
      });
      logger.info("Server", "Serving static build.");
    }

    app.use(errorHandler);

    // Task #222 — criamos o http.Server explicitamente para anexar o
    // Socket.IO (não dá pra plugar no objeto retornado por app.listen
    // depois — ele já começa a aceitar conexões). Socket.IO escuta no
    // mesmo PORT/host do Express (path padrão `/socket.io/`).
    const httpServer = http.createServer(app);
    initRealtime(httpServer);
    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info("Server", `RAYO server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Server", "Failed to start server:", err);
    process.exit(1);
  }
}

start();
