import { request } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  registerUser,
  loginViaApi,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
  createTrailWithCourse,
  deleteTrailAndCourse,
  createSubscription,
  type TestUser,
} from "./helpers/api";
import { Pool } from "pg";

// Billing — gating de trilhas pagas + retorno post-checkout mockado.
//
// Sem assinatura: POST /api/academia/courses/:id/enroll devolve 402
// TRAIL_PAYMENT_REQUIRED, e /trilhas/:slug mostra o CTA "Ver planos da
// trilha" (TrailPaywall + TrilhaDetailPage).
// Após mock de subscription ativa via DB (espelho do webhook), o
// mesmo endpoint passa a responder 2xx.

test.describe("Billing — gating 402 + acesso após assinatura mockada (Task #242)", () => {
  let user: TestUser;
  let trailId: number | undefined;
  let courseId: number | undefined;
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 });
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    await deleteTrailAndCourse({ trailId, courseId }).catch(() => {});
    trailId = undefined; courseId = undefined;
    if (user?.id) await deleteUsersById([user.id]).catch(() => {});
  });

  test.afterAll(async () => {
    await pool?.end().catch(() => {});
    await closeDbPool();
  });

  test("client sem sub recebe 402 TRAIL_PAYMENT_REQUIRED ao tentar matricular em curso de trilha paga", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-bill-402"), name: "Bia Billing" });
    await api.dispose();

    const created = await createTrailWithCourse({ slugPrefix: "test-bill" });
    trailId = created.trailId; courseId = created.courseId;

    const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    await apiCtx.post("/api/auth/login", { data: { email: user.email, password: user.password } });
    const res = await apiCtx.post(`/api/courses/${courseId}/enroll`, { data: {} });
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body?.error?.code).toBe("TRAIL_PAYMENT_REQUIRED");
    expect(body?.error?.trail_id).toBe(trailId);
    expect(body?.error?.course_id).toBe(courseId);
    await apiCtx.dispose();
  });

  test("client sem sub abre /trilhas/:slug → vê CTA 'Ver planos / Assinar' (UI)", async ({ browser, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-bill-ui"), name: "Beto Billing" });
    await api.dispose();

    const created = await createTrailWithCourse({
      slugPrefix: "test-bill-ui",
      trailTitle: "Trilha Pública UI",
    });
    trailId = created.trailId; courseId = created.courseId;

    const ctx = await browser.newContext();
    await loginViaApi(ctx, baseURL!, user);
    const page = await ctx.newPage();
    await page.goto(`/trilhas/${created.trailSlug}`, { waitUntil: "domcontentloaded" });

    // TrilhaDetailPage exibe o título da trilha + algum CTA de checkout/assinar.
    await expect(page.getByText("Trilha Pública UI", { exact: false }).first())
      .toBeVisible({ timeout: 15_000 });
    const cta = page.getByRole("button", { name: /Assinar|Começar|planos/i }).first();
    const link = page.getByRole("link", { name: /Assinar|Começar|planos/i }).first();
    // Pelo menos um deles (botão ou link) precisa estar visível.
    const ctaVisible = await cta.isVisible().catch(() => false);
    const linkVisible = await link.isVisible().catch(() => false);
    expect(ctaVisible || linkVisible).toBeTruthy();

    await ctx.close();
  });

  test("mock post-checkout: INSERT subscriptions ativa → enroll passa a responder 2xx", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    user = await registerUser(api, { email: makeTestEmail("test-bill-ok"), name: "Bru Billing" });
    await api.dispose();

    const created = await createTrailWithCourse({ slugPrefix: "test-bill-ok" });
    trailId = created.trailId; courseId = created.courseId;

    // Mock pós-checkout — espelha o que upsertSubscriptionRow faria via webhook.
    await createSubscription({ userId: user.id, trailId: trailId!, status: "active" });

    const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
    await apiCtx.post("/api/auth/login", { data: { email: user.email, password: user.password } });

    const subs = await apiCtx.get("/api/billing/subscriptions");
    expect(subs.ok()).toBeTruthy();
    const subsBody = await subs.json();
    expect((subsBody?.data?.subscriptions ?? []).length).toBeGreaterThan(0);

    const enroll = await apiCtx.post(`/api/courses/${courseId}/enroll`, { data: {} });
    expect(enroll.status(), `enroll body: ${await enroll.text()}`).toBeLessThan(300);
    await apiCtx.dispose();
  });
});
