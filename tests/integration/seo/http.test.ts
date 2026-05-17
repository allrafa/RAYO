// Task #236 — SEO público em runtime HTTP (sitemap + robots + HTML SPA).
//
// Esses 4 endpoints são montados em `server/index.ts:start()` (fora do
// `createApp()` porque dependem de Vite/build) — antes da Task #236
// estavam inline, agora vivem em `server/features/seo/publicRoutes.ts`.
// Testamos via `createTestAppWithPublicSeo()` que monta os mesmos
// helpers com um template HTML stub minimal.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestAppWithPublicSeo } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

async function insertPublishedArticle(
  ownerId: number,
  slug: string,
  title: string,
): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items
       (kind, title, slug, short_description, status, created_by,
        published_at, segments, interests, tags)
     VALUES ('artigo', $1, $2, $3, 'published', $4, NOW(),
             ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[])
     RETURNING id`,
    [title, slug, "resumo", ownerId],
  );
  return rows[0].id;
}

describe("SEO público HTTP — sitemap.xml (Task #236)", () => {
  it("GET /sitemap.xml inclui páginas marketing + blog posts + turmas", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertPublishedArticle(owner.id, "post-de-sitemap", "Post sitemap");

    const app = await createTestAppWithPublicSeo();
    await withServer(app, async (base) => {
      const r = await request<string>(base, { method: "GET", path: "/sitemap.xml" });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") || "", /application\/xml/);
      assert.match(r.headers.get("cache-control") || "", /max-age=3600/);
      // Páginas marketing estáticas devem estar lá.
      assert.match(r.rawBody, /<loc>[^<]+\/recursos<\/loc>/);
      assert.match(r.rawBody, /<loc>[^<]+\/blog<\/loc>/);
      // Post publicado deve aparecer.
      assert.match(r.rawBody, /<loc>[^<]+\/blog\/post-de-sitemap<\/loc>/);
      assert.match(r.rawBody, /<urlset xmlns=/);
    });
  });
});

describe("SEO público HTTP — robots.txt (Task #236)", () => {
  it("GET /robots.txt devolve Allow/Disallow corretos + sitemap link", async () => {
    const app = await createTestAppWithPublicSeo();
    await withServer(app, async (base) => {
      const r = await request<string>(base, { method: "GET", path: "/robots.txt" });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") || "", /text\/plain/);
      assert.match(r.rawBody, /User-agent: \*/);
      assert.match(r.rawBody, /Allow: \/blog/);
      assert.match(r.rawBody, /Allow: \/turmas/);
      assert.match(r.rawBody, /Disallow: \/api\//);
      assert.match(r.rawBody, /Disallow: \/admin/);
      assert.match(r.rawBody, /Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
    });
  });
});

describe("SEO público HTTP — HTML meta injection (Task #236)", () => {
  it("GET / com Accept: text/html injeta meta tags estáticas", async () => {
    const app = await createTestAppWithPublicSeo();
    await withServer(app, async (base) => {
      const r = await request<string>(base, {
        method: "GET",
        path: "/",
        headers: { Accept: "text/html" },
      });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") || "", /text\/html/);
      assert.match(r.headers.get("cache-control") || "", /no-cache|no-store/);
      // applyPublicMeta injeta og:* + JSON-LD.
      assert.match(r.rawBody, /<meta property="og:title"/);
      assert.match(r.rawBody, /<meta property="og:type"/);
      assert.match(r.rawBody, /application\/ld\+json/);
    });
  });

  it("GET /blog/:slug com Accept: text/html injeta meta de artigo + Article JSON-LD", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertPublishedArticle(owner.id, "post-html", "Título do post HTML");

    const app = await createTestAppWithPublicSeo();
    await withServer(app, async (base) => {
      const r = await request<string>(base, {
        method: "GET",
        path: "/blog/post-html",
        headers: { Accept: "text/html" },
      });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type") || "", /text\/html/);
      // Título do artigo aparece no og:title.
      assert.match(r.rawBody, /og:title.*Título do post HTML|Título do post HTML.*og:title/);
      // JSON-LD Article (resolvePublicMeta de /blog/:slug emite Article + Breadcrumb).
      assert.match(r.rawBody, /"@type":\s*"Article"/);
    });
  });

  it("GET / sem Accept: text/html não intercepta (passa pro próximo middleware)", async () => {
    const app = await createTestAppWithPublicSeo();
    await withServer(app, async (base) => {
      // Sem Accept text/html → middleware SEO chama next() → não há
      // próximo middleware no test app, então cai no 404 padrão Express.
      const r = await request<string>(base, {
        method: "GET",
        path: "/",
        headers: { Accept: "application/json" },
      });
      assert.equal(r.status, 404);
    });
  });
});
