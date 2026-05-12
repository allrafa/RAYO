import { defineConfig, devices } from "@playwright/test";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const baseURL = replitDomain
  ? `https://${replitDomain}`
  : process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5000";

// Comparação explícita evita ativar paralelismo se algum runner exótico
// setar `CI="false"` (string truthy mas semanticamente desligada).
const isCI = process.env.CI === "true" || process.env.CI === "1";

// O lifecycle do browser é controlado pelo fixture custom em
// `tests/e2e/fixtures.ts` (CDP no Replit, `chromium.launch()` local).
// Aqui mantemos só baseURL, projects (viewport mobile) e artifacts.
export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/helpers/**", "**/fixtures.ts", "**/global-*.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Em CI cada job tem o próprio Postgres efêmero — dá pra paralelizar.
  // Localmente (dev share o banco) mantemos serial pra evitar contenção.
  // `--workers <N>` na CLI sobrescreve esse default.
  fullyParallel: isCI,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? Math.max(1, parseInt(process.env.PLAYWRIGHT_WORKERS, 10) || 1)
    : isCI
      ? 4
      : 1,
  retries: isCI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/.artifacts/report", open: "never" }],
  ],
  outputDir: "tests/e2e/.artifacts/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 14"] } },
  ],
});
