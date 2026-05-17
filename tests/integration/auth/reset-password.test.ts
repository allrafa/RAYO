// Task #235 — Specs de reset de senha.
//
// Contrato (auth.md):
//  - POST /api/auth/forgot-password SEMPRE devolve 200 mesmo pra email
//    desconhecido (defesa contra enumeration).
//  - POST /api/auth/reset-password aceita {token, password>=8} e
//    invalida o token. Token expirado/usado/inválido → 400 com codes
//    INVALID_RESET_TOKEN / RESET_TOKEN_EXPIRED / RESET_TOKEN_USED.
//
// O token raw nunca volta do servidor (só vai por email). Aqui injetamos
// uma linha em password_reset_tokens diretamente com um token de
// conhecimento nosso (espelhando hashToken = sha256).

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, getPool, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

async function mintResetToken(userId: number, opts: { expiresAt?: Date } = {}) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expires = opts.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000);
  await getPool().query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expires],
  );
  return raw;
}

describe("Auth reset password (Task #235)", () => {
  it("forgot-password sempre 200 — email desconhecido (anti-enumeration)", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request(base, {
        method: "POST", path: "/api/auth/forgot-password",
        body: { email: "ghost-jamais-existiu@rayo.test" },
      });
      assert.equal(r.status, 200);
    });
  });

  it("forgot-password sempre 200 — email cadastrado", async () => {
    const user = await makeUser();
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request(base, {
        method: "POST", path: "/api/auth/forgot-password",
        body: { email: user.email },
      });
      assert.equal(r.status, 200);
    });
    // Token de reset realmente foi gravado.
    const { rows } = await getPool().query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM password_reset_tokens WHERE user_id = $1`,
      [user.id],
    );
    assert.equal(rows[0].c, "1");
  });

  it("reset com token válido → 200 + nova senha funciona no login", async () => {
    const user = await makeUser();
    const token = await mintResetToken(user.id);
    const app = createTestApp();
    const novaSenha = "NovaSenha!2026";
    await withServer(app, async (base) => {
      const r = await request(base, {
        method: "POST", path: "/api/auth/reset-password",
        body: { token, password: novaSenha },
      });
      assert.equal(r.status, 200);

      // Login com a nova senha funciona.
      const login = await request(base, {
        method: "POST", path: "/api/auth/login",
        body: { email: user.email, password: novaSenha },
      });
      assert.equal(login.status, 200);
    });
    // Hash velho não bate mais.
    const { rows } = await getPool().query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`, [user.id],
    );
    assert.equal(await bcrypt.compare(user.password, rows[0].password_hash), false);
  });

  it("reset com token expirado → 400 RESET_TOKEN_EXPIRED", async () => {
    const user = await makeUser();
    const token = await mintResetToken(user.id, {
      expiresAt: new Date(Date.now() - 60 * 1000), // expirou há 1 min
    });
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/reset-password",
        body: { token, password: "OutraSenha!123" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "RESET_TOKEN_EXPIRED");
    });
  });

  it("reset com token já usado → 400 RESET_TOKEN_USED (replay-protection)", async () => {
    const user = await makeUser();
    const token = await mintResetToken(user.id);
    const app = createTestApp();
    await withServer(app, async (base) => {
      // Primeiro uso: ok.
      const ok = await request(base, {
        method: "POST", path: "/api/auth/reset-password",
        body: { token, password: "Primeira!2026" },
      });
      assert.equal(ok.status, 200);
      // Replay com o MESMO token: rejeitado com code dedicado.
      const replay = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/reset-password",
        body: { token, password: "Segunda!2026" },
      });
      assert.equal(replay.status, 400);
      assert.equal(replay.body.error.code, "RESET_TOKEN_USED");
    });
  });

  it("reset com token inválido → 400 INVALID_RESET_TOKEN", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        method: "POST", path: "/api/auth/reset-password",
        body: { token: "x".repeat(64), password: "OutraSenha!123" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_RESET_TOKEN");
    });
  });
});
