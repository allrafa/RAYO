import { defineConfig, devices } from "@playwright/test";

const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const baseURL = replitDomain
  ? `https://${replitDomain}`
  : process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5000";

const chromiumExecutable = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;

// Replit container não tem unprivileged user namespaces, então o sandbox
// do Chromium aborta. Rodamos com --no-sandbox (chromiumSandbox: false).
const chromiumLaunchOptions = {
  ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
  chromiumSandbox: false,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
};

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
  // O fixture custom em tests/e2e/fixtures.ts conecta via CDP no Chromium
  // spawneado pelo global-setup (workaround pro --inspector-pipe não
  // funcionar nesse container). Por isso não definimos `projects` com
  // launchOptions — qualquer device emulation é feita via newContext({...}).
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 14"] } },
  ],
});
