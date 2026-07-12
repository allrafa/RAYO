// Task #206 — Trava o comportamento corrigido na Task #205:
//   1) Login social marca o e-mail como verified silenciosamente, então
//      um usuário OAuth recém-criado consegue criar comunidade direto
//      (POST /api/community/forums devolve 201) sem ver "Confirme seu
//      e-mail".
//   2) Quem se cadastrou só por e-mail e nunca confirmou continua sendo
//      barrado pelo gating, vê o painel inline `EmailVerificationInline`,
//      confirma o código (helper insere a row unverified) e a comunidade
//      é criada na sequência sem perder os campos do form.
//
// Os testes não dependem do provider OAuth real — `createOAuthUserWithSession`
// replica o estado de DB que `findOrCreateOAuthUser` deixa após o callback
// (user com google_id, verified=TRUE, sessão válida).
import { request } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUnverifiedUser,
  insertUnverifiedCode,
  createOAuthUserWithSession,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  type TestUser,
} from "./helpers/api";

test.describe("Login social não pede confirmação de e-mail (Task #206)", () => {
  const cleanupIds: number[] = [];

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (cleanupIds.length > 0) {
      await deleteUsersById(cleanupIds.splice(0));
    }
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("usuário OAuth recém-criado consegue criar comunidade direto (sem painel de confirmação)", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();

    // Replica o estado pós-callback OAuth (user + verified row + sessão).
    const oauthUser = await createOAuthUserWithSession({
      email: makeTestEmail("test-oauth-direct"),
      name: "Olivia OAuth",
    });
    cleanupIds.push(oauthUser.id);

    // Cliente API com cookie de sessão setado manualmente — equivale ao
    // que o navegador enviaria após bater no callback /auth/google/callback.
    const api = await request.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        Cookie: `session_token=${oauthUser.sessionToken}`,
      },
    });

    // Sanity check: a sessão é reconhecida.
    const me = await api.get("/api/auth/me");
    expect(me.status(), "sessão OAuth deve funcionar pra /api/auth/me").toBe(200);
    const meBody = await me.json();
    expect(meBody?.data?.user?.id).toBe(oauthUser.id);

    const stamp = Date.now();
    const res = await api.post("/api/community/forums", {
      data: {
        name: `Comunidade OAuth ${stamp}`,
        description: "Criada direto após login social.",
        icon: "💬",
        category: "Outros",
        // Capa é obrigatória na criação (COVER_REQUIRED); a API aceita só
        // sentinels objstore://forums/* e degrada a resolução com elegância.
        cover_url: "objstore://forums/e2e-test-cover.jpg",
      },
    });

    // 201 (criação) — NUNCA 403 EMAIL_NOT_VERIFIED.
    expect(
      res.status(),
      `esperava 201; recebeu ${res.status()} body=${await res.text()}`,
    ).toBe(201);
    const body = await res.json();
    expect(body?.success).toBe(true);
    expect(body?.data?.forum?.slug).toMatch(/^[a-z0-9-]+$/);

    await api.dispose();
  });

  // Gate de ambiente (mesmo padrão da Task #267 em cms/sentinels.test.ts):
  // este fluxo cria a comunidade PELA UI, e o modal exige capa obrigatória
  // — a capa passa por crop + upload no Object Storage (sentinel objstore://).
  // Sem Object Storage (CI), não dá pra concluir o upload e habilitar o
  // submit. O comportamento de gating por e-mail já é coberto via API no
  // teste ":44 recém-criado consegue criar comunidade direto". Roda de fato
  // no Replit, onde o Object Storage está disponível.
  const OBJECT_STORAGE_CONFIGURED = Boolean(process.env.PUBLIC_OBJECT_SEARCH_PATHS);
  test("usuário sem confirmar e-mail vê painel inline, confirma código e comunidade é criada na sequência", async ({ browser, baseURL }) => {
    test.skip(!OBJECT_STORAGE_CONFIGURED, "Requer Object Storage (capa da comunidade) — indisponível no CI");
    expect(baseURL).toBeTruthy();

    // Registra user mas remove a verified row → estado "cadastrou por
    // e-mail e ainda não confirmou".
    const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const user: TestUser = await registerUnverifiedUser(apiCtx, {
      email: makeTestEmail("test-inline"),
      name: "Inês Inline",
    });
    cleanupIds.push(user.id);
    await apiCtx.dispose();

    const ctx = await browser.newContext();
    // Login via API → cookie no contexto.
    const apiForLogin = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const loginRes = await apiForLogin.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    expect(loginRes.ok(), `login falhou: ${loginRes.status()}`).toBeTruthy();
    const cookies = (await apiForLogin.storageState()).cookies;
    await ctx.addCookies(cookies);
    await apiForLogin.dispose();

    const page = await ctx.newPage();
    // Mesmo padrão do community.spec.ts: deep-link direto pra /comunidade
    // dispara ChunkLoadError no RouteErrorBoundary em dev. Carrega "/"
    // primeiro e navega pelo SPA via custom event reusado pela busca/cards.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    try {
      await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 });
    } catch { /* sem banner */ }
    await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().click();

    // O botão "Criar" da view Comunidades só aparece pra autenticados (Task #198).
    // ComunidadePage tem 3 tabs internas (Feed | Comunidades | Mensagens) — precisamos da aba "Comunidades".
    const comunidadesTab = page.getByRole("button", { name: /^Comunidades$/ }).first();
    await expect(comunidadesTab).toBeVisible({ timeout: 20_000 });
    await comunidadesTab.click();
    const criarBtn = page.getByRole("button", { name: /^Criar$/ }).first();
    await expect(criarBtn).toBeVisible({ timeout: 20_000 });
    await criarBtn.click();

    // Modal abriu — preenche campos mínimos.
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    const stamp = Date.now();
    const forumName = `Comunidade Inline ${stamp}`;
    await modal.getByPlaceholder("Ex: Casados em Cristo").fill(forumName);
    // Categoria "Outros" sempre existe na lista CATEGORY_CHOICES.
    await modal.getByRole("button", { name: "Outros" }).click();

    // Submeter — backend devolve 403 EMAIL_NOT_VERIFIED → modal troca pro painel.
    // Em mobile o modal scrolla por dentro do DialogContent — o botão fica
    // abaixo do viewport mesmo após scrollIntoView. Disparamos o click
    // direto via DOM pra evitar o "outside of the viewport" do Playwright.
    const submitBtn = modal.getByRole("button", { name: /^Criar comunidade$/ });
    await submitBtn.scrollIntoViewIfNeeded();
    // Espera explicitamente o POST devolver 403 antes de assertar UI.
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/api/community/forums") && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      submitBtn.evaluate((el) => (el as HTMLButtonElement).click()),
    ]);
    expect(resp.status(), `esperava 403 EMAIL_NOT_VERIFIED, veio ${resp.status()}`).toBe(403);

    // Painel inline apareceu — confirma pelo botão exclusivo dele.
    await expect(modal.getByRole("button", { name: /Já tenho um código/i })).toBeVisible({ timeout: 10_000 });

    // Pula o reenvio (cooldown / Resend ausente em teste): clica "Já tenho um código".
    await modal.getByRole("button", { name: /Já tenho um código/i }).click();

    // Insere código não-verificado conhecido direto no DB. /api/auth/verify-code
    // vai marcar verified=TRUE quando o usuário digitar e clicar Confirmar.
    const KNOWN_CODE = "123456";
    await insertUnverifiedCode(user.email, KNOWN_CODE);

    const codeInput = modal.getByLabel("Código de 6 dígitos");
    await expect(codeInput).toBeVisible({ timeout: 10_000 });
    await codeInput.fill(KNOWN_CODE);

    await modal.getByRole("button", { name: /^Confirmar e continuar$/ }).click();

    // Após confirmar, o modal re-submete a criação automaticamente
    // (onVerified → onSubmit). Toast de sucesso aparece e o modal fecha.
    await expect(modal).toBeHidden({ timeout: 15_000 });

    // Verifica via API que a comunidade foi criada de fato (autoritativo).
    const verifyApi = await request.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      storageState: await ctx.storageState(),
    });
    const forumsRes = await verifyApi.get("/api/community/forums");
    const forumsBody = await forumsRes.json();
    const created = (forumsBody?.data?.forums ?? []).find(
      (f: { name: string }) => f.name === forumName,
    );
    expect(created, "comunidade deveria ter sido criada após confirmar e-mail").toBeTruthy();
    await verifyApi.dispose();

    await ctx.close();
  });
});
