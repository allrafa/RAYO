// Task #235 — Specs do fluxo de cadastro.
//
// Fluxo real (de docs/contracts/auth.md + server/features/auth/service.ts):
//   1. POST /api/auth/send-code (email) → grava linha em
//      email_verification_codes (code + verify_token_hash).
//   2a. POST /api/auth/verify-code (email, code) → marca verified=TRUE.
//   2b. GET /api/auth/verify-email?token=… → marca verified=TRUE
//       (idempotente em re-clicks). Sempre 302 pro app.
//   3. POST /api/auth/register (email, password, name) → exige linha
//      verified=TRUE, cria user, devolve session_token cookie.
//
// Em dev mode (`NODE_ENV !== "production"`) o código é SEMPRE "123456".
// O token do magic link é random — pra testá-lo sem mockar o sender,
// lemos o `verify_token_hash` da linha recém-criada e geramos um token
// raw com hash igual (impossível). Em vez disso fazemos o INSERT direto
// com um token conhecido (mesma técnica de makeUser).

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, getPool, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

const VALID_PASSWORD = "Senha!Forte123";

describe("Auth registration (Task #235)", () => {
  it("send-code → verify-code → register cria sessão", async () => {
    const app = createTestApp();
    const email = `reg-${crypto.randomBytes(3).toString("hex")}@rayo.test`;
    await withServer(app, async (base) => {
      const sent = await request(base, {
        method: "POST", path: "/api/auth/send-code", body: { email },
      });
      assert.equal(sent.status, 200);

      // Em dev, generateVerificationCode() retorna sempre "123456".
      const verified = await request<{ success: boolean; data: { verified: boolean } }>(base, {
        method: "POST", path: "/api/auth/verify-code", body: { email, code: "123456" },
      });
      assert.equal(verified.status, 200);
      assert.equal(verified.body.data.verified, true);

      const reg = await request<{
        success: boolean; data: { user: { id: number; email: string } };
      }>(base, {
        method: "POST", path: "/api/auth/register",
        body: { email, password: VALID_PASSWORD, name: "Tester" },
      });
      assert.equal(reg.status, 201);
      assert.equal(reg.body.data.user.email, email);
      // Cookie de sessão veio setado e é httpOnly.
      const setCookie = reg.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /session_token=/);
      assert.match(setCookie, /HttpOnly/i);
    });
  });

  it("register sem verificação prévia → 403 EMAIL_NOT_VERIFIED", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/register",
        body: {
          email: `unverif-${crypto.randomBytes(3).toString("hex")}@rayo.test`,
          password: VALID_PASSWORD,
          name: "Sem Verificar",
        },
      });
      assert.equal(r.status, 403);
      assert.equal(r.body.error.code, "EMAIL_NOT_VERIFIED");
    });
  });

  it("magic link (GET /verify-email?token=) marca verified e redireciona com ok", async () => {
    // Insere uma linha de verificação direto no DB com token conhecido.
    const email = `magic-${crypto.randomBytes(3).toString("hex")}@rayo.test`;
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await getPool().query(
      `INSERT INTO email_verification_codes (email, code, expires_at, verify_token_hash)
       VALUES ($1, '654321', NOW() + INTERVAL '10 min', $2)`,
      [email, tokenHash],
    );

    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await fetch(`${base}/api/auth/verify-email?token=${rawToken}`, {
        redirect: "manual",
      });
      assert.equal(r.status, 302);
      const loc = r.headers.get("location") ?? "";
      assert.match(loc, /\/\?email_verified=ok/);

      // Re-click é idempotente: vira "already".
      const r2 = await fetch(`${base}/api/auth/verify-email?token=${rawToken}`, {
        redirect: "manual",
      });
      assert.equal(r2.status, 302);
      assert.match(r2.headers.get("location") ?? "", /email_verified=already/);
    });

    // Confirma no DB.
    const { rows } = await getPool().query<{ verified: boolean }>(
      `SELECT verified FROM email_verification_codes WHERE email = $1`,
      [email],
    );
    assert.equal(rows[0].verified, true);
  });

  it("magic link com token inválido → 302 com email_verified=invalid", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await fetch(`${base}/api/auth/verify-email?token=nope`, {
        redirect: "manual",
      });
      assert.equal(r.status, 302);
      assert.match(r.headers.get("location") ?? "", /email_verified=invalid/);
    });
  });
});
