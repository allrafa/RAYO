// Task #236 — Webhook do Bunny Stream.
//
// Contrato (docs/contracts/bunny-stream.md):
//   * Sem `BUNNY_STREAM_WEBHOOK_SECRET` configurado → 503
//     BUNNY_WEBHOOK_DISABLED (não aceita nada).
//   * HMAC SHA256 do raw body — header `x-bunny-signature`
//     (aceita também x-webhook-signature / authorization,
//     prefixo `sha256=` opcional). Assinatura ausente ou
//     inválida → 401 INVALID_SIGNATURE.
//   * Payload `{ VideoGuid, Status }` (também snake_case).
//     Sem esses campos → 400 INVALID_PAYLOAD.
//   * JSON malformado → 400 INVALID_JSON.
//   * GUID que não casa com nenhum content_item / episode →
//     200 (Bunny não reentregar). É idempotente: 2x mesmo
//     payload = 2x 200, sem efeito colateral.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, truncateAll } from "../helpers/db.js";

const SECRET = "test-bunny-webhook-secret-32bytes-min";

// `getBunnyConfig()` exige LIBRARY_ID + API_KEY + CDN_HOSTNAME setados;
// faltando qualquer um, devolve null e o webhook responde 503. Pra
// exercitar o caminho de HMAC precisamos popular os 4 ao mesmo tempo.
const BUNNY_FULL_ENV = {
  BUNNY_STREAM_LIBRARY_ID: "99999",
  BUNNY_STREAM_API_KEY: "test-key",
  BUNNY_STREAM_CDN_HOSTNAME: "vz-test.b-cdn.net",
  BUNNY_STREAM_WEBHOOK_SECRET: SECRET,
} as const;

function withEnv<T extends string>(
  vars: Record<T, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const previous: Partial<Record<T, string | undefined>> = {};
  for (const k of Object.keys(vars) as T[]) {
    previous[k] = process.env[k as string];
    const v = vars[k];
    if (v === undefined) delete process.env[k as string];
    else process.env[k as string] = v;
  }
  return fn().finally(() => {
    for (const k of Object.keys(vars) as T[]) {
      if (previous[k] === undefined) delete process.env[k as string];
      else process.env[k as string] = previous[k];
    }
  });
}

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Bunny webhook — HMAC + idempotência (Task #236)", () => {
  it("sem BUNNY_STREAM_WEBHOOK_SECRET → 503 BUNNY_WEBHOOK_DISABLED", async () => {
    await withEnv(
      { BUNNY_STREAM_WEBHOOK_SECRET: undefined },
      async () => {
        await withServer(createTestApp(), async (base) => {
          const r = await request<{ error?: { code?: string } }>(base, {
            method: "POST",
            path: "/api/webhooks/bunny/",
            body: { VideoGuid: "x", Status: 4 },
          });
          assert.equal(r.status, 503);
          assert.equal(r.body.error?.code, "BUNNY_WEBHOOK_DISABLED");
        });
      },
    );
  });

  it("assinatura ausente → 401 INVALID_SIGNATURE", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      await withServer(createTestApp(), async (base) => {
        const r = await request<{ error?: { code?: string } }>(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: { VideoGuid: "x", Status: 4 },
        });
        assert.equal(r.status, 401);
        assert.equal(r.body.error?.code, "INVALID_SIGNATURE");
      });
    });
  });

  it("assinatura inválida → 401 INVALID_SIGNATURE", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      await withServer(createTestApp(), async (base) => {
        const r = await request<{ error?: { code?: string } }>(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: { VideoGuid: "x", Status: 4 },
          headers: { "x-bunny-signature": "deadbeef" },
        });
        assert.equal(r.status, 401);
        assert.equal(r.body.error?.code, "INVALID_SIGNATURE");
      });
    });
  });

  it("assinatura válida com GUID órfão → 200 (idempotente em duas chamadas)", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      const payload = JSON.stringify({
        VideoGuid: "orphan-guid-0000-0000-000000000000",
        Status: 1, // queued — não dispara getVideo()
      });
      const sig = sign(payload);
      await withServer(createTestApp(), async (base) => {
        const r1 = await request(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-bunny-signature": sig,
          },
        });
        assert.equal(r1.status, 200);
        // Segunda chamada idêntica — Bunny pode reentregar; precisa
        // permanecer 200 e sem corrupção (idempotência).
        const r2 = await request(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-bunny-signature": sig,
          },
        });
        assert.equal(r2.status, 200);
      });
    });
  });

  it("prefixo `sha256=` na assinatura é aceito", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      const payload = JSON.stringify({ VideoGuid: "orphan-2", Status: 1 });
      const sig = sign(payload);
      await withServer(createTestApp(), async (base) => {
        const r = await request(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-bunny-signature": `sha256=${sig}`,
          },
        });
        assert.equal(r.status, 200);
      });
    });
  });

  it("payload sem VideoGuid → 400 INVALID_PAYLOAD", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      const payload = JSON.stringify({ Status: 4 });
      const sig = sign(payload);
      await withServer(createTestApp(), async (base) => {
        const r = await request<{ error?: { code?: string } }>(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-bunny-signature": sig,
          },
        });
        assert.equal(r.status, 400);
        assert.equal(r.body.error?.code, "INVALID_PAYLOAD");
      });
    });
  });

  it("JSON malformado mas com assinatura válida → 400 INVALID_JSON", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      const payload = "{not-json";
      const sig = sign(payload);
      await withServer(createTestApp(), async (base) => {
        const r = await request<{ error?: { code?: string } }>(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-bunny-signature": sig,
          },
        });
        assert.equal(r.status, 400);
        assert.equal(r.body.error?.code, "INVALID_JSON");
      });
    });
  });

  it("aceita header alternativo `x-webhook-signature`", async () => {
    await withEnv(BUNNY_FULL_ENV, async () => {
      const payload = JSON.stringify({ VideoGuid: "orphan-3", Status: 1 });
      const sig = sign(payload);
      await withServer(createTestApp(), async (base) => {
        const r = await request(base, {
          method: "POST",
          path: "/api/webhooks/bunny/",
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "x-webhook-signature": sig,
          },
        });
        assert.equal(r.status, 200);
      });
    });
  });
});
