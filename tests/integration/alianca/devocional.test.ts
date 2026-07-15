// RITMO_PLAN.md F1 — Devocional do casal.
//
// Cobre:
// 1) GET /api/alianca/devocional — 401 sem cookie; paired:false sem
//    aliança; devocional global determinístico quando pareado.
// 2) POST /complete — 1ª confirmação +10 XP e notifica o cônjuge
//    (convite suave); idempotente no mesmo dia; a SEGUNDA confirmação
//    (do cônjuge) completa o dia: bothDone, missão "couple_devotional_day"
//    creditada pros DOIS e notificação de ritual completo.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { devotionalForDate } from "../../../server/features/alianca/devotionals.js";

interface InviteOk { success: true; data: { code: string }; error: null }
interface DevoOk {
  success: true;
  data: {
    paired: boolean;
    devotional?: { theme: string; title: string; ref: string; verse: string; reflection: string[]; question: string; prayer: string };
    myDone?: boolean;
    partnerDone?: boolean;
    partnerName?: string;
  };
  error: null;
}
interface CompleteOk {
  success: true;
  data: { done: boolean; alreadyDone: boolean; bothDone: boolean; xpAwarded: number };
  error: null;
}
interface ApiErr { success: false; data: null; error: { code: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function pairUp(base: string, a: { sessionCookie: string }, b: { sessionCookie: string }) {
  const inv = await request<InviteOk>(base, {
    method: "POST", path: "/api/alianca/invite", cookie: a.sessionCookie, body: {},
  });
  const acc = await request(base, {
    method: "POST", path: "/api/alianca/accept", cookie: b.sessionCookie,
    body: { code: inv.body.data.code },
  });
  assert.equal(acc.status, 200);
}

describe("Aliança / Devocional do casal (RITMO_PLAN F1)", () => {
  it("401 sem cookie; paired:false sem aliança; complete sem aliança → 409", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const anon = await request(base, { path: "/api/alianca/devocional" });
      assert.equal(anon.status, 401);

      const r = await request<DevoOk>(base, { path: "/api/alianca/devocional", cookie: u.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.paired, false);
      assert.equal(r.body.data.devotional, undefined);

      const c = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/devocional/complete", cookie: u.sessionCookie, body: {},
      });
      assert.equal(c.status, 409);
      assert.equal(c.body.error.code, "NOT_PAIRED");
    });
  });

  it("pareado: devocional global determinístico com estados dos dois", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    const expected = devotionalForDate(new Date());
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      const r = await request<DevoOk>(base, { path: "/api/alianca/devocional", cookie: ana.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.paired, true);
      assert.equal(r.body.data.devotional!.ref, expected.ref, "mesma rotação de devotionalForDate(hoje)");
      assert.ok(r.body.data.devotional!.question.length > 0);
      assert.equal(r.body.data.myDone, false);
      assert.equal(r.body.data.partnerDone, false);

      const r2 = await request<DevoOk>(base, { path: "/api/alianca/devocional", cookie: beto.sessionCookie });
      assert.equal(r2.body.data.devotional!.ref, expected.ref, "global: o casal vê o mesmo devocional");
    });
  });

  it("fluxo completo: 1ª parte +10 XP e convite suave; 2ª completa o dia (missão pros dois)", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      // Zera XP do pareamento pra isolar os +10 do devocional.
      await getPool().query(`UPDATE users SET xp = 0 WHERE id = ANY($1::int[])`, [[ana.id, beto.id]]);

      // Ana completa a parte dela.
      const c1 = await request<CompleteOk>(base, {
        method: "POST", path: "/api/alianca/devocional/complete", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(c1.status, 200);
      assert.equal(c1.body.data.alreadyDone, false);
      assert.equal(c1.body.data.bothDone, false);
      assert.equal(c1.body.data.xpAwarded, 10);

      // Repetir no mesmo dia é idempotente.
      const c1b = await request<CompleteOk>(base, {
        method: "POST", path: "/api/alianca/devocional/complete", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(c1b.body.data.alreadyDone, true);
      assert.equal(c1b.body.data.xpAwarded, 0);

      // Beto recebeu o convite suave.
      const { rows: n1 } = await getPool().query(
        `SELECT user_id, title FROM notifications WHERE kind = 'couple_devotional'`,
      );
      assert.equal(n1.length, 1);
      assert.equal(n1[0].user_id, beto.id);
      assert.match(n1[0].title, /fez o devocional de hoje/);

      // Beto completa → dia do casal fecha.
      const c2 = await request<CompleteOk>(base, {
        method: "POST", path: "/api/alianca/devocional/complete", cookie: beto.sessionCookie, body: {},
      });
      assert.equal(c2.body.data.bothDone, true);
      assert.equal(c2.body.data.xpAwarded, 10);

      // XP: 10 pra cada (a missão semanal só paga no resgate).
      const { rows: xp } = await getPool().query(
        `SELECT id, xp FROM users WHERE id = ANY($1::int[]) ORDER BY id`,
        [[ana.id, beto.id]],
      );
      for (const row of xp) assert.equal(row.xp, 10, `user ${row.id} deveria ter 10 XP`);

      // Missão "couple_devotional_day" creditada pros DOIS.
      async function progress(userId: number): Promise<number> {
        const { rows } = await getPool().query(
          `SELECT COALESCE(MAX(ump.current_progress), 0)::int AS p
             FROM user_mission_progress ump
             JOIN missions m ON m.id = ump.mission_id
            WHERE ump.user_id = $1 AND m.action_type = 'couple_devotional_day'`,
          [userId],
        );
        return rows[0].p;
      }
      assert.equal(await progress(ana.id), 1);
      assert.equal(await progress(beto.id), 1);

      // Ana recebeu a notificação de ritual completo.
      const { rows: n2 } = await getPool().query(
        `SELECT user_id, title FROM notifications
          WHERE kind = 'couple_devotional' AND user_id = $1`,
        [ana.id],
      );
      assert.equal(n2.length, 1);
      assert.match(n2[0].title, /Vocês dois fizeram/);

      // GET reflete o estado dos dois lados.
      const st = await request<DevoOk>(base, { path: "/api/alianca/devocional", cookie: ana.sessionCookie });
      assert.equal(st.body.data.myDone, true);
      assert.equal(st.body.data.partnerDone, true);
    });
  });
});
