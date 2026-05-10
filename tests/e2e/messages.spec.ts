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

// Garante que `browser.newContext()` continue rodando em viewport mobile
// mesmo lançando contextos manuais (cookies isolados por usuário). Sem
// isso, o `devices["iPhone 14"]` configurado em `playwright.config.ts`
// só se aplica a `page`/`context` fixtures — bypassado quando criamos
// contextos do `browser` direto.
const MOBILE_CTX = devices["iPhone 14"];

test.describe("DM — fluxo crítico de Mensagens", () => {
  let userA: TestUser;
  let userB: TestUser;

  test.beforeAll(async () => {
    // Safety net: limpa restos de runs anteriores que não fizeram cleanup.
    await deleteAllTestUsersByEmailPrefix("test-");
  });

  test.afterEach(async () => {
    const ids = [userA?.id, userB?.id].filter((v): v is number => typeof v === "number");
    if (ids.length) await deleteUsersById(ids);
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("usuário A inicia conversa com B; B vê mensagem na lista e abre", async ({ browser, baseURL }) => {
    expect(baseURL, "baseURL precisa estar definido (REPLIT_DEV_DOMAIN ou PLAYWRIGHT_BASE_URL)").toBeTruthy();

    // 1) Cria os dois usuários via API REST do app
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    userA = await registerUser(api, { email: makeTestEmail("test-a"), name: "Ana Teste" });
    userB = await registerUser(api, { email: makeTestEmail("test-b"), name: "Bruno Teste" });
    await api.dispose();

    // 2) Browser context A — loga e manda mensagem (viewport mobile)
    const ctxA = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctxA, baseURL!, userA);
    const pageA = await ctxA.newPage();

    // /conversas é a rota direta da aba Mensagens (montada via App.tsx).
    // Aceita variações: a app pode montar como ?tab=conversas ou rota.
    // ConversasPage chama window.history sobre /conversas, então vamos
    // navegar pra raiz e clicar na pílula "Mensagens" via aria-label.
    await pageA.goto("/", { waitUntil: "domcontentloaded" });
    // App usa SSE — networkidle nunca dispara. Espera pela bottom nav hidratar.
    await pageA.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    await dismissCookieBanner(pageA);
    await openMessagesTab(pageA);

    // 3) Botão "Nova" → digita nome → seleciona usuário B
    await pageA.getByRole("button", { name: /^Nova$/ }).click();
    const dialog = pageA.getByRole("dialog");
    await expect(dialog.getByText("Nova conversa")).toBeVisible();
    await dialog.getByPlaceholder("Nome ou e-mail...").fill("Bruno Teste");
    // Resultado da busca (button com nome)
    const resultBtn = dialog.getByRole("button", { name: /Bruno Teste/ });
    await expect(resultBtn).toBeVisible({ timeout: 8_000 });
    await resultBtn.click();

    // 4) Composer aparece; digita e envia
    const composer = pageA.getByPlaceholder("Digite sua mensagem...");
    await expect(composer).toBeVisible();
    const messageText = `oi do A para B ${Date.now()}`;
    await composer.fill(messageText);
    await pageA.getByRole("button", { name: "Enviar mensagem" }).click();

    // Mensagem aparece no thread do A. Filtra pelo bubble (não pela
    // preview "Você: ..." que aparece na lista de conversas adjacente).
    await expect(
      pageA.locator(".ra-chat-bubble", { hasText: messageText }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // 5) Browser context B (cookies isolados, viewport mobile) — loga e checa lista
    const ctxB = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctxB, baseURL!, userB);
    const pageB = await ctxB.newPage();
    await pageB.goto("/", { waitUntil: "domcontentloaded" });
    await pageB.getByRole("button", { name: /^Comunidade(,|$)/ }).first().waitFor({ timeout: 20_000 });
    await dismissCookieBanner(pageB);
    await openMessagesTab(pageB);

    // Conversa nova aparece na lista com nome do A E preview da última mensagem
    // (validação dupla: nome + snippet "Você:..." NÃO — esse seria do A;
    // do lado do B o preview vem cru, sem prefixo).
    const convItem = pageB.locator(".ra-disc-item, [role='listitem']", {
      hasText: "Ana Teste",
    }).first();
    await expect(convItem).toBeVisible({ timeout: 8_000 });
    await expect(convItem).toContainText(messageText, { timeout: 8_000 });
    await convItem.click();

    // Mensagem do A aparece pro B (bubble, não preview da lista)
    await expect(
      pageB.locator(".ra-chat-bubble", { hasText: messageText }).first(),
    ).toBeVisible({ timeout: 8_000 });

    await ctxA.close();
    await ctxB.close();
  });
});

/**
 * Abre a aba Mensagens. Mensagens não é uma aba própria — vive como pílula
 * "Mensagens" dentro do header da Comunidade (Task #93). Fluxo: clica
 * Comunidade na bottom nav → clica pílula Mensagens.
 */
/**
 * Banner de cookies (LGPD) cobre a bottom nav. Aceita pra liberar cliques.
 * No-op se já tiver sido aceito ou não estiver visível.
 */
async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const aceitar = page.getByRole("button", { name: /^Aceitar$/ });
  try {
    await aceitar.click({ timeout: 2_000 });
  } catch {
    // banner não visível — segue
  }
}

async function openMessagesTab(page: import("@playwright/test").Page) {
  // Bottom nav usa <button>; aria-label da aba Comunidade pode ter sufixo
  // dinâmico ("Comunidade, X mensagens não lidas..."), então casamos por prefixo.
  await page.getByRole("button", { name: /^Comunidade(,|$)/ }).first().click();
  await page.getByRole("button", { name: "Mensagens" }).first().click();
  await expect(page.getByRole("heading", { name: "Mensagens" })).toBeVisible({ timeout: 8_000 });
}
