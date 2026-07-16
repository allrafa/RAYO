// DIFERENCIAL_PLAN.md D3 — Momento RAYO (janela das 21h + presença).
//
// Testa o service direto com datas fixas (fuso SP = UTC-3):
// 1) momentoWindow: fechado às 20h59, aberto 21h05, fechado 21h12
//    (mas a presença aceita até 21h15 de tolerância).
// 2) attendMomento: +5 XP na 1ª, idempotente, alimenta xp_log (chama);
//    fora da janela → CLOSED.
// 3) Lembrete push 20h50: claims só na janela e só pra quem tem push.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import {
  momentoWindow,
  attendMomento,
  getMomentoState,
} from "../../../server/features/momento/service.js";
import { runEmailSchedulerTick, spNowParts, tickMomentoReminder } from "../../../server/lib/emailScheduler.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

// 2026-07-15, fuso SP = UTC-3.
const SP_2059 = new Date("2026-07-15T23:59:00.000Z"); // 20:59 SP
const SP_2105 = new Date("2026-07-16T00:05:00.000Z"); // 21:05 SP (dia 15 SP)
const SP_2112 = new Date("2026-07-16T00:12:00.000Z"); // 21:12 SP
const SP_2120 = new Date("2026-07-16T00:20:00.000Z"); // 21:20 SP
const SP_2055 = new Date("2026-07-15T23:55:00.000Z"); // 20:55 SP

describe("Momento / janela das 21h", () => {
  it("fechado antes, aberto 21h00–21h09, fechado depois; data da sala é a SP", () => {
    assert.equal(momentoWindow(SP_2059).open, false);
    const open = momentoWindow(SP_2105);
    assert.equal(open.open, true);
    assert.equal(open.date, "2026-07-15", "21h05 UTC-3 ainda é dia 15 em SP");
    assert.ok(open.secondsToClose > 0 && open.secondsToClose <= 600);
    assert.equal(momentoWindow(SP_2112).open, false);
    // Countdown de quem olha às 20h59: 1 minuto.
    assert.equal(momentoWindow(SP_2059).secondsToOpen, 60);
  });

  it("attend: +5 XP na 1ª, idempotente; tolerância até 21h15; CLOSED fora", async () => {
    const u = await makeUser();

    const early = await attendMomento(u.id, SP_2059);
    assert.ok("error" in early && early.error === "CLOSED");

    const a1 = await attendMomento(u.id, SP_2105);
    assert.ok(!("error" in a1));
    assert.equal(a1.alreadyAttended, false);
    assert.equal(a1.xpAwarded, 5);
    assert.equal(a1.currentStreak, 1, "presença acende a chama");

    const a2 = await attendMomento(u.id, SP_2112);
    assert.ok(!("error" in a2));
    assert.equal(a2.alreadyAttended, true, "tolerância aceita mas não duplica");
    assert.equal(a2.xpAwarded, 0);

    const late = await attendMomento(u.id, SP_2120);
    assert.ok("error" in late && late.error === "CLOSED");

    const { rows: xp } = await getPool().query(`SELECT xp FROM users WHERE id = $1`, [u.id]);
    assert.equal(xp[0].xp, 5);

    const st = await getMomentoState(u.id, SP_2105);
    assert.equal(st.attendedToday, true);
    assert.ok(st.verse.ref.length > 0, "sala carrega o versículo do dia");
  });
});

describe("Momento / lembrete push 20h50", () => {
  async function fakeSub(userId: number) {
    await getPool().query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, 'key', 'auth')`,
      [userId, `https://push.example/momento-${userId}`],
    );
  }

  it("claims na janela 20h50+ só pra quem tem push; idempotente; fora da janela nada", async () => {
    const comPush = await makeUser();
    const semPush = await makeUser();
    await fakeSub(comPush.id);
    void semPush;

    const delivered: number[] = [];
    const sender = async (userId: number) => { delivered.push(userId); };

    // 20h55 — dentro da janela do lembrete.
    const sp = spNowParts(SP_2055);
    const n1 = await tickMomentoReminder(sp, sender, () => true);
    assert.equal(n1, 1);
    assert.deepEqual(delivered, [comPush.id]);

    const n2 = await tickMomentoReminder(sp, sender, () => true);
    assert.equal(n2, 0, "idempotente no mesmo dia");

    // O tick geral às 20h59 não re-dispara (claim de hoje já existe) e
    // às 21h05 a janela do lembrete já passou.
    const r = await runEmailSchedulerTick(SP_2105);
    assert.equal(r.momentoReminder, 0);
  });
});
