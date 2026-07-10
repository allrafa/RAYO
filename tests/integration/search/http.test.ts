// LAUNCH_PLAN.md iteração 5 — primeira cobertura de GET /api/search.
// A rota exige autenticação (router.use(requireAuth)).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { getPool, closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Search / GET /api/search", () => {
  it("exige autenticação (401 sem cookie)", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/search?q=teste" });
      assert.equal(r.status, 401);
    });
  });

  it("encontra conteúdo publicado pelo título", async () => {
    const u = await makeUser();
    const marker = `Zysko${Date.now().toString(36)}`;
    await getPool().query(
      `INSERT INTO content_items (kind, title, status) VALUES ('livro', $1, 'published')`,
      [`Livro ${marker} Buscável`],
    );
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ success: boolean }>(base, {
        path: `/api/search?q=${encodeURIComponent(marker)}`,
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200, r.rawBody);
      assert.equal(r.body.success, true);
      // Shape defensivo: o payload agrega grupos (conteúdo/cursos/etc);
      // o marcador único tem que aparecer em algum grupo.
      assert.ok(
        r.rawBody.includes(marker),
        `resultado da busca deve conter o marcador ${marker}: ${r.rawBody.slice(0, 300)}`,
      );
    });
  });

  it("query vazia responde 200 sem quebrar", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ success: boolean }>(base, {
        path: "/api/search?q=",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
    });
  });
});
