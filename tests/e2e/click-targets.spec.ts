// RITMO_PLAN.md F3 — Click-targets do post no mobile (padrão IG/X).
//
// Trava o contrato de navegação pra sempre:
//   1. Toque no CORPO do post (feed) → abre a página do post
//      (`/c/<slug>/p/<id>`), SEM teclado (composer não focado).
//   2. Botão "Comentar" → mesma página, COM o composer focado.
//   3. Voltar (history.back) → retorna ao feed.
//   4. Curtir (1 toque) → NÃO navega (continua no feed).
//   5. Avatar/nome do autor → perfil, não o post.
import { test, expect } from "./fixtures";
import { request, type APIRequestContext } from "@playwright/test";
import {
  registerUser,
  loginViaApi,
  makeTestEmail,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  type TestUser,
} from "./helpers/api";

const MOBILE_CTX = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

async function createPostViaApi(
  baseURL: string,
  user: TestUser,
  body: { title: string; content: string },
): Promise<{ id: number; forumSlug: string }> {
  const api: APIRequestContext = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const loginRes = await api.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  if (!loginRes.ok()) throw new Error(`login falhou: ${loginRes.status()}`);
  const res = await api.post("/api/community/posts", {
    data: { forum_id: 1, title: body.title, content: body.content, category: "discussao" },
  });
  if (!res.ok()) throw new Error(`createPost falhou: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  const post = json?.data?.post;
  const forumsRes = await api.get("/api/community/forums");
  const forums = (await forumsRes.json())?.data?.forums ?? [];
  const forum = forums.find((f: { id: number }) => f.id === 1);
  await api.dispose();
  if (!post?.id || !forum?.slug) throw new Error("createPost: post/slug ausente");
  return { id: post.id, forumSlug: forum.slug };
}

test.describe("Click-targets do post — padrão IG/X (RITMO_PLAN F3)", () => {
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

  test("corpo abre o post sem teclado; Comentar foca; back volta; curtir não navega", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();

    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, {
      email: makeTestEmail("test-ct"),
      name: "Clara Cliques",
    });
    await api.dispose();

    const stamp = Date.now();
    const postTitle = `Alvo de toque ${stamp}`;
    const post = await createPostViaApi(baseURL!, user, {
      title: postTitle,
      content: `Conteúdo do post de click-targets ${stamp}.`,
    });

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    // Feed da comunidade.
    await page.goto("/comunidade", { waitUntil: "domcontentloaded" });
    try {
      await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 });
    } catch { /* sem banner */ }

    const card = page
      .getByRole("button", { name: /Abrir discussão da publicação/ })
      .filter({ hasText: postTitle })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // ── 4. Curtir NÃO navega ─────────────────────────────────────────
    const likeBtn = card.getByRole("button", { name: /^Curtir$|Remover reação/ }).first();
    await likeBtn.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain("/comunidade"); // continua no feed
    await expect(card).toBeVisible();

    // ── 1. Toque no corpo → página do post, SEM teclado ─────────────
    // Clica no texto do conteúdo (área neutra do card).
    await card.getByText(`Conteúdo do post de click-targets ${stamp}.`).click();
    await expect(page).toHaveURL(new RegExp(`/c/${post.forumSlug}/p/${post.id}$`), { timeout: 15_000 });
    const composer = page.getByPlaceholder("Escreva um comentário…");
    await expect(composer).toBeVisible({ timeout: 15_000 });
    // Teclado NÃO deve ter subido: composer não é o elemento focado.
    const bodyFocused = await composer.evaluate((el) => document.activeElement === el);
    expect(bodyFocused, "composer não deve estar focado ao abrir pelo corpo").toBe(false);

    // ── 3. Voltar → feed ─────────────────────────────────────────────
    await page.goBack();
    await expect(page).toHaveURL(/\/comunidade/, { timeout: 15_000 });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // ── 2. Botão "Comentar" → mesma página, COM composer focado ─────
    await card.locator('[data-test="comment-btn"]').click();
    await expect(page).toHaveURL(new RegExp(`/c/${post.forumSlug}/p/${post.id}$`), { timeout: 15_000 });
    const composer2 = page.getByPlaceholder("Escreva um comentário…");
    await expect(composer2).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => composer2.evaluate((el) => document.activeElement === el), {
        timeout: 8_000,
        message: "composer deve receber foco vindo do botão Comentar",
      })
      .toBe(true);

    await ctx.close();
  });

  test("avatar/nome do autor abre o perfil, não o post", async ({ browser, baseURL }) => {
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, {
      email: makeTestEmail("test-ct2"),
      name: "Autor Perfil",
    });
    await api.dispose();

    const stamp = Date.now();
    const post = await createPostViaApi(baseURL!, user, {
      title: `Perfil alvo ${stamp}`,
      content: `Post pra teste de avatar ${stamp}.`,
    });

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();
    await page.goto("/comunidade", { waitUntil: "domcontentloaded" });
    try {
      await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 });
    } catch { /* sem banner */ }

    const card = page
      .getByRole("button", { name: /Abrir discussão da publicação/ })
      .filter({ hasText: `Perfil alvo ${stamp}` })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.getByRole("button", { name: /Abrir perfil de Autor Perfil/ }).first().click();
    // Perfil abre na rota /u/<id> — e NÃO a página do post.
    await expect(page).toHaveURL(/\/u\/\d+/, { timeout: 15_000 });
    expect(page.url()).not.toContain(`/p/${post.id}`);

    await ctx.close();
  });
});
