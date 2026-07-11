import { request, devices } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  insertPasswordResetToken,
  loginViaApi,
  type TestUser,
} from "./helpers/api";
import { Pool } from "pg";

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

// ── Task #241 — Auth: registro UI completo + reset password + logout/re-login ──

const databaseUrl = process.env.DATABASE_URL!;
let authPool = new Pool({ connectionString: databaseUrl, max: 2 });

test.describe("Auth — registro via UI com código de verificação (Task #241)", () => {
  let user: TestUser | null = null;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) {
      await deleteUsersById([user.id]);
      user = null;
    }
  });

  test("envia código → preenche dígitos → cria conta com senha → home", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const email = makeTestEmail("test-reg-ui");
    const name = "Registro UI";
    const password = "Senha!Forte987";

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    const page = await ctx.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    // Dispensa o banner de cookies (overlay fixo no rodapé que, no mobile,
    // intercepta o clique no botão "Enviar código").
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 3_000 }); } catch { /* sem banner */ }

    // Troca pra modo registro (botão "Criar conta" na sub-copy do login).
    await page.getByRole("button", { name: /^Criar conta$/ }).first().click();
    await page.locator("#register-name").fill(name);
    await page.locator("#register-email").fill(email);
    await page.getByRole("button", { name: /Enviar c[óo]digo por email/i }).click();

    // Só depois que a tela "Verificar email" renderiza (setRegisterStep
    // ="verify") é que o send-code terminou o round-trip e gravou a row.
    // Sem esta espera, a query ao DB corria antes do INSERT no CI (mais
    // lento, 4 workers) e voltava 0 rows.
    const digit0 = page.getByLabel(/D[íi]gito 1 de 6/);
    await expect(digit0).toBeVisible({ timeout: 15_000 });

    // Backend inseriu o código em email_verification_codes (mesmo se Resend
    // falhar, em dev o código é logado e a rota responde 200).
    const codeRow = await authPool.query<{ code: string }>(
      `SELECT code FROM email_verification_codes
         WHERE email = $1 AND verified = FALSE
         ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    expect(codeRow.rows.length).toBe(1);
    const code = codeRow.rows[0].code;
    expect(code).toMatch(/^\d{6}$/);

    // Preenche os 6 dígitos. O input idx=0 aceita paste completo
    // (maxLength=6); preencher só ele dispara o split via handleCodeInput.
    await digit0.fill(code);
    // UX_PLAN J5 — ao completar o 6º dígito a verificação dispara sozinha.
    // O clique manual em "Verificar código" é só um fallback caso o
    // auto-submit ainda não tenha avançado (por isso tolerante a timeout).
    await page.getByRole("button", { name: /Verificar c[óo]digo/i })
      .click({ timeout: 3_000 }).catch(() => { /* auto-submit já avançou */ });

    // Etapa "password" do registro.
    const pwd = page.locator("#register-password");
    await expect(pwd).toBeVisible({ timeout: 10_000 });
    await pwd.fill(password);
    await page.getByRole("button", { name: /Criar minha conta/i }).click();

    // Login bem-sucedido → bottom nav hidrata.
    await expect(
      page.getByRole("button", { name: /^Comunidade(,|$)/ }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // Captura id pra cleanup.
    const u = await authPool.query<{ id: number }>(`SELECT id FROM users WHERE email = $1`, [email]);
    expect(u.rows.length).toBe(1);
    user = { id: u.rows[0].id, email, name, password };

    await ctx.close();
  });
});

test.describe("Auth — reset password fluxo completo (Task #241)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test("token via DB → /?reset_token=… → nova senha → login com nova senha", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-reset"), name: "Reset User" });
    await api.dispose();

    // Insere o token direto no DB (espelhando createPasswordResetToken).
    const rawToken = await insertPasswordResetToken(user.id);
    const newPassword = "NovaSenha!2026";

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    const page = await ctx.newPage();
    // App.tsx intercepta ?reset_token na raiz e abre AuthPage no modo reset.
    await page.goto(`/?reset_token=${rawToken}`, { waitUntil: "domcontentloaded" });

    const pwd = page.locator("#reset-password");
    await expect(pwd).toBeVisible({ timeout: 15_000 });
    await pwd.fill(newPassword);

    // Espera a request `/api/auth/reset-password` completar com 2xx ANTES
    // de tentar login com a nova senha — sem isso há corrida em CI lento
    // (review #241).
    const [resetResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/reset-password")
          && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      page.getByRole("button", { name: /Redefinir senha/i }).click(),
    ]);
    expect(resetResp.status()).toBeGreaterThanOrEqual(200);
    expect(resetResp.status()).toBeLessThan(300);

    // Após reset bem-sucedido, App volta pro fluxo de login. Tentamos
    // logar via API com a senha NOVA — se o reset valeu, o login passa.
    const verifyApi = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const loginRes = await verifyApi.post("/api/auth/login", {
      data: { email: user.email, password: newPassword },
    });
    expect(loginRes.ok(), `login com nova senha falhou: ${loginRes.status()} ${await loginRes.text()}`).toBeTruthy();
    // E a senha antiga não pode mais valer.
    const oldLoginRes = await verifyApi.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });
    expect(oldLoginRes.status()).toBe(401);
    await verifyApi.dispose();

    await ctx.close();
  });
});

test.describe("Auth — logout via UI + re-login (Task #241)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteUsersById([user.id]);
  });

  test.afterAll(async () => {
    await authPool.end().catch(() => {});
    await closeDbPool();
  });

  test("user logado clica em Sair da Conta no perfil → cai no /login → loga de novo", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-logout"), name: "Logout User" });
    await api.dispose();

    const ctx = await browser.newContext({ ...MOBILE_CTX });
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();

    await page.goto("/perfil", { waitUntil: "domcontentloaded" });
    try { await page.getByRole("button", { name: /^Aceitar$/ }).click({ timeout: 2_000 }); } catch { /* noop */ }

    const logoutBtn = page.getByRole("button", { name: /Sair da Conta/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 20_000 });
    await logoutBtn.scrollIntoViewIfNeeded().catch(() => { /* noop */ });
    await logoutBtn.click();

    // Após logout, o App mostra a tela de auth como gate (derivada do estado,
    // sem trocar a URL). O sinal observável é o formulário de login aparecer.
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 15_000 });

    // Re-login via mesmo form.
    await page.locator("#login-email").fill(user.email);
    await page.locator("#login-password").fill(user.password);
    await page.getByRole("button", { name: /Entrar no RAYO/i }).click();
    await expect(
      page.getByRole("button", { name: /^Comunidade(,|$)/ }).first(),
    ).toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
