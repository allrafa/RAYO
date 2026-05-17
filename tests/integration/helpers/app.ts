// Task #234 — Wrapper de teste em volta do `createApp()` de produção.
// Diferenças vs prod:
//   * `validateAuthEnv: false` e `logBunnyStatus: false` pra silenciar
//     logs de boot que poluem a saída do test runner.
//   * Anexa `errorHandler` ao final (em prod ele é anexado depois do
//     middleware Vite/SEO em `server/index.ts:start()`).
//   * Não faz I/O de boot — testes que precisarem de schema rodam
//     `ensureSchema()` (idempotente) do helper db.ts.
import type { Express } from "express";
import { createApp } from "../../../server/app.js";
import { errorHandler } from "../../../server/middleware/errorHandler.js";

export function createTestApp(): Express {
  const app = createApp({ validateAuthEnv: false, logBunnyStatus: false });
  app.use(errorHandler);
  return app;
}
