import { request } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  createContentItem,
  deleteContentItem,
  closeDbPool,
} from "./helpers/api";

// SEO público — sitemap, robots, Home e /blog/:slug (SSR JSON-LD).
//
// Estes endpoints NÃO exigem autenticação. Usamos APIRequestContext
// direto (sem browser) pra checar headers + body como um crawler veria.

test.describe("SEO — sitemap + robots + Home + blog (Task #242)", () => {
  let articleId: number | undefined;
  let articleSlug: string | undefined;

  test.afterEach(async () => {
    if (articleId) await deleteContentItem(articleId).catch(() => {});
    articleId = undefined; articleSlug = undefined;
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("/sitemap.xml retorna XML válido com URLs canônicas das públicas", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const res = await api.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const ct = (res.headers()["content-type"] ?? "").toLowerCase();
    expect(ct).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<?xml");
    expect(body).toContain("<urlset");
    // Pelo menos as páginas marketing fixas precisam estar listadas.
    expect(body).toMatch(/<loc>[^<]*\/recursos<\/loc>/);
    expect(body).toMatch(/<loc>[^<]*\/blog<\/loc>/);
    await api.dispose();
  });

  test("/robots.txt retorna text/plain bloqueando /api/ e /admin", async ({ baseURL }) => {
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const res = await api.get("/robots.txt");
    expect(res.status()).toBe(200);
    const ct = (res.headers()["content-type"] ?? "").toLowerCase();
    expect(ct).toContain("text/plain");
    const body = await res.text();
    expect(body).toMatch(/User-agent/i);
    expect(body).toMatch(/Disallow:\s*\/api\//);
    expect(body).toMatch(/Disallow:\s*\/admin/);
    expect(body).toMatch(/Sitemap:/i);
    await api.dispose();
  });

  test("GET / (sem login) renderiza HTML com <title>, og:title e canonical", async ({ baseURL }) => {
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const res = await api.get("/", { headers: { Accept: "text/html" } });
    expect(res.status()).toBe(200);
    const ct = (res.headers()["content-type"] ?? "").toLowerCase();
    expect(ct).toContain("text/html");
    const html = await res.text();
    expect(html).toMatch(/<title>[^<]+<\/title>/i);
    expect(html).toMatch(/<meta[^>]+property=["']og:title["']/i);
    expect(html).toMatch(/<link[^>]+rel=["']canonical["']/i);
    await api.dispose();
  });

  test("GET /blog/:slug (artigo publicado) renderiza com JSON-LD Article", async ({ baseURL }) => {
    const stamp = Date.now();
    const created = await createContentItem({
      kind: "artigo",
      title: `Artigo SEO E2E ${stamp}`,
      slugPrefix: "test-seo-art",
      body: "Texto longo do artigo de teste E2E pra SEO.",
      status: "published",
    });
    articleId = created.id;
    articleSlug = created.slug;

    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const res = await api.get(`/blog/${articleSlug}`, { headers: { Accept: "text/html" } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    // applyPublicMeta injeta <title> com o título do artigo + JSON-LD Article.
    expect(html).toContain(`Artigo SEO E2E ${stamp}`);
    expect(html).toMatch(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/i);
    // og:type=article quando renderiza um artigo.
    expect(html).toMatch(/<meta[^>]+property=["']og:type["'][^>]+content=["']article["']/i);
    await api.dispose();
  });
});
