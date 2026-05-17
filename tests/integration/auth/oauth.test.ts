// Task #235 — Specs dos gates de configuração OAuth.
//
// Sem chave real do Google/Facebook (a infra de CI não tem). O que testamos:
//   - GET /api/auth/providers reflete env vars (false/false quando não setadas).
//   - GET /api/auth/google quando não configurado → 503 PROVIDER_NOT_CONFIGURED.
//   - GET /api/auth/google/callback (state inválido OU não configurado)
//     redireciona pro app com oauth_error=… ao invés de jogar 500.
//
// Não exercitamos o fluxo completo do Passport (precisa de hit no provider
// real). O smoke aqui blinda contra regressões nos gates — que são a
// camada de segurança mais barata e a que mais quebra em refactor.

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Auth OAuth gates (Task #235)", () => {
  it("GET /api/auth/providers reflete env (false quando não configurado)", async () => {
    // Se o CI rodar com env de OAuth setada (improvável), pulamos a
    // asserção forte e validamos só o shape.
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{
        success: boolean; data: { google: boolean; facebook: boolean };
      }>(base, { path: "/api/auth/providers" });
      assert.equal(r.status, 200);
      assert.equal(typeof r.body.data.google, "boolean");
      assert.equal(typeof r.body.data.facebook, "boolean");
      if (!process.env.GOOGLE_REDIRECT_URI) {
        assert.equal(r.body.data.google, false);
      }
      if (!process.env.FACEBOOK_REDIRECT_URI) {
        assert.equal(r.body.data.facebook, false);
      }
    });
  });

  it("GET /api/auth/google sem env → 503 PROVIDER_NOT_CONFIGURED", async () => {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return; // env de prod presente, gate não dispara
    }
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ error: { code: string } }>(base, {
        path: "/api/auth/google",
      });
      assert.equal(r.status, 503);
      assert.equal(r.body.error.code, "PROVIDER_NOT_CONFIGURED");
    });
  });

  it("GET /api/auth/google/callback sem env → 302 oauth_error=not_configured", async () => {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return;
    }
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await fetch(`${base}/api/auth/google/callback?code=fake&state=fake`, {
        redirect: "manual",
      });
      assert.equal(r.status, 302);
      assert.match(r.headers.get("location") ?? "", /oauth_error=not_configured/);
    });
  });

  it("GET /api/auth/facebook/callback sem state cookie → 302 oauth_error=…", async () => {
    if (process.env.FACEBOOK_REDIRECT_URI) {
      return;
    }
    // Mesmo gate "not_configured" porque sem env o callback redireciona
    // antes do check de state. Documenta o comportamento.
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await fetch(`${base}/api/auth/facebook/callback?code=x&state=x`, {
        redirect: "manual",
      });
      assert.equal(r.status, 302);
      assert.match(r.headers.get("location") ?? "", /oauth_error=/);
    });
  });
});
