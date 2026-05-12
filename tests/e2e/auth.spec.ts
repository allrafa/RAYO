import { request, devices } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  type TestUser,
} from "./helpers/api";

const MOBILE_CTX = devices["iPhone 14"];

test.describe("Auth — login pelo formulário UI", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("usuário existente loga via formulário e cai na home autenticada", async ({ browser, baseURL }) => {
    expect(baseURL, "baseURL precisa estar definido").toBeTruthy();

    // Registra usuário via API (verificação de email já pulada por helper)
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-auth"), name: "Login Teste" });
    await api.dispose();

    // Browser context limpo (sem cookies) — força fluxo de login real
    const ctx = await browser.newContext({ ...MOBILE_CTX });
    const page = await ctx.newPage();

    // App redireciona usuário não autenticado pra página de auth (modo login).
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Preenche e submete o form de login.
    const email = page.locator("#login-email");
    const password = page.locator("#login-password");
    await expect(email).toBeVisible({ timeout: 15_000 });
    await email.fill(user.email);
    await password.fill(user.password);
    await page.getByRole("button", { name: /Entrar no RAYO/i }).click();

    // Após login bem-sucedido a app vai pra "/" (replace) e a bottom nav
    // hidrata — usamos a aba Comunidade como âncora confiável (mesmo padrão
    // do messages.spec).
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /^Comunidade(,|$)/ }).first(),
    ).toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
