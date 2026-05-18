// Task #239 — Trial 7 dias grátis no Checkout (Task #140).
//
// Regras:
//   * Primeiro checkout do user na trilha → `trial_period_days` setado.
//   * Qualquer linha PRÉVIA em `subscriptions` pra essa trilha (inclusive
//     `canceled`) bloqueia novo trial.
//   * `trial_eligible` em `GET /api/trails/:slug` espelha a mesma regra.
//   * Durante o trial (status='trialing') usuário tem acesso. Após
//     expirar com pagamento falho, webhook move pra status sem acesso.
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
} from "../helpers/db.js";
import {
  ensureBillingSchema,
  resetBillingCaches,
  createTrail,
  createCourse,
  linkTrailCourse,
  insertSubscription,
  createMockStripe,
  createMockStripeSync,
  fakeSubscription,
  type MockStripeCalls,
} from "../helpers/billing.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { checkCourseAccess } from "../../../server/middleware/requireTrailAccess.js";

interface CheckoutOk { success: true; data: { url: string }; error: null }
interface TrailGetOk { success: true; data: { trail: { trial_eligible: boolean; trial_days: number } }; error: null }

before(async () => { await ensureBillingSchema(); });
afterEach(async () => {
  await truncateAll();
  resetBillingCaches();
  __setStripeClientForTest(null);
  __setStripeSyncForTest(null);
});
after(async () => { await closeDbPool(); });

describe("Billing / Trial 7 dias (Task #239 / #140)", () => {
  it("primeiro checkout → Stripe recebe trial_period_days=7 e trail_eligible=true", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "tr-firsttime" });
    const { client, calls } = createMockStripe();
    __setStripeClientForTest(client);

    await withServer(createTestApp(), async (base) => {
      // GET antes do checkout: trial_eligible=true
      const rGet = await request<TrailGetOk>(base, {
        path: `/api/trails/${trail.slug}`,
        cookie: u.sessionCookie,
      });
      assert.equal(rGet.body.data.trail.trial_eligible, true);
      assert.equal(rGet.body.data.trail.trial_days, 7);

      const rPost = await request<CheckoutOk>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(rPost.status, 200);
    });

    const sd = (calls.checkoutCreate[0].args.subscription_data ?? {}) as {
      trial_period_days?: number;
      metadata?: Record<string, string>;
    };
    assert.equal(sd.trial_period_days, 7, "trial_period_days incluído no primeiro checkout");
  });

  it("user com subscription canceled PRÉVIA NÃO ganha trial de novo + trial_eligible=false", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "tr-noretry" });
    // Histórico: sub canceled
    await insertSubscription({
      user_id: u.id,
      trail_id: trail.id,
      status: "canceled",
      current_period_end: new Date(Date.now() - 86400e3),
    });

    let calls: MockStripeCalls;
    const m = createMockStripe();
    calls = m.calls;
    __setStripeClientForTest(m.client);

    await withServer(createTestApp(), async (base) => {
      const rGet = await request<TrailGetOk>(base, {
        path: `/api/trails/${trail.slug}`,
        cookie: u.sessionCookie,
      });
      assert.equal(rGet.body.data.trail.trial_eligible, false, "trial_eligible=false com histórico");

      const rPost = await request<CheckoutOk>(base, {
        method: "POST",
        path: `/api/trails/${trail.slug}/checkout`,
        cookie: u.sessionCookie,
        body: { interval: "month" },
      });
      assert.equal(rPost.status, 200);
    });

    const sd = (calls.checkoutCreate[0].args.subscription_data ?? {}) as {
      trial_period_days?: number;
    };
    assert.equal(sd.trial_period_days, undefined, "sem trial_period_days no checkout de retorno");
  });

  it("durante o trial (status=trialing) usuário tem acesso ao curso", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "tr-active" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);
    await insertSubscription({
      user_id: u.id,
      trail_id: trail.id,
      status: "trialing",
      current_period_end: new Date(Date.now() + 7 * 86400e3),
    });
    resetBillingCaches();

    const r = await checkCourseAccess(
      { user: { id: u.id, email: u.email, name: u.name, role: "client" } } as Parameters<typeof checkCourseAccess>[0],
      course.id,
    );
    assert.equal(r.allowed, true);
  });

  it("após D+8 sem pagamento → webhook customer.subscription.updated com status=unpaid bloqueia acesso", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "tr-expired" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    __setStripeClientForTest(createMockStripe().client);
    __setStripeSyncForTest(createMockStripeSync().sync);

    const subId = "sub_trial_lapse";
    await withServer(createTestApp(), async (base) => {
      // 1. Webhook cria a sub em trialing
      const evtTrial = {
        id: "evt_t1", type: "customer.subscription.created",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "trialing" }) },
      };
      await request(base, {
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Content-Type": "application/json", "stripe-signature": "valid" },
        body: JSON.stringify(evtTrial),
      });

      // Sanity: acesso liberado durante o trial
      resetBillingCaches();
      const rDuringTrial = await checkCourseAccess(
        { user: { id: u.id, email: u.email, name: u.name, role: "client" } } as Parameters<typeof checkCourseAccess>[0],
        course.id,
      );
      assert.equal(rDuringTrial.allowed, true);

      // 2. Trial expira sem pagamento → Stripe envia updated com status=unpaid
      const evtUnpaid = {
        id: "evt_t2", type: "customer.subscription.updated",
        data: { object: fakeSubscription({ id: subId, userId: u.id, trailId: trail.id, status: "unpaid" }) },
      };
      await request(base, {
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Content-Type": "application/json", "stripe-signature": "valid" },
        body: JSON.stringify(evtUnpaid),
      });
    });

    // 3. Acesso fica bloqueado (unpaid não está em ACTIVE_STATUSES)
    resetBillingCaches();
    const rAfter = await checkCourseAccess(
      { user: { id: u.id, email: u.email, name: u.name, role: "client" } } as Parameters<typeof checkCourseAccess>[0],
      course.id,
    );
    assert.equal(rAfter.allowed, false);
  });
});
