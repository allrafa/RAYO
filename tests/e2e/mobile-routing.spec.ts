import { request, devices } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  loginViaApi,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  type TestUser,
} from "./helpers/api";

// Mobile routing — deep-link abre na tab certa, bottom nav navega entre
// abas, re-tap na ativa dispara scroll-top sem trocar URL.

const MOBILE_CTX = devices["iPhone 14"];

test.describe("Mobile / Routing — deep-link + bottom nav (Task #242)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]).catch(() => {});
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("deep-link /perfil/comentarios → PerfilPage abre direto na aba 'Comentários'", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-mob-dl"), name: "Mob Deep" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();
    await page.goto("/perfil/comentarios", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    // PerfilPage hidrata e a URL permanece em /perfil/comentarios (não é
    // redirecionada pra /perfil ou /perfil/posts).
    await expect(page).toHaveURL(/\/perfil\/comentarios$/, { timeout: 15_000 });

    await ctx.close();
  });

  test("bottom nav: navega Home → Comunidade → Home pelos botões da navegação inferior", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-mob-nav"), name: "Mob Nav" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    // Aguarda nav inferior hidratar (role=navigation, aria-label "Navegação principal").
    const nav = page.getByRole("navigation", { name: /Navegação principal/i });
    await expect(nav).toBeVisible({ timeout: 15_000 });

    await nav.getByRole("button", { name: /Comunidade/ }).first().click();
    await expect(page).toHaveURL(/\/comunidade(?:\/|$)/, { timeout: 10_000 });

    await nav.getByRole("button", { name: /Início/ }).first().click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

    await ctx.close();
  });

  test("re-tap na aba ativa NÃO troca URL (scroll-top only)", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-mob-retap"), name: "Mob Retap" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();
    await page.goto("/comunidade", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    const nav = page.getByRole("navigation", { name: /Navegação principal/i });
    await expect(nav).toBeVisible({ timeout: 15_000 });

    const before = page.url();
    await nav.getByRole("button", { name: /Comunidade/ }).first().click();
    // Aguarda um tick pra qualquer navigate processar.
    await page.waitForTimeout(500);
    const after = page.url();
    expect(new URL(after).pathname).toBe(new URL(before).pathname);

    await ctx.close();
  });
});
