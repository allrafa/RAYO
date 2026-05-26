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
import { Pool } from "pg";

// LGPD — export + delete. Os botões vivem na PerfilPage (aba Conta).
// Export: POST /api/lgpd/data-export devolve { export } com snapshot do user.
// Delete: POST /api/lgpd/data-deletion remove user e dependências; UI desloga.

const MOBILE_CTX = devices["iPhone 14"];

test.describe("LGPD — exportar dados (Task #241)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test("user clica em 'Exportar meus dados' → POST /api/lgpd/data-export responde 200 com dados próprios", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-lgpd-exp"), name: "Lúcia Export" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/perfil", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    // Aguarda PerfilPage hidratar.
    await expect(page.getByRole("button", { name: /Sair da Conta/i }).first())
      .toBeVisible({ timeout: 15_000 });

    const exportBtn = page.getByRole("button", { name: /Exportar meus dados/ }).first();
    await exportBtn.scrollIntoViewIfNeeded().catch(() => { /* noop */ });

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/lgpd/data-export") && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      exportBtn.click(),
    ]);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // Service devolve { message, export: { profile, conversations, ... } }.
    expect(body?.data?.export ?? body?.export).toBeTruthy();
    const exp = body?.data?.export ?? body?.export;
    // O snapshot precisa conter o próprio user (por id ou email).
    const exportStr = JSON.stringify(exp);
    expect(exportStr).toContain(user.email);

    await ctx.close();
  });
});

test.describe("LGPD — excluir conta (Task #241)", () => {
  let user: TestUser;
  let lgpdPool: Pool;
  let userDeletedByEndpoint = false;

  test.beforeAll(async () => {
    lgpdPool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    // Se o teste passou e o endpoint excluiu o user, não precisa de cleanup.
    if (user?.id && !userDeletedByEndpoint) {
      await deleteUsersById([user.id]).catch(() => { /* noop */ });
    }
    userDeletedByEndpoint = false;
  });

  test.afterAll(async () => {
    await lgpdPool?.end().catch(() => {});
    await closeDbPool();
  });

  test("user confirma 'Sim, excluir' → POST /api/lgpd/data-deletion 200 + linha removida do users", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-lgpd-del"), name: "Diego Delete" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/perfil", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    await expect(page.getByRole("button", { name: /Sair da Conta/i }).first())
      .toBeVisible({ timeout: 15_000 });

    // Abre o modal de exclusão.
    const trigger = page.getByRole("button", { name: /Excluir minha conta/ }).first();
    await trigger.scrollIntoViewIfNeeded().catch(() => { /* noop */ });
    await trigger.click();

    // Modal aparece com botão "Sim, excluir". Pode haver textbox de
    // confirmação (digitar "EXCLUIR") — preenche se existir.
    const confirmInput = page.getByPlaceholder(/EXCLUIR|excluir/i).first();
    try {
      await confirmInput.waitFor({ timeout: 2_000 });
      await confirmInput.fill("EXCLUIR");
    } catch { /* sem input de confirmação — segue */ }

    const confirmBtn = page.getByRole("button", { name: /Sim, excluir/ }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/lgpd/data-deletion") && r.request().method() === "POST",
        { timeout: 20_000 },
      ),
      confirmBtn.click(),
    ]);
    expect(resp.status()).toBe(200);

    // DB: linha do user some.
    const { rows } = await lgpdPool.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1`,
      [user.id],
    );
    expect(rows.length).toBe(0);
    userDeletedByEndpoint = true;

    await ctx.close();
  });
});
