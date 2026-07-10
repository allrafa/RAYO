// LAUNCH_PLAN.md iteração 5 — primeira cobertura de /api/books (progresso
// de leitura + highlights). Antes deste spec a feature inteira (11
// endpoints de persistência de usuário) não tinha nenhuma rede de proteção.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { getPool, closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

async function makeLivro(opts: { pages?: number | null; kind?: string } = {}): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items (kind, title, status, pages)
     VALUES ($1, $2, 'published', $3)
     RETURNING id`,
    [opts.kind ?? "livro", `Livro IT ${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`, opts.pages ?? 100],
  );
  return rows[0].id;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Books / progresso de leitura", () => {
  it("exige autenticação (401 sem cookie)", async () => {
    const livroId = await makeLivro();
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: `/api/books/${livroId}/progress` });
      assert.equal(r.status, 401);
    });
  });

  it("404 para content_item que não é kind=livro", async () => {
    const u = await makeUser();
    const videoId = await makeLivro({ kind: "video", pages: null });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "PUT",
        path: `/api/books/${videoId}/progress`,
        cookie: u.sessionCookie,
        body: { currentPage: 5 },
      });
      assert.equal(r.status, 404);
    });
  });

  it("PUT faz upsert (last-write-wins) e GET devolve o progresso salvo", async () => {
    const u = await makeUser();
    const livroId = await makeLivro({ pages: 200 });
    await withServer(createTestApp(), async (base) => {
      const put1 = await request<{ success: boolean; data: { progress: { currentPage: number } } }>(base, {
        method: "PUT",
        path: `/api/books/${livroId}/progress`,
        cookie: u.sessionCookie,
        body: { currentPage: 42 },
      });
      assert.equal(put1.status, 200);
      assert.equal(put1.body.data.progress.currentPage, 42);

      // Last-write-wins: voltar pra página anterior é aceito.
      const put2 = await request<{ success: boolean; data: { progress: { currentPage: number } } }>(base, {
        method: "PUT",
        path: `/api/books/${livroId}/progress`,
        cookie: u.sessionCookie,
        body: { currentPage: 10 },
      });
      assert.equal(put2.body.data.progress.currentPage, 10);

      const get = await request<{ success: boolean; data: { progress: { currentPage: number } | null } }>(base, {
        path: `/api/books/${livroId}/progress`,
        cookie: u.sessionCookie,
      });
      assert.equal(get.status, 200);
      assert.equal(get.body.data.progress?.currentPage, 10);
    });
  });

  it("clampa currentPage ao total de páginas do livro e rejeita valores inválidos", async () => {
    const u = await makeUser();
    const livroId = await makeLivro({ pages: 100 });
    await withServer(createTestApp(), async (base) => {
      const over = await request<{ data: { progress: { currentPage: number } } }>(base, {
        method: "PUT",
        path: `/api/books/${livroId}/progress`,
        cookie: u.sessionCookie,
        body: { currentPage: 5000 },
      });
      assert.equal(over.status, 200);
      assert.equal(over.body.data.progress.currentPage, 100, "acima do total deve clampar em pages");

      const invalid = await request(base, {
        method: "PUT",
        path: `/api/books/${livroId}/progress`,
        cookie: u.sessionCookie,
        body: { currentPage: 0 },
      });
      assert.equal(invalid.status, 400);
    });
  });

  it("highlights: cria, lista em /annotations e remove", async () => {
    const u = await makeUser();
    const livroId = await makeLivro({ pages: 100 });
    await withServer(createTestApp(), async (base) => {
      const create = await request<{ success: boolean; data: { highlight: { id: string } } }>(base, {
        method: "POST",
        path: `/api/books/${livroId}/highlights`,
        cookie: u.sessionCookie,
        // rects são normalizados 0..1 (fração da página).
        body: { page: 3, color: "yellow", text: "trecho marcado", rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }] },
      });
      assert.equal(create.status, 201, `create highlight falhou: ${create.rawBody}`);
      const highlightId = create.body.data.highlight.id;
      assert.ok(highlightId);

      const list = await request<{ success: boolean; data: { highlights: Array<{ id: string }> } }>(base, {
        path: `/api/books/${livroId}/annotations`,
        cookie: u.sessionCookie,
      });
      assert.equal(list.status, 200);
      assert.equal(list.body.data.highlights.length, 1);

      const del = await request(base, {
        method: "DELETE",
        path: `/api/books/${livroId}/highlights/${highlightId}`,
        cookie: u.sessionCookie,
      });
      assert.equal(del.status, 200);

      const after = await request<{ data: { highlights: unknown[] } }>(base, {
        path: `/api/books/${livroId}/annotations`,
        cookie: u.sessionCookie,
      });
      assert.equal(after.body.data.highlights.length, 0);
    });
  });
});
