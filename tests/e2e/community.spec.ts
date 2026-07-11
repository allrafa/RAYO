import { request, devices, type APIRequestContext } from "@playwright/test";
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

/**
 * Cria um post via API REST autenticada — devolve o id do post.
 * Forum 1 ("Solteiros & Preparação") existe sempre por seed.
 */
async function createPostViaApi(
  baseURL: string,
  user: TestUser,
  body: { title: string; content: string; forum_id?: number },
): Promise<{ id: number; forumSlug: string }> {
  const api: APIRequestContext = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const loginRes = await api.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  if (!loginRes.ok()) throw new Error(`login falhou: ${loginRes.status()} ${await loginRes.text()}`);
  const res = await api.post("/api/community/posts", {
    data: {
      forum_id: body.forum_id ?? 1,
      title: body.title,
      content: body.content,
      category: "discussao",
    },
  });
  if (!res.ok()) throw new Error(`createPost falhou: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  const post = json?.data?.post;
  if (!post?.id) throw new Error(`createPost: resposta inesperada: ${JSON.stringify(json)}`);
  // Resolve slug do forum.
  const forumsRes = await api.get("/api/community/forums");
  const forums = (await forumsRes.json())?.data?.forums ?? [];
  const forum = forums.find((f: { id: number }) => f.id === (body.forum_id ?? 1));
  await api.dispose();
  return { id: post.id, forumSlug: forum?.slug ?? "solteiros-preparacao" };
}

test.describe("Comunidade — comentar em post via UI", () => {
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

  test("usuário cria post via API e adiciona comentário pelo painel da UI", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();

    // 1) Registra usuário e cria post via API (mais rápido + estável).
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-comm"), name: "Carlos Comunidade" });
    await api.dispose();

    const stamp = Date.now();
    const postTitle = `Post de teste ${stamp}`;
    const post = await createPostViaApi(baseURL!, user, {
      title: postTitle,
      content: `Conteúdo inicial do post ${stamp}.`,
    });

    // 2) Loga no browser e abre direto a discussão.
    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    // Hidrata sessão na home + navega via SPA pra comunidade (sem 2º
    // full-reload, que era flaky no dev server). O CustomEvent
    // `rayo:open-community` é o mesmo usado pela busca/cards e o
    // listener no AppContent navega pra /c/<slug>.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    try {
      await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 });
    } catch { /* sem banner */ }

    await page.evaluate((slug) => {
      try {
        sessionStorage.setItem("rayo-pending-community-slug", slug);
      } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug } }));
    }, post.forumSlug);

    // Card do post no CommunityDetailPage é um <button> que contém o título.
    const postCard = page.getByRole("button", { name: new RegExp(postTitle) }).first();
    await expect(postCard).toBeVisible({ timeout: 20_000 });
    await postCard.click();

    // DiscussionPage (Task #122) — composer usa ellipsis unicode "…" no placeholder.
    const composer = page.getByPlaceholder("Escreva um comentário…");
    await expect(composer).toBeVisible({ timeout: 20_000 });

    const commentText = `Comentário de teste ${stamp}`;
    await composer.fill(commentText);

    // Botão de envio fica abaixo da bottom nav no mobile — usa keyboard
    // shortcut do composer (Enter envia, Shift+Enter quebra linha).
    const sendBtn = page.getByRole("button", { name: "Enviar comentário" });
    await sendBtn.scrollIntoViewIfNeeded().catch(() => { /* noop */ });
    await sendBtn.dispatchEvent("click");

    // 3) Comentário aparece no painel.
    await expect(page.getByText(commentText).first()).toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });
});

// ── Task #241 — Comunidade: reagir com emoji + follow/unfollow fórum ──

test.describe("Comunidade — reagir em post (Task #241)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test("user reage com ❤️ → chip aparece com aria-label 'Remover reação ❤️'", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-react"), name: "Renata Reaction" });
    await api.dispose();

    const stamp = Date.now();
    const postTitle = `Post pra reagir ${stamp}`;
    const post = await createPostViaApi(baseURL!, user, {
      title: postTitle,
      content: `Conteúdo ${stamp}`,
    });

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    await page.evaluate((slug) => {
      try { sessionStorage.setItem("rayo-pending-community-slug", slug); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug } }));
    }, post.forumSlug);

    // A página da comunidade lista posts em formato compacto; o picker de
    // reação completo vive na DiscussionPage. Abrimos a discussão do post
    // recém-criado tocando no item da lista.
    const postItem = page.getByRole("button", { name: new RegExp(postTitle) }).first();
    await expect(postItem).toBeVisible({ timeout: 20_000 });
    await postItem.click();

    // UX_PLAN.md J1 — curtir agora é 1 toque: o botão "Curtir" aplica ❤️
    // direto (o leque de emojis fica no long-press/hover).
    const likeBtn = page.getByRole("button", { name: /^Curtir$/ }).first();
    await expect(likeBtn).toBeVisible({ timeout: 20_000 });
    await likeBtn.click();

    // O botão troca o aria-label pra "Remover reação ❤️" e o chip agregado
    // aparece — .first() cobre os dois matches esperados.
    await expect(page.getByRole("button", { name: /Remover reação ❤️/ }).first())
      .toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });
});

test.describe("Comunidade — seguir/parar de seguir fórum (Task #241)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test.afterAll(async () => { await closeDbPool(); });

  test("'Entrar' → vira 'Inscrito' → click de novo volta pra 'Entrar'", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-follow"), name: "Fabio Follow" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    // Navega pro fórum seed "financas-familiares" — precisa ser um fórum
    // FORA do segmento do usuário e diferente de "Geral": desde o UX_PLAN J2
    // o cadastro auto-inscreve o usuário no fórum do seu contexto de vida
    // (solteiro → solteiros-preparacao) + Geral, então esses já nascem
    // "Inscrito".
    await page.evaluate(() => {
      const slug = "financas-familiares";
      try { sessionStorage.setItem("rayo-pending-community-slug", slug); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug } }));
    });

    // CommunityDetailPage renderiza botão "Entrar" (não-inscrito) ou
    // "Inscrito" (já segue). Em conta nova, esperamos "Entrar".
    const entrarBtn = page.getByRole("button", { name: /^Entrar$/ }).first();
    await expect(entrarBtn).toBeVisible({ timeout: 20_000 });
    await entrarBtn.click();

    // Após subscribe, o mesmo botão re-renderiza como "Inscrito".
    await expect(page.getByRole("button", { name: /^Inscrito$/ }).first())
      .toBeVisible({ timeout: 10_000 });

    // Toggle off → volta pra "Entrar".
    await page.getByRole("button", { name: /^Inscrito$/ }).first().click();
    await expect(page.getByRole("button", { name: /^Entrar$/ }).first())
      .toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });
});
