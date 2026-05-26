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

// Home Editor — admin cria um card de destaque via /api/admin/home-feed
// e outro user logado vê o card renderizado no feed da Home pública
// (que consome /api/home/feed via HomeContent).

const DESKTOP_CTX = { viewport: { width: 1280, height: 800 } } as const;

test.describe("Home / Destaques — admin adiciona card e outro user vê na Home (Task #242)", () => {
  let admin: TestUser;
  let viewer: TestUser;
  let pool: Pool;
  const createdItemIds: number[] = [];

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  const deactivatedSiblingIds: number[] = [];

  test.afterEach(async () => {
    if (createdItemIds.length) {
      await pool.query(`DELETE FROM home_feed_items WHERE id = ANY($1)`, [createdItemIds]).catch(() => {});
      createdItemIds.length = 0;
    }
    // Reativa os itens da seção que desativamos só pra dar lugar
    // ao card de teste (mantém o ambiente como encontramos).
    if (deactivatedSiblingIds.length) {
      await pool.query(
        `UPDATE home_feed_items SET is_active = TRUE WHERE id = ANY($1)`,
        [deactivatedSiblingIds],
      ).catch(() => {});
      deactivatedSiblingIds.length = 0;
    }
    const ids = [admin?.id, viewer?.id].filter((v): v is number => typeof v === "number");
    if (ids.length) await deleteUsersById(ids).catch(() => {});
  });

  test.afterAll(async () => {
    await pool?.end().catch(() => {});
    await closeDbPool();
  });

  test("admin cria card 'made_for_you' via API → viewer logado vê o título na Home", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    admin = await registerUser(api, { email: makeTestEmail("test-hf-adm"), name: "Adm Home" });
    viewer = await registerUser(api, { email: makeTestEmail("test-hf-vw"), name: "Vw Home", segments: ["solteiro"] });
    await api.dispose();
    await setUserRole(admin.id, "admin");

    // HomePage `made_for_you` renderiza só os 3 primeiros (slice(0,3)),
    // então desativamos qualquer card ativo pré-existente da seção pra
    // garantir que o card do teste seja visível independente do estado
    // do banco. `afterEach` restaura.
    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM home_feed_items WHERE section = 'made_for_you' AND is_active = TRUE`,
    );
    if (existing.rows.length) {
      const ids = existing.rows.map((r) => r.id);
      deactivatedSiblingIds.push(...ids);
      await pool.query(`UPDATE home_feed_items SET is_active = FALSE WHERE id = ANY($1)`, [ids]);
    }

    // Admin cria card via API.
    const adminApi = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    await adminApi.post("/api/auth/login", { data: { email: admin.email, password: admin.password } });
    const stamp = Date.now();
    const cardTitle = `Destaque E2E ${stamp}`;
    const createRes = await adminApi.post("/api/admin/home-feed", {
      data: {
        section: "made_for_you",
        title: cardTitle,
        subtitle: "subtitle teste",
        gradient: "from-purple-500 to-pink-500",
        sort_order: 0,
        is_active: true,
      },
    });
    expect(createRes.status(), await createRes.text()).toBeLessThan(300);
    const created = await createRes.json();
    const itemId = created?.data?.item?.id ?? created?.data?.id;
    expect(itemId).toBeTruthy();
    createdItemIds.push(itemId);
    await adminApi.dispose();

    // Viewer abre a Home e vê o card.
    const ctx = await browser.newContext(DESKTOP_CTX);
    await loginViaApi(ctx, baseURL!, viewer);
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Aguarda hidratação do feed (HomeContent monta com loading).
    await expect(page.getByText(cardTitle, { exact: false }).first())
      .toBeVisible({ timeout: 20_000 });

    // Edit path — admin renomeia o card via PATCH /api/admin/home-feed/:id
    // (mesma rota que o botão "Editar" do AdminHomeFeedPage consome) e
    // o viewer (após reload) vê o título novo no lugar do antigo.
    const editApi = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    await editApi.post("/api/auth/login", { data: { email: admin.email, password: admin.password } });
    const renamedTitle = `${cardTitle} EDITADO`;
    const patchRes = await editApi.patch(`/api/admin/home-feed/${itemId}`, {
      data: { title: renamedTitle },
    });
    expect(patchRes.status(), `edit: ${await patchRes.text()}`).toBeLessThan(300);
    await editApi.dispose();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(renamedTitle, { exact: false }).first())
      .toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
