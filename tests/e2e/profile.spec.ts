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

const MOBILE_CTX = devices["iPhone 14"];

test.describe("Perfil — editar nome e bio via UI", () => {
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

  test("usuário abre Editar Perfil, altera nome+bio e vê confirmação", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();

    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-perfil"), name: "Pedro Original" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/perfil", { waitUntil: "domcontentloaded" });

    try {
      await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 });
    } catch { /* sem banner */ }

    // Abre o modal "Editar Perfil" — entrada vive no menu de configurações
    // do PerfilPage. O botão expõe label visível "Editar Perfil".
    const editBtn = page.getByRole("button", { name: /Editar Perfil/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 20_000 });
    await editBtn.click();

    // Modal abre — campos têm IDs `edit-name` e `edit-bio` (PerfilModals.tsx).
    const nameInput = page.locator("#edit-name");
    const bioInput = page.locator("#edit-bio");
    await expect(nameInput).toBeVisible({ timeout: 8_000 });

    const stamp = Date.now();
    const newName = `Pedro Editado ${stamp}`;
    const newBio = `Bio atualizada em teste ${stamp}`;

    await nameInput.fill(newName);
    await bioInput.fill(newBio);

    await page.getByRole("button", { name: /^Salvar$/ }).click();

    // Toast de sucesso ("Perfil atualizado!") indica que o save passou.
    await expect(page.getByText("Perfil atualizado!").first()).toBeVisible({ timeout: 8_000 });

    // Validação cruzada via API: o backend persistiu mesmo (mais confiável
    // que checar a re-renderização da header do perfil, que depende de
    // refetch do contexto).
    const apiCheck = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const loginRes = await apiCheck.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const meRes = await apiCheck.get("/api/auth/me");
    const me = await meRes.json();
    expect(me?.data?.user?.name).toBe(newName);
    await apiCheck.dispose();

    await ctx.close();
  });
});
