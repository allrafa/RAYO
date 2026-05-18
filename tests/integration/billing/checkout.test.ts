// Task #239 — POST /api/trails/:slug/checkout
//
// Cobre: 401 sem auth, INVALID_INTERVAL, TRAIL_NOT_FOUND, ALREADY_SUBSCRIBED,
// PRICE_NOT_CONFIGURED, CHECKOUT_FAILED, e o caminho feliz (cria customer,
// cria session, devolve url). Stripe SDK stubado via `__setStripeClientForTest`.
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __setStripeClientForTest,
} from "../../../server/stripeClient.js";
import {
  closeDbPool,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import {
  ensureBillingSchema,
  resetBillingCaches,
  createTrail,
  insertSubscription,
  createMockStripe,
  type MockStripeCalls,
} from "../helpers/billing.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface CheckoutOk { success: true; data: { url: string }; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureBillingSchema(); });
afterEach(async () => {
  await truncateAll();
  resetBillingCaches(); // limpa cache de trail + buckets do rate-limiter
  __setStripeClientForTest(null);
});
after(async () => {
  __setStripeClientForTest(null);
  await closeDbPool();
});

describe("Billing / POST /api/trails/:slug/checkout (Task #239)", () => {
  let mockCalls: MockStripeCalls;
  beforeEach(() => {
    const m = createMockStripe();
    mockCalls = m.calls;
    __setStripeClientForTest(m.client);
  });

  it("401 sem cookie (rota é requireAuth)", async () => {
    const trail = await createTrail({ slug: "t-401" });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        body: { interval: "month" },
      });
      assert.equal(r.status, 401);
    });
  });

  it("INVALID_INTERVAL → 400", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "t-int" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "weekly" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_INTERVAL");
    });
  });

  it("TRAIL_NOT_FOUND → 404", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/trails/nao-existe/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "TRAIL_NOT_FOUND");
    });
  });

  it("ALREADY_SUBSCRIBED quando user já tem subscription ativa → 409", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "t-dup" });
    await insertSubscription({
      user_id: u.id,
      trail_id: trail.id,
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 86400e3),
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, "ALREADY_SUBSCRIBED");
      // Stub Stripe NÃO foi chamado: backend cortou antes
      assert.equal(mockCalls.checkoutCreate.length, 0);
    });
  });

  it("PRICE_NOT_CONFIGURED → 503 quando trail sem stripe_price_id pro intervalo", async () => {
    const u = await makeUser();
    const trail = await createTrail({
      slug: "t-noprice",
      stripe_price_monthly_id: null,
      stripe_price_yearly_id: null,
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(r.status, 503);
      assert.equal(r.body.error.code, "PRICE_NOT_CONFIGURED");
    });
  });

  it("happy path: cria customer, cria session, devolve url, persiste stripe_customer_id", async () => {
    const u = await makeUser();
    const trail = await createTrail({
      slug: "t-ok",
      stripe_price_monthly_id: "price_mock_month_123",
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<CheckoutOk>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(r.status, 200);
      assert.match(r.body.data.url, /^https:\/\/checkout\.stripe\.test\/cs_/);
    });

    // 1 customer + 1 checkout session criados
    assert.equal(mockCalls.customersCreate.length, 1);
    assert.equal(mockCalls.checkoutCreate.length, 1);

    // Customer recebeu o metadata correto
    assert.equal(mockCalls.customersCreate[0].args.metadata?.rayo_user_id, String(u.id));

    // Checkout usou o price_id da config do trail (NÃO algum vindo do body)
    const checkoutArgs = mockCalls.checkoutCreate[0].args;
    assert.equal(checkoutArgs.mode, "subscription");
    assert.equal(checkoutArgs.line_items?.[0]?.price, "price_mock_month_123");
    assert.equal(checkoutArgs.metadata?.rayo_user_id, String(u.id));
    assert.equal(checkoutArgs.metadata?.rayo_trail_id, String(trail.id));
    assert.equal(checkoutArgs.metadata?.rayo_interval, "month");
    assert.equal(checkoutArgs.subscription_data?.metadata?.rayo_user_id, String(u.id));

    // users.stripe_customer_id foi persistido pelo ensureStripeCustomer
    const { rows } = await getPool().query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [u.id],
    );
    assert.ok(rows[0].stripe_customer_id?.startsWith("cus_test_"));
  });

  it("CHECKOUT_FAILED → 502 quando Stripe não devolve url", async () => {
    // Recria mock com `nextCheckoutUrl: null` (simula session.url indefinida)
    const m = createMockStripe({ nextCheckoutUrl: null });
    __setStripeClientForTest(m.client);
    const u = await makeUser();
    const trail = await createTrail({ slug: "t-fail" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(r.status, 502);
      assert.equal(r.body.error.code, "CHECKOUT_FAILED");
    });
  });
});
