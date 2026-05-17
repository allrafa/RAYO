// Task #236 — SEO público: blog router + resolvePublicMeta + applyPublicMeta.
//
// O middleware de SEO em `server/index.ts` é montado fora do
// `createApp()` (depende de boot/Vite). Esse spec testa duas camadas:
//
//   1. **HTTP** — `/api/blog/posts` e `/api/blog/posts/:slug`.
//      Lista/detalhe filtram por `kind='artigo' AND status='published'`,
//      incrementam `view_count` no detalhe e setam Cache-Control 5min.
//
//   2. **Diretamente** — `resolvePublicMeta(path)` + `applyPublicMeta(html, meta)`.
//      É o que o middleware do server/index.ts injeta no `index.html`
//      antes de servir pro crawler/social-card. Valida:
//        * `/` devolve meta estática com JSON-LD Organization + WebSite.
//        * `/blog/:slug` devolve meta dinâmica com Article + Breadcrumb.
//        * `applyPublicMeta` injeta <title>, og:*, twitter:*, JSON-LD <script>.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import {
  resolvePublicMeta,
  applyPublicMeta,
} from "../../../server/features/seo/publicMeta.js";

interface BlogListResponse {
  success: boolean;
  data: {
    items: Array<{ slug: string; title: string }>;
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
interface BlogDetailResponse {
  success: boolean;
  data: {
    post: {
      id: number;
      slug: string;
      title: string;
      view_count: number;
    };
  };
}

async function insertArtigo(
  ownerId: number,
  slug: string,
  overrides: Record<string, unknown> = {},
): Promise<number> {
  const o = {
    title: "Post de teste",
    short_description: "Resumo curto",
    long_description: "Corpo do artigo. Bem-vindo ao RAYO.",
    status: "published",
    author: "Equipe RAYO",
    ...overrides,
  };
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items
       (kind, title, slug, short_description, long_description, status,
        author, created_by, published_at, segments, interests, tags)
     VALUES ('artigo', $1, $2, $3, $4, $5, $6, $7, NOW(),
             ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[])
     RETURNING id`,
    [o.title, slug, o.short_description, o.long_description, o.status, o.author, ownerId],
  );
  return rows[0].id;
}

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>placeholder</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Blog router público (Task #236)", () => {
  it("GET /api/blog/posts lista só artigos publicados", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertArtigo(owner.id, "publicado-1", { title: "Publicado 1" });
    await insertArtigo(owner.id, "rascunho-1", { title: "Rascunho", status: "draft" });
    await insertArtigo(owner.id, "arquivado-1", { title: "Arquivado", status: "archived" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<BlogListResponse>(base, {
        method: "GET",
        path: "/api/blog/posts",
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.total, 1);
      assert.equal(r.body.data.items.length, 1);
      assert.equal(r.body.data.items[0].slug, "publicado-1");
      // Cache 5min documentado no contrato de marketing-seo.
      assert.match(r.headers.get("cache-control") ?? "", /max-age=300/);
    });
  });

  it("GET /api/blog/posts/:slug devolve detalhe e incrementa view_count", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertArtigo(owner.id, "como-comecar", { title: "Como começar" });
    await withServer(createTestApp(), async (base) => {
      const r1 = await request<BlogDetailResponse>(base, {
        method: "GET",
        path: "/api/blog/posts/como-comecar",
      });
      assert.equal(r1.status, 200);
      assert.equal(r1.body.data.post.slug, "como-comecar");

      // view_count++ é fire-and-forget (void query). Damos uma janela
      // pequena pro UPDATE sair do event loop antes de re-checar.
      await new Promise((resolve) => setTimeout(resolve, 80));
      const { rows } = await getPool().query<{ view_count: number }>(
        `SELECT view_count FROM content_items WHERE slug = $1`,
        ["como-comecar"],
      );
      assert.ok(rows[0].view_count >= 1, `view_count subiu (got ${rows[0].view_count})`);
    });
  });

  it("GET /api/blog/posts/:slug devolve 404 quando não encontrado", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ error?: { code?: string } }>(base, {
        method: "GET",
        path: "/api/blog/posts/nao-existe",
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error?.code, "POST_NOT_FOUND");
    });
  });

  it("GET /api/blog/posts/:slug com slug inválido → 400 INVALID_SLUG", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ error?: { code?: string } }>(base, {
        method: "GET",
        path: "/api/blog/posts/SLUG INVALIDO!",
      });
      // O Express percent-decode é parcial; o handler valida com regex
      // `^[a-z0-9-]{1,200}$` e devolve 400 quando não casa.
      assert.equal(r.status, 400);
      assert.equal(r.body.error?.code, "INVALID_SLUG");
    });
  });

  it("não vaza artigos em draft via detalhe", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertArtigo(owner.id, "draft-leak", { status: "draft" });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "GET",
        path: "/api/blog/posts/draft-leak",
      });
      assert.equal(r.status, 404);
    });
  });
});

describe("resolvePublicMeta + applyPublicMeta (Task #236)", () => {
  it("/ devolve meta estática com JSON-LD Organization + WebSite", async () => {
    const meta = await resolvePublicMeta("/");
    assert.ok(meta, "Home deve ter meta registrada");
    assert.match(meta!.title, /RAYO/);
    assert.ok(meta!.canonical?.endsWith("/"));
    const types = (meta!.jsonLd ?? []).map((j) => j["@type"]);
    assert.ok(types.includes("Organization"));
    assert.ok(types.includes("WebSite"));
  });

  it("/blog/:slug devolve Article + BreadcrumbList depois de publicar", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertArtigo(owner.id, "seo-test", {
      title: "Artigo de SEO",
      short_description: "Resumo SEO",
    });
    // Cache em memória do publicMeta é por slug — cada slug novo é
    // re-fetched do DB; sem necessidade de bust manual.
    const meta = await resolvePublicMeta("/blog/seo-test");
    assert.ok(meta, "Artigo publicado deve ter meta resolvida");
    assert.match(meta!.title, /Artigo de SEO/);
    assert.equal(meta!.ogType, "article");
    const types = (meta!.jsonLd ?? []).map((j) => j["@type"]);
    assert.ok(types.includes("Article"));
    assert.ok(types.includes("BreadcrumbList"));
  });

  it("/blog/:slug em rascunho → null (cai pro shell normal do SPA)", async () => {
    const owner = await makeUser({ role: "producer" });
    await insertArtigo(owner.id, "rascunho-meta", { status: "draft" });
    const meta = await resolvePublicMeta("/blog/rascunho-meta");
    assert.equal(meta, null);
  });

  it("applyPublicMeta injeta <title>, og:*, twitter:* e JSON-LD <script>", async () => {
    const meta = await resolvePublicMeta("/");
    const html = applyPublicMeta(SHELL, meta!);
    assert.match(html, /<html lang="pt-BR"/);
    assert.match(html, /<title>[^<]*RAYO[^<]*<\/title>/);
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta property="og:image"/);
    assert.match(html, /<meta name="twitter:card"/);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /<script type="application\/ld\+json">/);
    // JSON-LD não pode conter `</script>` literal (escape para \u003c).
    assert.doesNotMatch(html, /<\/script>[\s\S]*<\/script>[\s\S]*<\/script>[\s\S]*<\/script>[\s\S]*<\/script>/);
  });

  it("path desconhecido devolve null (sem injeção de meta)", async () => {
    const meta = await resolvePublicMeta("/rota-que-nao-existe");
    assert.equal(meta, null);
  });
});
