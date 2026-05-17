// Task #234 — Smoke test do scaffold de integration tests.
//
// Garante que:
//   1. `createTestApp()` boota sem throw (todos os imports + wiring OK).
//   2. `GET /api/health` responde 200 + JSON contendo status/uptime/db.
//   3. `truncateAll()` + `makeUser()` + cookie de sessão funcionam end-
//      to-end via `GET /api/auth/me`.
//
// Roda em < 1s, não toca rede externa, é o canário pra qualquer regressão
// no scaffold antes das próximas tasks (#235–#240) montarem em cima.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "./helpers/app.js";
import { withServer, request } from "./helpers/http.js";
import { closeDbPool, ensureSchema, makeUser, truncateAll } from "./helpers/db.js";

before(async () => {
  await ensureSchema();
});

afterEach(async () => {
  await truncateAll();
});

after(async () => {
  await closeDbPool();
});

describe("Integration scaffold — smoke (Task #234)", () => {
  it("GET /api/health → 200 + payload esperado", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{
        success: boolean;
        data: { status: string; uptime: number; database: string };
      }>(base, { path: "/api/health" });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
      assert.equal(r.body.data.status, "ok");
      assert.equal(r.body.data.database, "connected");
      assert.equal(typeof r.body.data.uptime, "number");
    });
  });

  it("makeUser() + sessionCookie autentica GET /api/auth/me", async () => {
    const app = createTestApp();
    const user = await makeUser({ name: "Smoke" });
    await withServer(app, async (base) => {
      const r = await request<{
        success: boolean;
        data: { user: { id: number; email: string } };
      }>(base, { path: "/api/auth/me", cookie: user.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
      assert.equal(r.body.data.user.id, user.id);
      assert.equal(r.body.data.user.email, user.email);
    });
  });

  it("truncateAll() limpa users criados no spec anterior", async () => {
    // O afterEach do test acima já truncou — verificamos contagem 0.
    const { rows } = await (
      await import("./helpers/db.js")
    ).getPool().query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users`);
    assert.equal(rows[0].c, "0");
  });
});
