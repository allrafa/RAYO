// Task #235 — Specs do POST /api/auth/login.
//
// Cobre:
//  - login OK devolve user + cookie.
//  - senha errada → 401 INVALID_CREDENTIALS.
//  - email não cadastrado → 401 INVALID_CREDENTIALS (mesmo código:
//    impede enumeration).
//  - rate limiter sensível 20/15min por IP (apenas POSTs em
//    SENSITIVE_AUTH_PATHS — login está na lista). Após 20 tentativas
//    falhas, a 21ª devolve 429 RATE_LIMIT_EXCEEDED.
//
// IMPORTANTE: rate-limit é per-instance/in-memory. Cada `createTestApp()`
// cria buckets novos. Os specs usam apps separados pra isolar.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Auth login (Task #235)", () => {
  it("login com credenciais válidas → 200 + cookie", async () => {
    const user = await makeUser();
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ data: { user: { id: number; email: string } } }>(base, {
        method: "POST", path: "/api/auth/login",
        body: { email: user.email, password: user.password },
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.user.id, user.id);
      const setCookie = r.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /session_token=/);
      assert.match(setCookie, /HttpOnly/i);
      // Em dev (NODE_ENV !== 'production') o cookie usa SameSite=Lax.
      assert.match(setCookie, /SameSite=Lax/i);
    });
  });

  it("senha errada → 401 INVALID_CREDENTIALS", async () => {
    const user = await makeUser();
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/login",
        body: { email: user.email, password: "errada123!" },
      });
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, "INVALID_CREDENTIALS");
    });
  });

  it("email não cadastrado → 401 INVALID_CREDENTIALS (mesmo erro, anti-enumeration)", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/login",
        body: { email: "ghost-nao-existe@rayo.test", password: "qualquer123" },
      });
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, "INVALID_CREDENTIALS");
    });
  });

  it("rate limiter: 20 tentativas/IP em 15min, 21ª devolve 429", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const bad = { email: "rate@rayo.test", password: "x" };
      // 20 tentativas válidas (consumem cota) — todas devem retornar 401.
      for (let i = 0; i < 20; i++) {
        const r = await request(base, { method: "POST", path: "/api/auth/login", body: bad });
        assert.ok(r.status === 401, `iteração ${i}: esperado 401 mas veio ${r.status}`);
      }
      // 21ª deve estourar.
      const limited = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/login", body: bad,
      });
      assert.equal(limited.status, 429);
      assert.equal(limited.body.error.code, "RATE_LIMIT_EXCEEDED");
    });
  });
});
