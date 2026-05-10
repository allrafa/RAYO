import { test as base, chromium, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Override do fixture `browser` pra conectar no Chromium spawneado pelo
 * `global-setup.ts` via CDP. Necessário porque `chromium.launch()` morre
 * no container do Replit (ver global-setup.ts pro motivo).
 */
function readWsEndpoint(): string | null {
  const fromEnv = process.env.E2E_WS_ENDPOINT?.trim();
  if (fromEnv) return fromEnv;
  try {
    const fromFile = readFileSync(
      path.resolve("tests/e2e/.artifacts/ws-endpoint.txt"),
      "utf8",
    ).trim();
    return fromFile || null;
  } catch {
    return null;
  }
}

export const test = base.extend<{}, { browser: Browser }>({
  browser: [
    async ({}, use) => {
      const wsEndpoint = readWsEndpoint();
      if (wsEndpoint) {
        // Modo Replit: conecta no chromium spawneado pelo global-setup via CDP.
        const browser = await chromium.connectOverCDP(wsEndpoint);
        await use(browser);
        // `connectOverCDP` retorna um wrapper que ao fechar apenas desconecta —
        // o processo master é morto pelo `global-teardown.ts`.
        await browser.close().catch(() => {});
      } else {
        // Modo local: chromium bundled do Playwright (`npx playwright install chromium`).
        const browser = await chromium.launch({
          headless: !(process.env.PWDEBUG === "1" || process.env.HEADED === "1"),
        });
        await use(browser);
        await browser.close().catch(() => {});
      }
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
