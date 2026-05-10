import { test as base, chromium, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Override do fixture `browser` pra conectar no Chromium spawneado pelo
 * `global-setup.ts` via CDP. Necessário porque `chromium.launch()` morre
 * no container do Replit (ver global-setup.ts pro motivo).
 */
export const test = base.extend<{}, { browser: Browser }>({
  browser: [
    async ({}, use) => {
      let wsEndpoint = process.env.E2E_WS_ENDPOINT;
      if (!wsEndpoint) {
        // global-setup roda em outro processo; lê do disco.
        wsEndpoint = readFileSync(
          path.resolve("tests/e2e/.artifacts/ws-endpoint.txt"),
          "utf8",
        ).trim();
      }
      const browser = await chromium.connectOverCDP(wsEndpoint);
      await use(browser);
      // Não chama browser.close() — isso desligaria o Chromium master.
      // Apenas desconecta. O teardown global mata o processo.
      await browser.close().catch(() => {});
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
