import { request } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  loginViaApi,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  setUserRole,
  type TestUser,
} from "./helpers/api";
import { Pool } from "pg";

// CMS Producer — produtor cria/edita/arquiva conteúdo via /api/admin/cms.
// AdminCmsPage exige role >= producer. Como o formulário tem muitos
// campos type-specific (que aumentariam a área de flake), criamos os
// items via API e validamos lista + ações destrutivas pela UI.

const DESKTOP_CTX = { viewport: { width: 1280, height: 800 } } as const;

test.describe("CMS Producer — criar / listar / arquivar (Task #242)", () => {
  let producer: TestUser;
  let pool: Pool;
  const createdIds: number[] = [];

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (createdIds.length) {
      await pool.query(`DELETE FROM content_items WHERE id = ANY($1)`, [createdIds]).catch(() => {});
      createdIds.length = 0;
    }
    if (producer?.id) await deleteUsersById([producer.id]).catch(() => {});
  });

  test.afterAll(async () => {
    await pool?.end().catch(() => {});
    await closeDbPool();
  });

  test("producer cria 3 conteúdos (audio/video/livro) via API e vê os 3 na lista do CMS", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    producer = await registerUser(api, { email: makeTestEmail("test-prod"), name: "Pedro Producer" });
    await api.dispose();
    await setUserRole(producer.id, "producer");

    // Cria 3 itens via API (login como producer).
    const ctx = await browser.newContext(DESKTOP_CTX);
    await loginViaApi(ctx, baseURL!, producer);
    const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: producer.email, password: producer.password },
    });
    expect(loginRes.ok()).toBeTruthy();

    const stamp = Date.now();
    const kinds: Array<{ kind: "audio" | "video" | "livro"; title: string }> = [
      { kind: "audio", title: `Áudio Producer ${stamp}` },
      { kind: "video", title: `Vídeo Producer ${stamp}` },
      { kind: "livro", title: `Livro Producer ${stamp}` },
    ];
    for (const k of kinds) {
      const res = await apiCtx.post("/api/admin/cms", {
        data: {
          kind: k.kind,
          title: k.title,
          short_description: `Descrição ${k.kind}`,
          segments: ["solteiro"],
        },
      });
      expect(res.status(), `criar ${k.kind}: ${await res.text()}`).toBeLessThan(300);
      const body = await res.json();
      const id = body?.data?.item?.id ?? body?.data?.id;
      expect(id).toBeTruthy();
      createdIds.push(id);
    }
    await apiCtx.dispose();

    // Vai pro CMS no admin e verifica que os 3 títulos aparecem.
    const page = await ctx.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Conteúdo$/ }).first().click().catch(async () => {
      // Fallback: nome "CMS" ou link alternativo.
      await page.getByRole("button", { name: /CMS|Conteúdo/i }).first().click();
    });

    for (const k of kinds) {
      await expect(page.getByText(k.title, { exact: false }).first())
        .toBeVisible({ timeout: 15_000 });
    }

    await ctx.close();
  });

  test("producer arquiva um conteúdo via UI → status vira 'archived' no DB", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    producer = await registerUser(api, { email: makeTestEmail("test-prod-arch"), name: "Paula Producer" });
    await api.dispose();
    await setUserRole(producer.id, "producer");

    const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    await apiCtx.post("/api/auth/login", { data: { email: producer.email, password: producer.password } });
    const stamp = Date.now();
    const title = `Para arquivar ${stamp}`;
    const createRes = await apiCtx.post("/api/admin/cms", {
      data: { kind: "audio", title, short_description: "x", segments: ["solteiro"] },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const id = created?.data?.item?.id ?? created?.data?.id;
    expect(id).toBeTruthy();
    createdIds.push(id);
    await apiCtx.dispose();

    const ctx = await browser.newContext(DESKTOP_CTX);
    await loginViaApi(ctx, baseURL!, producer);
    const page = await ctx.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Conteúdo$/ }).first().click();

    // Localiza a row do item exato pelo título (h3) e sobe pro container
    // de listagem, garantindo que o "Arquivar" clicado é o desse item.
    const titleHeading = page.getByRole("heading", { level: 3, name: title });
    await expect(titleHeading).toBeVisible({ timeout: 15_000 });
    // O wrapper de cada item é o ancestral mais próximo que contém o botão
    // de arquivar; localizamos via `xpath` subindo da h3.
    const row = titleHeading.locator(
      'xpath=ancestor::*[.//button[@title="Arquivar" or normalize-space(.)="Arquivar"]][1]',
    );
    await expect(row).toBeVisible({ timeout: 5_000 });

    // Confirma o native window.confirm que aparece em algumas ações.
    page.once("dialog", (d) => void d.accept());

    const archiveBtn = row
      .locator('button[title="Arquivar"], button:has-text("Arquivar")')
      .first();

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/admin/cms/${id}/archive`) && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      archiveBtn.click(),
    ]);
    expect(resp.status()).toBeLessThan(300);

    // Confirma no DB.
    const { rows } = await pool.query<{ status: string }>(
      `SELECT status FROM content_items WHERE id = $1`,
      [id],
    );
    expect(rows[0]?.status).toBe("archived");

    await ctx.close();
  });
});
