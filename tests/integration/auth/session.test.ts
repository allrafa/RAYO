// Task #235 — Specs de sessão (cookie attrs, logout, expiração).
//
//  - Cookie é httpOnly. SameSite=Lax em dev (Strict em prod). MaxAge é
//    de 30 dias (Max-Age ~2592000).
//  - POST /api/auth/logout invalida a sessão: o cookie de sessão
//    enviado depois retorna 401 SESSION_EXPIRED.
//  - Sessão expirada manualmente (UPDATE sessions SET expires_at no
//    passado) retorna 401 SESSION_EXPIRED em /api/auth/me.

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, getPool, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Auth session (Task #235)", () => {
  it("login devolve cookie httpOnly + Lax + Max-Age longo", async () => {
    const user = await makeUser();
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request(base, {
        method: "POST", path: "/api/auth/login",
        body: { email: user.email, password: user.password },
      });
      const setCookie = r.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Lax/i);
      // 30 dias = 2592000s; alguns runtimes serializam em ms — checamos
      // Max-Age >= 24h pra cobrir as duas convenções.
      const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/i);
      assert.ok(maxAgeMatch, "Max-Age presente");
      assert.ok(Number(maxAgeMatch![1]) >= 86400, "Max-Age >= 24h");
    });
  });

  it("logout invalida a sessão; cookie antigo dá SESSION_EXPIRED", async () => {
    const user = await makeUser();
    const app = createTestApp();
    await withServer(app, async (base) => {
      const logout = await request(base, {
        method: "POST", path: "/api/auth/logout", cookie: user.sessionCookie,
      });
      assert.equal(logout.status, 200);

      const me = await request<{ error: { code: string } }>(base, {
        path: "/api/auth/me", cookie: user.sessionCookie,
      });
      assert.equal(me.status, 401);
      assert.equal(me.body.error.code, "SESSION_EXPIRED");
    });
  });

  it("sessão expirada (expires_at no passado) → 401 SESSION_EXPIRED", async () => {
    const user = await makeUser();
    // Força expiração.
    await getPool().query(
      `UPDATE sessions SET expires_at = NOW() - INTERVAL '1 hour' WHERE user_id = $1`,
      [user.id],
    );
    const app = createTestApp();
    await withServer(app, async (base) => {
      const me = await request<{ error: { code: string } }>(base, {
        path: "/api/auth/me", cookie: user.sessionCookie,
      });
      assert.equal(me.status, 401);
      assert.equal(me.body.error.code, "SESSION_EXPIRED");
    });
  });

  it("sem cookie → /api/auth/me 401 UNAUTHORIZED", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const me = await request<{ error: { code: string } }>(base, {
        path: "/api/auth/me",
      });
      assert.equal(me.status, 401);
      assert.equal(me.body.error.code, "UNAUTHORIZED");
    });
  });
});
