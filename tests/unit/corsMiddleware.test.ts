// Task #233 — Integração leve garantindo que o contrato CORS não regrida:
//   * Origin bloqueada → 403 + error.code === "CORS_NOT_ALLOWED" + mensagem
//     menciona o origin enviado.
//   * Origin Replit (`*.replit.dev`) e ausência de header Origin (server-to-
//     server / webhook) → 200.
//   * Preflight `OPTIONS` com origin bloqueada → 403 (não 204).
//   * Log de 4xx não emite stack trace.
//
// Monta um Express mínimo com o mesmo corsMiddleware + errorHandler usados
// em produção. Sem rede, sem DB, sem env vars — roda em `npm run test:unit`.
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

// Garante que `isDev` em security.ts seja true: em dev a allowlist começa
// vazia e o gate Replit é o único caminho de aprovação — exatamente o cenário
// que queremos cobrir. Snapshot/restore evita order-dependence com outras
// suites que dependam de env-derived module init.
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
process.env.NODE_ENV = "development";
delete process.env.ALLOWED_ORIGINS;

const express = (await import("express")).default;
const { corsMiddleware } = await import("../../server/middleware/security.js");
const { errorHandler } = await import("../../server/middleware/errorHandler.js");

type ConsoleCapture = {
  warn: string[];
  error: string[];
  restore: () => void;
};

function captureConsole(): ConsoleCapture {
  const originalWarn = console.warn;
  const originalError = console.error;
  const cap: ConsoleCapture = {
    warn: [],
    error: [],
    restore: () => {
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
  console.warn = (...args: unknown[]) => {
    cap.warn.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    cap.error.push(args.map(String).join(" "));
  };
  return cap;
}

async function withServer<T>(
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use("/api", corsMiddleware);
  app.get("/api/ping", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

let consoleCap: ConsoleCapture;

beforeEach(() => {
  consoleCap = captureConsole();
});

afterEach(() => {
  consoleCap.restore();
});

after(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
  if (ORIGINAL_ALLOWED_ORIGINS === undefined) {
    delete process.env.ALLOWED_ORIGINS;
  } else {
    process.env.ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
  }
});

describe("CORS middleware contract (Task #233)", () => {
  it("blocked origin → 403 + CORS_NOT_ALLOWED + message includes origin", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/ping`, {
        headers: { Origin: "https://evil.example.com" },
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as {
        success: boolean;
        error: { code: string; message: string };
      };
      assert.equal(body.success, false);
      assert.equal(body.error.code, "CORS_NOT_ALLOWED");
      assert.match(body.error.message, /evil\.example\.com/);
    });
  });

  it("Replit dev origin (*.replit.dev) → 200", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/ping`, {
        headers: { Origin: "https://abc-123.worf.replit.dev" },
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean };
      assert.equal(body.ok, true);
    });
  });

  it("no Origin header (server-to-server / webhook) → 200", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/ping`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean };
      assert.equal(body.ok, true);
    });
  });

  it("preflight OPTIONS with blocked origin → 403 (not 204)", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/ping`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      assert.equal(res.status, 403);
      // O corpo aqui também passa pelo errorHandler — confirma que o
      // preflight não cai no atalho 204 default do pacote `cors`.
      const body = (await res.json()) as { error: { code: string } };
      assert.equal(body.error.code, "CORS_NOT_ALLOWED");
    });
  });

  it("4xx log line has no stack trace", async () => {
    await withServer(async (base) => {
      await fetch(`${base}/api/ping`, {
        headers: { Origin: "https://evil.example.com" },
      });
    });
    // Pelo menos um [WARN] com code=CORS_NOT_ALLOWED.
    const warnLine = consoleCap.warn.find((l) =>
      l.includes("code=CORS_NOT_ALLOWED"),
    );
    assert.ok(warnLine, "expected a [WARN] line for CORS_NOT_ALLOWED");
    assert.match(warnLine!, /^\[WARN\]/);
    // Nada de stack: linhas de stack do V8 começam com "    at ".
    assert.doesNotMatch(warnLine!, /\n\s+at\s/);
    // E nada deve ter ido pra console.error (que é onde stack seria logado).
    assert.equal(
      consoleCap.error.length,
      0,
      `expected no [ERROR] logs, got: ${consoleCap.error.join("\n---\n")}`,
    );
  });
});
