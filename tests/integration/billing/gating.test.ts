// Task #239 — Gating 402 TRAIL_PAYMENT_REQUIRED.
//
// Não exercita Stripe — só DB + `checkCourseAccess`. Cobre matriz de
// status (active|trialing|past_due|canceled|incomplete|none), bypass de
// moderator+, e curso fora de qualquer trilha (libera).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkCourseAccess } from "../../../server/middleware/requireTrailAccess.js";
import {
  closeDbPool,
  truncateAll,
  makeUser,
  type MadeUser,
} from "../helpers/db.js";
import {
  ensureBillingSchema,
  resetBillingCaches,
  createTrail,
  createCourse,
  linkTrailCourse,
  insertSubscription,
} from "../helpers/billing.js";

// Stub de Request usado pelo helper — só precisa de `user`.
function fakeReq(user: MadeUser | null, role: string = "client") {
  if (!user) return {} as Parameters<typeof checkCourseAccess>[0];
  return { user: { id: user.id, email: user.email, name: user.name, role } } as Parameters<typeof checkCourseAccess>[0];
}

before(async () => { await ensureBillingSchema(); });
afterEach(async () => {
  await truncateAll();
  resetBillingCaches();
});
after(async () => { await closeDbPool(); });

describe("Billing / Gating (Task #239)", () => {
  it("curso fora de trilha paga → allowed=true (anônimo inclusive)", async () => {
    const course = await createCourse("Curso Grátis");
    const r1 = await checkCourseAccess(fakeReq(null), course.id);
    assert.deepEqual(r1, { allowed: true, trailId: null });

    const u = await makeUser();
    const r2 = await checkCourseAccess(fakeReq(u), course.id);
    assert.deepEqual(r2, { allowed: true, trailId: null });
  });

  it("anônimo em curso de trilha paga → allowed=false (com trailId)", async () => {
    const trail = await createTrail({ slug: "g-anon" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    const r = await checkCourseAccess(fakeReq(null), course.id);
    assert.equal(r.allowed, false);
    assert.equal(r.trailId, trail.id);
  });

  it("user SEM subscription → 402 com trail_id correto", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "g-nosub" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    const r = await checkCourseAccess(fakeReq(u), course.id);
    assert.equal(r.allowed, false);
    assert.equal(r.trailId, trail.id);
  });

  it("status MATRIX: active/trialing/past_due liberam; canceled/incomplete/unpaid bloqueiam", async () => {
    const trail = await createTrail({ slug: "g-matrix" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    const cases: Array<{ status: string; expected: boolean }> = [
      { status: "active", expected: true },
      { status: "trialing", expected: true },
      { status: "past_due", expected: true },
      { status: "canceled", expected: false },
      { status: "incomplete", expected: false },
      { status: "incomplete_expired", expected: false },
      { status: "unpaid", expected: false },
    ];

    for (const c of cases) {
      const u = await makeUser();
      await insertSubscription({
        user_id: u.id,
        trail_id: trail.id,
        status: c.status,
        current_period_end: new Date(Date.now() + 30 * 86400e3),
      });
      resetBillingCaches();
      const r = await checkCourseAccess(fakeReq(u), course.id);
      assert.equal(
        r.allowed,
        c.expected,
        `status=${c.status} → expected allowed=${c.expected} got=${r.allowed}`,
      );
    }
  });

  it("subscription cancelled MAS current_period_end ainda no futuro: status `canceled` bloqueia (ACTIVE_STATUSES não inclui), `active` com cancel_at_period_end=true libera", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const trail = await createTrail({ slug: "g-cancel" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    // Cenário A: status já virou `canceled` no Stripe (refund/cancel imediato)
    await insertSubscription({
      user_id: u1.id,
      trail_id: trail.id,
      status: "canceled",
      current_period_end: new Date(Date.now() + 30 * 86400e3),
    });
    // Cenário B: cancelou pro fim do período mas ainda paga → status='active'
    await insertSubscription({
      user_id: u2.id,
      trail_id: trail.id,
      status: "active",
      cancel_at_period_end: true,
      current_period_end: new Date(Date.now() + 30 * 86400e3),
    });
    resetBillingCaches();

    const rCanceled = await checkCourseAccess(fakeReq(u1), course.id);
    const rCancelAtEnd = await checkCourseAccess(fakeReq(u2), course.id);
    assert.equal(rCanceled.allowed, false, "status=canceled bloqueia mesmo dentro do período");
    assert.equal(rCancelAtEnd.allowed, true, "status=active + cancel_at_period_end=true mantém acesso");
  });

  it("moderator+ bypassa o gate sem subscription", async () => {
    const trail = await createTrail({ slug: "g-mod" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);

    const mod = await makeUser({ role: "moderator" });
    const admin = await makeUser({ role: "admin" });
    const producer = await makeUser({ role: "producer" });

    const rMod = await checkCourseAccess(fakeReq(mod, "moderator"), course.id);
    const rAdmin = await checkCourseAccess(fakeReq(admin, "admin"), course.id);
    const rProd = await checkCourseAccess(fakeReq(producer, "producer"), course.id);

    assert.equal(rMod.allowed, true);
    assert.equal(rAdmin.allowed, true);
    // producer NÃO é moderator+: bloqueia (hierarchy: client<producer<moderator<admin)
    assert.equal(rProd.allowed, false);
  });

  it("subscription expirada (current_period_end no passado + status='canceled' pelo webhook) → 402", async () => {
    const u = await makeUser();
    const trail = await createTrail({ slug: "g-exp" });
    const course = await createCourse();
    await linkTrailCourse(trail.id, course.id);
    await insertSubscription({
      user_id: u.id,
      trail_id: trail.id,
      status: "canceled",
      current_period_end: new Date(Date.now() - 86400e3),
    });
    resetBillingCaches();
    const r = await checkCourseAccess(fakeReq(u), course.id);
    assert.equal(r.allowed, false);
  });
});
