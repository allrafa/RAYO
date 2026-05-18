// Task #239 — Gotcha universal "No Fake Discounts".
//
// Cliente NÃO pode override `price`, `amount`, `discount`, `interval`
// fora do whitelist server-side. Tudo que vier no body além de
// `interval ∈ {month,year}` é descartado: backend sempre usa o price_id
// configurado no admin (`trails.stripe_price_*_id`).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __setStripeClientForTest,
} from "../../../server/stripeClient.js";
import {
  closeDbPool,
  truncateAll,
  makeUser,
} from "../helpers/db.js";
import {
  ensureBillingSchema,
  resetBillingCaches,
  createTrail,
  createMockStripe,
} from "../helpers/billing.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

before(async () => { await ensureBillingSchema(); });
afterEach(async () => {
  await truncateAll();
  resetBillingCaches();
  __setStripeClientForTest(null);
});
after(async () => { await closeDbPool(); });

describe("Billing / No fake discounts (Task #239)", () => {
  it("backend IGNORA price/amount/coupon do body — usa só o price_id configurado", async () => {
    const u = await makeUser();
    const trail = await createTrail({
      slug: "nfd-month",
      stripe_price_monthly_id: "price_REAL_month",
      stripe_price_yearly_id: "price_REAL_year",
      monthly_price_cents: 4990,
    });
    const { client, calls } = createMockStripe();
    __setStripeClientForTest(client);

    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: {
          interval: "month",
          // Campos maliciosos: backend deve ignorar todos.
          price: 100,
          amount: 1,
          unit_amount: 1,
          stripe_price_id: "price_FAKE_FREE",
          line_items: [{ price: "price_FAKE_FREE", quantity: 1 }],
          coupon: "FREEFOREVER",
          discounts: [{ coupon: "FREEFOREVER" }],
          trial_period_days: 365,
          subscription_data: { trial_period_days: 365 },
          metadata: { rayo_user_id: "999999" },
        },
      });
      assert.equal(r.status, 200);
    });

    const args = calls.checkoutCreate[0].args;

    // 1. line_items vem APENAS do server (price_REAL_month, quantity=1)
    assert.equal(args.line_items?.length, 1);
    assert.equal(args.line_items?.[0]?.price, "price_REAL_month");
    assert.equal(args.line_items?.[0]?.quantity, 1);

    // 2. Sem `discounts`/`coupon` enviados pro Stripe (backend não propaga body)
    assert.equal((args as unknown as { discounts?: unknown }).discounts, undefined);
    assert.equal((args as unknown as { coupon?: unknown }).coupon, undefined);

    // 3. Metadata é a do backend, NÃO a do body (user real, não 999999)
    assert.equal(args.metadata?.rayo_user_id, String(u.id));
    assert.notEqual(args.metadata?.rayo_user_id, "999999");
    assert.equal(args.subscription_data?.metadata?.rayo_user_id, String(u.id));

    // 4. trial_period_days é decidido pelo servidor (7 padrão p/ primeira vez),
    //    NÃO o 365 que o cliente tentou injetar.
    const sd = (args.subscription_data ?? {}) as { trial_period_days?: number };
    assert.equal(sd.trial_period_days, 7);
    assert.notEqual(sd.trial_period_days, 365);

    // 5. mode subscription fixo (cliente não pode trocar pra "payment")
    assert.equal(args.mode, "subscription");
  });

  it("interval=year usa stripe_price_yearly_id (não o monthly nem nada vindo do body)", async () => {
    const u = await makeUser();
    const trail = await createTrail({
      slug: "nfd-year",
      stripe_price_monthly_id: "price_REAL_month_b",
      stripe_price_yearly_id: "price_REAL_year_b",
    });
    const { client, calls } = createMockStripe();
    __setStripeClientForTest(client);

    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: {
          interval: "year",
          stripe_price_id: "price_FAKE",
        },
      });
      assert.equal(r.status, 200);
    });

    assert.equal(calls.checkoutCreate[0].args.line_items?.[0]?.price, "price_REAL_year_b");
  });
});
