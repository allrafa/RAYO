// ALIANCA_PLAN.md — Aliança (Modo Casal), iteração 2.
//
// Cobre:
// 1) Convite: criação, renovação (1 pendente por pessoa), 409 se pareado.
// 2) Accept: caminho feliz (casal criado, +25 XP ambos, notificação nos
//    dois lados), bordas 400 (próprio código), 404 (código inexistente),
//    410 (revogado), 409 (um dos lados já pareado) e corrida.
// 3) Oração: 1/dia/direção idempotente, +3 XP só na primeira, notificação
//    pro cônjuge.
// 4) Estado agregado: none → invited → paired; chama do casal com xp_log
//    dos dois; améns do dia; unpair volta pra none nos dois lados.
// 5) LGPD: deleteUserData desfaz o vínculo e o cônjuge volta pra none.
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

interface InviteOk { success: true; data: { code: string; expiresAt: string }; error: null }
interface AcceptOk { success: true; data: { partner: { id: number; name: string } }; error: null }
interface PrayOk {
  success: true;
  data: { prayed: boolean; alreadyPrayedToday: boolean; xpAwarded: number };
  error: null;
}
interface StateOk {
  success: true;
  data: {
    status: "none" | "invited" | "paired";
    code?: string;
    partner?: { id: number; name: string };
    coupleStreak?: number;
    partnerActiveToday?: boolean;
    prayedByMeToday?: boolean;
    prayedByPartnerToday?: boolean;
    amensToday?: { mine: boolean; partner: boolean };
  };
  error: null;
}
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function pairUp(base: string, inviter: { sessionCookie: string }, acceptor: { sessionCookie: string }) {
  const inv = await request<InviteOk>(base, {
    method: "POST", path: "/api/alianca/invite", cookie: inviter.sessionCookie, body: {},
  });
  const acc = await request<AcceptOk>(base, {
    method: "POST", path: "/api/alianca/accept", cookie: acceptor.sessionCookie,
    body: { code: inv.body.data.code },
  });
  assert.equal(acc.status, 200, "pairUp deveria funcionar");
  return inv.body.data.code;
}

describe("Aliança / convite e pareamento", () => {
  it("GET /api/alianca 401 sem cookie; estado inicial é none", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const anon = await request(base, { path: "/api/alianca" });
      assert.equal(anon.status, 401);
      const r = await request<StateOk>(base, { path: "/api/alianca", cookie: u.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.status, "none");
    });
  });

  it("convite: cria, aparece no estado, e renovar mantém um único pendente", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const i1 = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: u.sessionCookie, body: {},
      });
      assert.equal(i1.status, 200);
      assert.match(i1.body.data.code, /^[A-Z2-9]{8}$/, "código curto sem ambíguos");

      const st = await request<StateOk>(base, { path: "/api/alianca", cookie: u.sessionCookie });
      assert.equal(st.body.data.status, "invited");
      assert.equal(st.body.data.code, i1.body.data.code);

      const i2 = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: u.sessionCookie, body: {},
      });
      assert.notEqual(i2.body.data.code, i1.body.data.code, "renova o código");
      const { rows } = await getPool().query(
        `SELECT COUNT(*)::int AS n FROM couple_invites WHERE inviter_id = $1 AND status = 'pending'`,
        [u.id],
      );
      assert.equal(rows[0].n, 1, "um único convite pendente por pessoa");
    });
  });

  it("accept feliz: casal criado, +25 XP pros dois, notificação nos dois lados", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const inv = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: ana.sessionCookie, body: {},
      });
      const acc = await request<AcceptOk>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: beto.sessionCookie,
        body: { code: inv.body.data.code.toLowerCase() }, // case-insensitive
      });
      assert.equal(acc.status, 200);
      assert.equal(acc.body.data.partner.id, ana.id);

      // Estado paired dos dois lados.
      const stA = await request<StateOk>(base, { path: "/api/alianca", cookie: ana.sessionCookie });
      const stB = await request<StateOk>(base, { path: "/api/alianca", cookie: beto.sessionCookie });
      assert.equal(stA.body.data.status, "paired");
      assert.equal(stA.body.data.partner!.id, beto.id);
      assert.equal(stB.body.data.status, "paired");
      assert.equal(stB.body.data.partner!.id, ana.id);

      // +25 XP cada.
      const { rows: xp } = await getPool().query(
        `SELECT id, xp FROM users WHERE id = ANY($1::int[]) ORDER BY id`,
        [[ana.id, beto.id]],
      );
      for (const row of xp) assert.equal(row.xp, 25, `user ${row.id} deveria ter 25 XP`);

      // Notificação couple_paired nos dois lados.
      const { rows: notifs } = await getPool().query(
        `SELECT user_id FROM notifications WHERE kind = 'couple_paired'`,
      );
      const notified = notifs.map((n) => n.user_id).sort();
      assert.deepEqual(notified, [ana.id, beto.id].sort());
    });
  });

  it("bordas: próprio código 400, inexistente 404, revogado 410, já pareado 409", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    const carla = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const inv = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: ana.sessionCookie, body: {},
      });
      const code = inv.body.data.code;

      const own = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: ana.sessionCookie, body: { code },
      });
      assert.equal(own.status, 400);
      assert.equal(own.body.error.code, "OWN_CODE");

      const missing = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: beto.sessionCookie,
        body: { code: "XXXXXXXX" },
      });
      assert.equal(missing.status, 404);

      // Pareia ana+beto; carla tenta usar um convite antigo de ana → o
      // convite foi aceito, então 410 (não mais pendente).
      await request<AcceptOk>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: beto.sessionCookie, body: { code },
      });
      const used = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: carla.sessionCookie, body: { code },
      });
      assert.equal(used.status, 410);

      // Convite novo de carla; beto (já pareado) tenta aceitar → 409.
      const invC = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: carla.sessionCookie, body: {},
      });
      const conflict = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: beto.sessionCookie,
        body: { code: invC.body.data.code },
      });
      assert.equal(conflict.status, 409);
      assert.equal(conflict.body.error.code, "ALREADY_PAIRED");

      // Revogado → 410.
      const dora = await makeUser();
      const invD = await request<InviteOk>(base, {
        method: "POST", path: "/api/alianca/invite", cookie: dora.sessionCookie, body: {},
      });
      await request(base, {
        method: "POST", path: "/api/alianca/invite/revoke", cookie: dora.sessionCookie, body: {},
      });
      const revoked = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/accept", cookie: carla.sessionCookie,
        body: { code: invD.body.data.code },
      });
      assert.equal(revoked.status, 410);
    });
  });
});

describe("Aliança / oração e estado do dia", () => {
  it("pray: 1ª vez +3 XP e notifica o cônjuge; 2ª no dia é idempotente", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      // Zera o XP do pareamento pra isolar o +3 da oração.
      await getPool().query(`UPDATE users SET xp = 0 WHERE id = ANY($1::int[])`, [[ana.id, beto.id]]);

      const p1 = await request<PrayOk>(base, {
        method: "POST", path: "/api/alianca/pray", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(p1.status, 200);
      assert.equal(p1.body.data.alreadyPrayedToday, false);
      assert.equal(p1.body.data.xpAwarded, 3);

      const p2 = await request<PrayOk>(base, {
        method: "POST", path: "/api/alianca/pray", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(p2.body.data.alreadyPrayedToday, true);
      assert.equal(p2.body.data.xpAwarded, 0);

      const { rows: xp } = await getPool().query(`SELECT xp FROM users WHERE id = $1`, [ana.id]);
      assert.equal(xp[0].xp, 3, "só a primeira oração do dia dá XP");

      const { rows: notifs } = await getPool().query(
        `SELECT user_id, title FROM notifications WHERE kind = 'couple_prayer'`,
      );
      assert.equal(notifs.length, 1);
      assert.equal(notifs[0].user_id, beto.id, "quem recebe é o cônjuge");
      assert.match(notifs[0].title, /orou por você/);

      // Estado reflete as direções.
      const stA = await request<StateOk>(base, { path: "/api/alianca", cookie: ana.sessionCookie });
      assert.equal(stA.body.data.prayedByMeToday, true);
      assert.equal(stA.body.data.prayedByPartnerToday, false);
      const stB = await request<StateOk>(base, { path: "/api/alianca", cookie: beto.sessionCookie });
      assert.equal(stB.body.data.prayedByMeToday, false);
      assert.equal(stB.body.data.prayedByPartnerToday, true);
    });
  });

  it("pray sem aliança → 409 NOT_PAIRED", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/pray", cookie: u.sessionCookie, body: {},
      });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, "NOT_PAIRED");
    });
  });

  it("chama do casal, atividade e améns do dia no estado agregado", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      // Pareamento já gerou xp_log pros dois HOJE (couple_paired +25) →
      // chama do casal = 1 e partnerActiveToday = true.
      // Ontem só a ana teve atividade → não estende a chama.
      await getPool().query(
        `INSERT INTO xp_log (user_id, amount, reason, created_at)
         VALUES ($1, 5, 'seed_ontem', NOW() - INTERVAL '1 day')`,
        [ana.id],
      );

      // Ana diz amém no versículo do dia.
      await request(base, {
        method: "POST", path: "/api/home/verse/amen", cookie: ana.sessionCookie, body: {},
      });

      const st = await request<StateOk>(base, { path: "/api/alianca", cookie: ana.sessionCookie });
      assert.equal(st.body.data.status, "paired");
      assert.equal(st.body.data.coupleStreak, 1, "só hoje conta: ontem faltou o beto");
      assert.equal(st.body.data.partnerActiveToday, true);
      assert.deepEqual(st.body.data.amensToday, { mine: true, partner: false });

      // Ontem os DOIS ativos → chama vira 2.
      await getPool().query(
        `INSERT INTO xp_log (user_id, amount, reason, created_at)
         VALUES ($1, 5, 'seed_ontem', NOW() - INTERVAL '1 day')`,
        [beto.id],
      );
      const st2 = await request<StateOk>(base, { path: "/api/alianca", cookie: ana.sessionCookie });
      assert.equal(st2.body.data.coupleStreak, 2);
    });
  });

  it("unpair volta os dois lados pra none e apaga orações em cascata", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      await request(base, {
        method: "POST", path: "/api/alianca/pray", cookie: ana.sessionCookie, body: {},
      });
      const del = await request<{ success: true; data: { unpaired: boolean }; error: null }>(base, {
        method: "DELETE", path: "/api/alianca", cookie: beto.sessionCookie,
      });
      assert.equal(del.body.data.unpaired, true);

      const stA = await request<StateOk>(base, { path: "/api/alianca", cookie: ana.sessionCookie });
      const stB = await request<StateOk>(base, { path: "/api/alianca", cookie: beto.sessionCookie });
      assert.equal(stA.body.data.status, "none");
      assert.equal(stB.body.data.status, "none");

      const { rows } = await getPool().query(`SELECT COUNT(*)::int AS n FROM couple_prayers`);
      assert.equal(rows[0].n, 0, "orações caem em cascata com o casal");
    });
  });

  it("missões a dois: gatilho conjunto credita os DOIS (amém e oração mútua)", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);

      async function progress(userId: number, actionType: string): Promise<number> {
        const { rows } = await getPool().query(
          `SELECT COALESCE(MAX(ump.current_progress), 0)::int AS p
             FROM user_mission_progress ump
             JOIN missions m ON m.id = ump.mission_id
            WHERE ump.user_id = $1 AND m.action_type = $2`,
          [userId, actionType],
        );
        return rows[0].p;
      }

      // Amém só da ana → ninguém credita ainda.
      await request(base, {
        method: "POST", path: "/api/home/verse/amen", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(await progress(ana.id, "couple_amen_day"), 0);

      // Beto também diz amém → o dia do casal se completa e credita os DOIS.
      await request(base, {
        method: "POST", path: "/api/home/verse/amen", cookie: beto.sessionCookie, body: {},
      });
      assert.equal(await progress(ana.id, "couple_amen_day"), 1);
      assert.equal(await progress(beto.id, "couple_amen_day"), 1);

      // Oração: uma direção não credita; a mútua credita os dois.
      await request(base, {
        method: "POST", path: "/api/alianca/pray", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(await progress(ana.id, "couple_prayer_day"), 0);
      await request(base, {
        method: "POST", path: "/api/alianca/pray", cookie: beto.sessionCookie, body: {},
      });
      assert.equal(await progress(ana.id, "couple_prayer_day"), 1);
      assert.equal(await progress(beto.id, "couple_prayer_day"), 1);
    });
  });

  it("LGPD: exclusão de conta desfaz o vínculo e o cônjuge volta pra none", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      const { deleteUserData } = await import("../../../server/features/lgpd/service.js");
      await deleteUserData(ana.id);

      const stB = await request<StateOk>(base, { path: "/api/alianca", cookie: beto.sessionCookie });
      assert.equal(stB.body.data.status, "none", "cônjuge liberado após exclusão LGPD");
      const { rows } = await getPool().query(
        `SELECT COUNT(*)::int AS n FROM couple_invites WHERE inviter_id = $1 OR accepted_by = $1`,
        [ana.id],
      );
      assert.equal(rows[0].n, 0);
    });
  });
});
