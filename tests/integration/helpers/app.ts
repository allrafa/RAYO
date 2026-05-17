// Task #234 — Wrapper de teste em volta do `createApp()` de produção.
// Diferenças vs prod:
//   * `validateAuthEnv: false` e `logBunnyStatus: false` pra silenciar
//     logs de boot que poluem a saída do test runner.
//   * Anexa `errorHandler` ao final (em prod ele é anexado depois do
//     middleware Vite/SEO em `server/index.ts:start()`).
//   * Não faz I/O de boot — testes que precisarem de schema rodam
//     `ensureSchema()` (idempotente) do helper db.ts.
//   * Task #236 — `mountTestPublicSeo()` exposto separadamente pra testes
//     HTTP de SEO público (sitemap/robots/HTML). É async (precisa ler
//     `package.json` mtime no boot do sitemap), por isso vive fora do
//     `createTestApp` sync que outros 13 specs já usam.
import type { Express } from "express";
import { createApp } from "../../../server/app.js";
import { errorHandler } from "../../../server/middleware/errorHandler.js";
import {
  mountPublicSitemapAndRobots,
  mountPublicSeoHtml,
} from "../../../server/features/seo/publicRoutes.js";

export function createTestApp(): Express {
  const app = createApp({ validateAuthEnv: false, logBunnyStatus: false });
  app.use(errorHandler);
  return app;
}

const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>RAYO</title>
    <meta name="description" content="Default description" />
  </head>
  <body><div id="root"></div></body>
</html>
`;

// Task #236 — Variante que monta as rotas públicas SEO (sitemap.xml,
// robots.txt, middleware HTML meta-injection) com um template stub.
// errorHandler é anexado no fim pra preservar o contrato de erros.
export async function createTestAppWithPublicSeo(
  indexHtml: string = DEFAULT_INDEX_HTML,
): Promise<Express> {
  const app = createApp({ validateAuthEnv: false, logBunnyStatus: false });
  await mountPublicSitemapAndRobots(app);
  mountPublicSeoHtml(app, async () => indexHtml);
  app.use(errorHandler);
  return app;
}
