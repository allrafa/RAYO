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
import crypto from "node:crypto";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, truncateAll } from "../helpers/db.js";

function withEnv<T extends string>(
  vars: Record<T, string>,
  fn: () => Promise<void>,
): Promise<void> {
  const previous: Partial<Record<T, string | undefined>> = {};
  for (const k of Object.keys(vars) as T[]) {
    previous[k] = process.env[k as string];
    process.env[k as string] = vars[k];
  }
  return fn().finally(() => {
    for (const k of Object.keys(vars) as T[]) {
      if (previous[k] === undefined) delete process.env[k as string];
      else process.env[k as string] = previous[k];
    }
  });
}

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

  it("callback com state inválido (provider configurado) → 302 google_state_mismatch", async () => {
    // O check de state roda ANTES do passport, então credenciais fake
    // não disparam I/O. Setamos as 3 envs pra fingir provider configurado;
    // restauramos no finally.
    await withEnv(
      {
        GOOGLE_CLIENT_ID: "fake-client-id",
        GOOGLE_CLIENT_SECRET: "fake-client-secret",
        GOOGLE_REDIRECT_URI: "https://rayo.app.br/api/auth/google/callback",
      },
      async () => {
        const app = createTestApp();
        await withServer(app, async (base) => {
          // Sem state cookie + state na query → mismatch.
          const r = await fetch(
            `${base}/api/auth/google/callback?code=fake&state=intruso`,
            { redirect: "manual" },
          );
          assert.equal(r.status, 302);
          assert.match(
            r.headers.get("location") ?? "",
            /oauth_error=google_state_mismatch/,
          );
        });
      },
    );
  });

  it("OAuth user fica auto-verified (bypass do fluxo de código)", async () => {
    // findOrCreateOAuthUser chama markEmailVerifiedFromTrustedProvider
    // pra todo provider — espelha o trust do provider no nosso flag de
    // verified, sem precisar do POST /verify-code. Sem isso, OAuth users
    // ficariam travados em gates downstream (criar comunidade etc).
    const svc = await import("../../../server/features/auth/service.js");
    const email = `oauth-${crypto.randomBytes(3).toString("hex")}@rayo.test`;
    const providerId = `g-${crypto.randomBytes(8).toString("hex")}`;
    const user = await svc.findOrCreateOAuthUser({
      provider: "google",
      providerId,
      email,
      name: "OAuth Tester",
    });
    assert.equal(typeof user.id, "number");
    const verified = await svc.isEmailVerifiedForUser(user.id);
    assert.equal(verified, true, "OAuth-created user precisa estar verified");
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
