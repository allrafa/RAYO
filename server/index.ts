import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeSchema } from "./db/schema.js";
import { logger } from "./utils/logger.js";
import { bootstrapAdminsFromEnv } from "./features/admin/bootstrap.js";
import { UPLOAD_ROOT } from "./features/cms/upload.js";
import { backfillLocalUploads } from "./lib/objectStorageBridge.js";
import { isEmailConfigured } from "./lib/email.js";
import { runtimeStatus } from "./lib/runtimeStatus.js";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import {
  mountPublicSitemapAndRobots,
  mountPublicSeoHtml,
} from "./features/seo/publicRoutes.js";
import http from "http";
import { initRealtime } from "./realtime/io.js";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

if (!process.env.DATABASE_URL) {
  logger.error("Server", "DATABASE_URL environment variable is required.");
  process.exit(1);
}

// Task #234 — wiring de rotas/middleware foi extraído pra `server/app.ts`
// (`createApp()`) pra ser reusável pelos testes de integração. As
// preocupações de boot/runtime (DB init, sitemap dinâmico, Vite/static,
// SPA fallback, Socket.IO, listen) continuam aqui em `start()`.
const app = createApp();

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
      } else if (isProd) {
        // Sem webhook registrado o Stripe nunca confirma pagamentos e a
        // tabela subscriptions não é populada — cliente paga sem acesso.
        logger.error("Stripe", "PUBLIC_SITE_URL/REPLIT_DOMAINS ausentes — managed webhook NÃO registrado; pagamentos não serão confirmados.");
      }
      // syncBackfill traz produtos/preços/customers/subscriptions existentes
      // pra schema stripe.*. Não-bloqueante porque pode demorar em contas
      // grandes; no boot inicial roda em background.
      void sync.syncBackfill().catch((err: Error) => {
        logger.warn("Stripe", `syncBackfill failed: ${err.message}`);
      });
      runtimeStatus.billingInitialized = true;
      logger.info("Stripe", `Billing initialized (${isProd ? "production" : "development"} mode)`);
    } catch (err) {
      runtimeStatus.billingError = (err as Error).message;
      if (process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production") {
        logger.error("Stripe", `Billing init FALHOU em produção — checkout e webhook indisponíveis: ${(err as Error).message}`);
      } else {
        logger.warn("Stripe", `Billing init skipped: ${(err as Error).message}`);
      }
    }

    runtimeStatus.emailConfigured = isEmailConfigured();
    if (!runtimeStatus.emailConfigured && process.env.NODE_ENV === "production") {
      logger.error("Email", "resend_api_key ausente em produção — verificação de conta, reset de senha e notificações NÃO serão enviados.");
    }

    await bootstrapAdminsFromEnv();

    // Task #48 — fire-and-forget backfill of any pre-existing on-disk
    // uploads to object storage. Idempotent (skips files already
    // present), so safe to run on every boot. Non-blocking so a slow or
    // huge media tree doesn't delay the listen() call.
    void backfillLocalUploads(UPLOAD_ROOT);

    // SEO público: sitemap.xml e robots.txt. Precisam vir ANTES do
    // middleware do Vite/SPA pra não cair no fallback de index.html.
    // Task #236 — extraído pra `features/seo/publicRoutes.ts` pra
    // permitir teste de integração HTTP.
    const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://rayo.app.br").replace(/\/+$/, "");
    await mountPublicSitemapAndRobots(app);

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
      // Task #236 — Middleware SEO em dev via helper compartilhado.
      // O getter re-lê o template a cada request (HMR-friendly) e passa
      // por vite.transformIndexHtml. Resolver async em mountPublicSeoHtml
      // cobre rotas dinâmicas (/blog/:slug, /u/:id, /turmas/:id) além
      // das estáticas em PUBLIC_META.
      mountPublicSeoHtml(app, async (req) => {
        const raw = await fs.readFile(indexHtmlPath, "utf-8");
        return await vite.transformIndexHtml(req.originalUrl, raw);
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
      mountPublicSeoHtml(app, async () => prodIndexHtml);
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
