// Task #239 — POST /api/stripe/webhook.
//
// Stub `getStripeSync()` via `__setStripeSyncForTest` pra:
//   * aceitar `signature !== "test_invalid_sig"` como válida e resolver
//     void (contrato real da lib — o handler parseia o payload sozinho).
//   * jogar erro pra signature inválida.
// Stub `getUncachableStripeClient()` para `checkout.session.completed`
// (que faz `subscriptions.retrieve`) e `charge.refunded`
// (que faz `invoices.retrieve`).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __setStripeClientForTest,
  __setStripeSyncForTest,
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
  createMockStripe,
  createMockStripeSync,
  fakeSubscription,
} from "../helpers/billing.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

before(async () => { await ensureBillingSchema(); });
afterEach(async () => {
  await truncateAll();
  resetBillingCaches();
  __setStripeClientForTest(null);
  __setStripeSyncForTest(null);
});
after(async () => {
  __setStripeClientForTest(null);
  __setStripeSyncForTest(null);
  await closeDbPool();
});

async function postWebhook(
  base: string,
  payload: object,
  signature: string,
): Promise<{ status: number; body: unknown }> {
  return request(base, {
    method: "POST",
    path: "/api/stripe/webhook",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: JSON.stringify(payload),
  });
}

describe("Billing / Stripe webhook (Task #239)", () => {
  it("400 sem header stripe-signature", async () => {
    const { sync } = createMockStripeSync();
    __setStripeSyncForTest(sync);

    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "x" }),
      });
      assert.equal(r.status, 400);
    });
  });

  it("400 quando assinatura é inválida (sync.processWebhook rejeita)", async () => {
    const { sync } = createMockStripeSync();
    __setStripeSyncForTest(sync);

    await withServer(createTestApp(), async (base) => {
      const r = await postWebhook(base, { type: "noop" }, "test_invalid_sig");
      assert.equal(r.status, 400);
    });
  });

  it("checkout.session.completed → cria row em subscriptions + persiste stripe_customer_id", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-completed" });
    const subId = `sub_wh_${Date.now()}`;
    const customerId = `cus_wh_${u.id}`;

    // Stripe client stub: subscriptions.retrieve(subId) devolve a fake sub
    const { client } = createMockStripe({
      subscriptions: new Map([[
        subId,
        fakeSubscription({
          id: subId,
          userId: u.id,
          trailId: trail.id,
          customerId,
          status: "active",
        }),
      ]]),
    });
    __setStripeClientForTest(client);

    const { sync } = createMockStripeSync();
    __setStripeSyncForTest(sync);

    const event = {
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          customer: customerId,
          subscription: subId,
          metadata: { rayo_user_id: String(u.id), rayo_trail_id: String(trail.id) },
        },
      },
    };

    await withServer(createTestApp(), async (base) => {
      const r = await postWebhook(base, event, "test_valid_sig");
      assert.equal(r.status, 200);
    });

    const subs = await getPool().query(
      `SELECT user_id, trail_id, status, stripe_subscription_id, stripe_customer_id
         FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(subs.rows.length, 1);
    assert.equal(subs.rows[0].user_id, u.id);
    assert.equal(subs.rows[0].trail_id, trail.id);
    assert.equal(subs.rows[0].status, "active");

    const users = await getPool().query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [u.id],
    );
    assert.equal(users.rows[0].stripe_customer_id, customerId);
  });

  it("idempotência: processar o MESMO evento 2x não duplica row (ON CONFLICT por stripe_subscription_id)", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-idem" });
    const subId = "sub_idempotent_42";

    const event = {
      id: "evt_test_2",
      type: "customer.subscription.created",
      data: {
        object: fakeSubscription({
          id: subId,
          userId: u.id,
          trailId: trail.id,
          status: "active",
        }),
      },
    };

    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    await withServer(createTestApp(), async (base) => {
      await postWebhook(base, event, "test_valid_sig");
      await postWebhook(base, event, "test_valid_sig");
      await postWebhook(base, event, "test_valid_sig");
    });

    const { rows } = await getPool().query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(rows[0].c, 1, "3 webhooks com mesmo sub.id devem produzir 1 row");
  });

  it("customer.subscription.updated → atualiza status / cancel_at_period_end", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-update" });
    const subId = "sub_update_1";

    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    await withServer(createTestApp(), async (base) => {
      // Cria com status=active
      await postWebhook(
        base,
        {
          id: "evt_3a",
          type: "customer.subscription.created",
          data: {
            object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "active" }),
          },
        },
        "valid",
      );
      // Atualiza pra cancel_at_period_end=true + past_due
      await postWebhook(
        base,
        {
          id: "evt_3b",
          type: "customer.subscription.updated",
          data: {
            object: fakeSubscription({
              id: subId,
              userId: u.id,
              trailId: trail.id,
              status: "past_due",
              cancel_at_period_end: true,
            }),
          },
        },
        "valid",
      );
    });

    const { rows } = await getPool().query(
      `SELECT status, cancel_at_period_end FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(rows[0].status, "past_due");
    assert.equal(rows[0].cancel_at_period_end, true);
  });

  it("customer.subscription.deleted → grava status='canceled'", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-delete" });
    const subId = "sub_delete_1";

    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    await withServer(createTestApp(), async (base) => {
      await postWebhook(base, {
        id: "evt_4a", type: "customer.subscription.created",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "active" }) },
      }, "valid");
      await postWebhook(base, {
        id: "evt_4b", type: "customer.subscription.deleted",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "canceled" }) },
      }, "valid");
    });

    const { rows } = await getPool().query(
      `SELECT status FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(rows[0].status, "canceled");
  });

  it("invoice.payment_failed → marca subscription como past_due", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-fail" });
    const subId = "sub_fail_1";

    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    await withServer(createTestApp(), async (base) => {
      await postWebhook(base, {
        id: "evt_5a", type: "customer.subscription.created",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "active" }) },
      }, "valid");
      await postWebhook(base, {
        id: "evt_5b", type: "invoice.payment_failed",
        data: { object: { id: "in_1", subscription: subId } },
      }, "valid");
    });

    const { rows } = await getPool().query(
      `SELECT status FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(rows[0].status, "past_due");
  });

  it("charge.refunded → resolve sub via invoice e marca status='canceled' (revoga acesso)", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "wh-refund" });
    const subId = "sub_refund_1";
    const invoiceId = "in_refund_1";

    // Pré-popula a sub no DB (status=active) via webhook subscription.created.
    // Depois manda charge.refunded; o handler retrieve da invoice → resolve
    // subscriptionId → UPDATE status='canceled'. Stripe.Invoice é cast via
    // unknown pq nosso handler só lê `id` + `subscription`.
    const invoiceForCharge = {
      id: invoiceId,
      object: "invoice",
      subscription: subId,
    } as unknown as import("stripe").Stripe.Invoice;

    const { client } = createMockStripe({
      invoices: new Map([[invoiceId, invoiceForCharge]]),
    });
    __setStripeClientForTest(client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    await withServer(createTestApp(), async (base) => {
      // 1. cria sub via webhook
      await postWebhook(base, {
        id: "evt_rf_1", type: "customer.subscription.created",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "active" }) },
      }, "valid");

      // 2. charge.refunded com invoice apontando pra sub
      const r = await postWebhook(base, {
        id: "evt_rf_2",
        type: "charge.refunded",
        data: { object: { id: "ch_1", object: "charge", invoice: invoiceId } },
      }, "valid");
      assert.equal(r.status, 200);
    });

    const { rows } = await getPool().query(
      `SELECT status, cancel_at_period_end FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subId],
    );
    assert.equal(rows[0].status, "canceled");
    assert.equal(rows[0].cancel_at_period_end, false);
  });

  it("sub sem metadata.rayo_* é ignorada (não cria row, não quebra)", async () => {
    const u = await makeUser();
    const _trail = await createTrail({ slug: "wh-orph" });
    void _trail;
    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    const orphanSub = fakeSubscription({ id: "sub_orphan", userId: u.id, trailId: 999 });
    // Remove metadata pra simular subscription manual via dashboard
    (orphanSub as unknown as { metadata: Record<string, string> }).metadata = {};

    await withServer(createTestApp(), async (base) => {
      const r = await postWebhook(base, {
        id: "evt_6", type: "customer.subscription.created",
        data: { object: orphanSub },
      }, "valid");
      // Webhook ainda devolve 200 — só loga e ignora.
      assert.equal(r.status, 200);
    });

    const { rows } = await getPool().query(`SELECT COUNT(*)::int AS c FROM subscriptions`);
    assert.equal(rows[0].c, 0, "sub sem metadata rayo_* não vira row");
  });
});
