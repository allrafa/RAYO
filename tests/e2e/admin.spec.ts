import { request, devices } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  loginViaApi,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  setUserRole,
  createPostAsUser,
  type TestUser,
} from "./helpers/api";
import { Pool } from "pg";

// Admin — promote role (AdminUsersPage com Radix Select + window.confirm)
// + moderar post (AdminModerationPage botão "Ocultar").
// Roles promovidos via setUserRole helper (não via outro admin pré-existente).

// AdminShell é desktop-first (sidebar fixa). Usamos viewport desktop
// pra evitar issues de scroll/overflow.
const DESKTOP_CTX = { viewport: { width: 1280, height: 800 } } as const;

test.describe("Admin — promover role de usuário (Task #241)", () => {
  let admin: TestUser;
  let target: TestUser;
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    const ids = [admin?.id, target?.id].filter((v): v is number => typeof v === "number");
    if (ids.length) await deleteUsersById(ids).catch(() => {});
  });

  test.afterAll(async () => {
    await pool?.end().catch(() => {});
    await closeDbPool();
  });

  test("admin abre /admin/users → muda role de 'client' pra 'producer' → DB reflete", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    admin = await registerUser(api, { email: makeTestEmail("test-adm"), name: "Admin Test" });
    target = await registerUser(api, { email: makeTestEmail("test-adm-target"), name: "Target Promo" });
    await api.dispose();

    await setUserRole(admin.id, "admin");

    const ctx = await browser.newContext(DESKTOP_CTX);
    await loginViaApi(ctx, baseURL!, admin);
    const page = await ctx.newPage();

    // Filtra direto pelo email pra encontrar a linha do target sem paginação.
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    // AdminShell hidrata → sidebar com botão "Usuários".
    await page.getByRole("button", { name: /^Usuários$/ }).first().click();
    const search = page.getByPlaceholder(/Buscar por (email|nome)/i).first();
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.fill(target.email);
    await search.press("Enter"); // form com <Button type="submit">Buscar</Button>

    // Linha do target aparece na tabela.
    const row = page.locator("tr", { hasText: target.email }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // handleRoleChange usa window.confirm — aceita o dialog antes de
    // disparar a mudança.
    page.on("dialog", (d) => { void d.accept(); });

    // Radix Select trigger dentro da linha — role=combobox.
    const trigger = row.getByRole("combobox").first();
    await trigger.click();

    // Listbox flutuante com opções role=option.
    await page.getByRole("option", { name: /Produtor/ }).first().click();

    // Aguarda o badge da role refletir + DB confirmar.
    await expect.poll(
      async () => {
        const { rows } = await pool.query<{ role: string }>(
          `SELECT role FROM users WHERE id = $1`, [target.id],
        );
        return rows[0]?.role ?? null;
      },
      { timeout: 10_000, message: "role do target precisa virar producer" },
    ).toBe("producer");

    await ctx.close();
  });
});

test.describe("Admin — moderar post (Task #241)", () => {
  let admin: TestUser;
  let author: TestUser;
  let postId: number | null = null;
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (postId) {
      await pool.query(`DELETE FROM community_posts WHERE id = $1`, [postId]).catch(() => {});
      postId = null;
    }
    const ids = [admin?.id, author?.id].filter((v): v is number => typeof v === "number");
    if (ids.length) await deleteUsersById(ids).catch(() => {});
  });

  test.afterAll(async () => {
    await pool?.end().catch(() => {});
    await closeDbPool();
  });

  test("admin abre Moderação → clica 'Ocultar' → post fica com is_hidden=TRUE no DB", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    admin = await registerUser(api, { email: makeTestEmail("test-adm-mod"), name: "Mod Admin" });
    author = await registerUser(api, { email: makeTestEmail("test-adm-author"), name: "Post Author" });
    await api.dispose();

    await setUserRole(admin.id, "admin");

    const stamp = Date.now();
    const title = `Post pra moderar ${stamp}`;
    const created = await createPostAsUser(baseURL!, author, {
      title, content: `Conteúdo a ocultar ${stamp}`,
    });
    postId = created.id;

    const ctx = await browser.newContext(DESKTOP_CTX);
    await loginViaApi(ctx, baseURL!, admin);
    const page = await ctx.newPage();

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Moderação$/ }).first().click();

    // AdminModerationPage lista posts (status=visible por default).
    // Escopa TUDO ao .ra-card do post recém-criado — feeds com mais posts
    // têm múltiplos botões "Ocultar" e o `.first()` global pode clicar
    // no errado (review #241).
    const card = page.locator(".ra-card", { hasText: title }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    const hideBtn = card.getByRole("button", { name: /Ocultar/ }).first();
    await hideBtn.scrollIntoViewIfNeeded().catch(() => {});

    const [hideResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/admin\/moderation\/posts\/\d+\/hide$/.test(r.url())
          && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      hideBtn.click(),
    ]);
    expect(hideResp.status()).toBeGreaterThanOrEqual(200);
    expect(hideResp.status()).toBeLessThan(300);

    // DB reflete is_hidden=TRUE.
    await expect.poll(
      async () => {
        const { rows } = await pool.query<{ is_hidden: boolean }>(
          `SELECT is_hidden FROM community_posts WHERE id = $1`, [postId!],
        );
        return rows[0]?.is_hidden ?? null;
      },
      { timeout: 10_000, message: "post precisa ficar hidden após click em Ocultar" },
    ).toBe(true);

    await ctx.close();
  });
});
