import { defineConfig, devices } from "@playwright/test";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const baseURL = replitDomain
  ? `https://${replitDomain}`
  : process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5000";

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
  fullyParallel: false,
  workers: 1,
  retries: 0,
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
