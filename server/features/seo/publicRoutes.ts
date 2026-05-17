// Task #236 — Extração das rotas públicas SEO do `server/index.ts`
// pra um helper reutilizável em testes de integração.
//
// Em prod, `server/index.ts:start()` monta `mountPublicSitemapAndRobots`
// + `mountPublicSeoHtml` ANTES do middleware do Vite/SPA. Em testes,
// o helper de app monta os mesmos com um getIndexHtml stub minimal
// (sem precisar do Vite/build).
//
// Exporta também `buildSitemapXml`/`buildRobotsTxt` puros pra testes
// unitários (não usados aqui, mas úteis no futuro).
import type { Express, Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { query } from "../../db/index.js";
import { logger } from "../../utils/logger.js";
import { applyPublicMeta, resolvePublicMeta } from "./publicMeta.js";

function getPublicSiteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || "https://rayo.app.br").replace(/\/+$/, "");
}

interface PublicPage {
  path: string;
  priority: string;
  changefreq: string;
}

const PUBLIC_PAGES: ReadonlyArray<PublicPage> = [
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

// Computado uma vez no boot — mantém o comportamento de prod (preferência:
// BUILD_TIME env > mtime de package.json > "agora").
async function resolveMarketingLastmod(): Promise<string> {
  try {
    if (process.env.BUILD_TIME && !Number.isNaN(Date.parse(process.env.BUILD_TIME))) {
      return new Date(process.env.BUILD_TIME).toISOString().slice(0, 10);
    }
    const pkgStat = await fs.stat(path.resolve(process.cwd(), "package.json")).catch(() => null);
    return (pkgStat?.mtime ?? new Date()).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function mountPublicSitemapAndRobots(app: Express): Promise<void> {
  const MARKETING_LASTMOD = await resolveMarketingLastmod();

  app.get("/sitemap.xml", async (_req, res) => {
    const PUBLIC_SITE_URL = getPublicSiteUrl();
    const today = new Date().toISOString().slice(0, 10);
    const urls: string[] = PUBLIC_PAGES.map(
      (p) =>
        `  <url>\n    <loc>${PUBLIC_SITE_URL}${p.path}</loc>\n    <lastmod>${MARKETING_LASTMOD}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
    );
    try {
      const { rows: blogRows } = await query<{ slug: string; lastmod: Date | null }>(
        `SELECT slug, COALESCE(updated_at, published_at, created_at) AS lastmod
           FROM content_items
          WHERE kind = 'artigo' AND status = 'published' AND slug IS NOT NULL
          ORDER BY published_at DESC NULLS LAST
          LIMIT 1000`,
      );
      for (const r of blogRows) {
        const lm = r.lastmod ? new Date(r.lastmod).toISOString().slice(0, 10) : today;
        urls.push(
          `  <url>\n    <loc>${PUBLIC_SITE_URL}/blog/${encodeURIComponent(r.slug)}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
        );
      }
      const { rows: turmaRows } = await query<{ id: number; lastmod: Date | null }>(
        `SELECT id, COALESCE(updated_at, created_at) AS lastmod
           FROM courses
          WHERE is_active = TRUE
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1000`,
      );
      for (const r of turmaRows) {
        const lm = r.lastmod ? new Date(r.lastmod).toISOString().slice(0, 10) : today;
        urls.push(
          `  <url>\n    <loc>${PUBLIC_SITE_URL}/turmas/${r.id}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
        );
      }
    } catch (err) {
      logger.warn("Sitemap", `Failed to fetch dynamic urls: ${(err as Error).message}`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  app.get("/robots.txt", (_req, res) => {
    const PUBLIC_SITE_URL = getPublicSiteUrl();
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
}

// Middleware genérico que resolve meta via `resolvePublicMeta(path)` e
// injeta no HTML retornado por `getIndexHtml(req)`. Em prod, getIndexHtml
// usa Vite (dev) ou index.html cached (prod). Em testes, recebe um stub
// minimal.
export function mountPublicSeoHtml(
  app: Express,
  getIndexHtml: (req: Request) => Promise<string | null>,
): void {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    const accept = String(req.headers.accept || "");
    if (!accept.includes("text/html")) return next();
    try {
      const meta = await resolvePublicMeta(req.path);
      if (!meta) return next();
      const html = await getIndexHtml(req);
      if (!html) return next();
      const finalHtml = applyPublicMeta(html, meta);
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(finalHtml);
    } catch (err) {
      logger.warn("PublicSEO", `Failed to render ${req.path}: ${(err as Error).message}`);
      next();
    }
  });
}
