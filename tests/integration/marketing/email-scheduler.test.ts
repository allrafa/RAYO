// RITMO_PLAN.md F2 — Scheduler de e-mails devocionais.
//
// Chama runEmailSchedulerTick(now) direto (sem setInterval), com datas
// fixas no fuso America/Sao_Paulo (UTC-3):
// 1) Janela da manhã (7h–11h59): claim em email_sends pra usuário
//    verificado + opt-in; opt-out e não-verificado ficam de fora.
// 2) Idempotência: segundo tick no mesmo dia não duplica.
// 3) Fora da janela (madrugada/tarde): nenhum claim.
// 4) Carta semanal: só domingo ≥8h; kind próprio; respeita weekly_digest.
//
// Resend não está configurado em teste → o envio é "skipped", mas o
// claim permanece (não há retry em loop por falta de chave).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import { runEmailSchedulerTick, spNowParts } from "../../../server/lib/emailScheduler.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

// 2026-07-15 é quarta-feira. 10:30 UTC-3 = 13:30Z.
const QUARTA_0730_SP = new Date("2026-07-15T10:30:00.000Z"); // 07:30 SP
const QUARTA_0300_SP = new Date("2026-07-15T06:00:00.000Z"); // 03:00 SP
const QUARTA_1400_SP = new Date("2026-07-15T17:00:00.000Z"); // 14:00 SP
// 2026-07-19 é domingo. 08:30 SP = 11:30Z.
const DOMINGO_0830_SP = new Date("2026-07-19T11:30:00.000Z");

async function seedTodayContent() {
  await getPool().query(
    `INSERT INTO content_items (kind, title, status, segments)
     VALUES ('audio', 'Conteúdo do dia', 'published', '{}'::text[])`,
  );
}

async function sends(kind: string): Promise<Array<{ user_id: number }>> {
  const { rows } = await getPool().query(
    `SELECT user_id FROM email_sends WHERE kind = $1 ORDER BY user_id`,
    [kind],
  );
  return rows;
}

describe("Email scheduler (RITMO_PLAN F2)", () => {
  it("spNowParts converte pro fuso de São Paulo", () => {
    const sp = spNowParts(QUARTA_0730_SP);
    assert.equal(sp.date, "2026-07-15");
    assert.equal(sp.hour, 7);
    assert.equal(sp.weekday, 3, "quarta-feira");
    assert.match(sp.dateLabel, /Quarta · 15 julho/);
  });

  it("manhã: claim pra verificado+opt-in; opt-out e não-verificado ficam de fora", async () => {
    await seedTodayContent();
    const optIn = await makeUser();
    const optOut = await makeUser();
    const unverified = await makeUser();

    await getPool().query(
      `UPDATE users SET notification_preferences = '{"notifications":{"email":false}}'::jsonb
        WHERE id = $1`,
      [optOut.id],
    );
    // makeUser verifica o e-mail — desfaz pro terceiro.
    await getPool().query(
      `DELETE FROM email_verification_codes WHERE email = $1`,
      [unverified.email],
    );

    const r = await runEmailSchedulerTick(QUARTA_0730_SP);
    assert.equal(r.missao, 1, "1 envio (skipped pelo Resend, mas contado como processado)");
    const rows = await sends("missao_diaria");
    assert.deepEqual(rows.map((x) => x.user_id), [optIn.id], "só o opt-in verificado");
  });

  it("idempotência: segundo tick do dia não duplica", async () => {
    await seedTodayContent();
    const u = await makeUser();
    await runEmailSchedulerTick(QUARTA_0730_SP);
    await runEmailSchedulerTick(QUARTA_0730_SP);
    const rows = await sends("missao_diaria");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, u.id);
  });

  it("fora da janela (3h e 14h SP) não envia nada", async () => {
    await seedTodayContent();
    await makeUser();
    const r1 = await runEmailSchedulerTick(QUARTA_0300_SP);
    const r2 = await runEmailSchedulerTick(QUARTA_1400_SP);
    assert.equal(r1.missao + r2.missao, 0);
    assert.equal((await sends("missao_diaria")).length, 0);
  });

  it("sem conteúdo publicado, não registra claim (pode chegar conteúdo mais tarde)", async () => {
    await makeUser();
    const r = await runEmailSchedulerTick(QUARTA_0730_SP);
    assert.equal(r.missao, 0);
    assert.equal((await sends("missao_diaria")).length, 0);
  });

  it("carta semanal: só domingo ≥8h, com kind próprio e opt-out por weekly_digest", async () => {
    await seedTodayContent();
    const leitor = await makeUser();
    const semCarta = await makeUser();
    await getPool().query(
      `UPDATE users SET notification_preferences = '{"notifications":{"weekly_digest":false}}'::jsonb
        WHERE id = $1`,
      [semCarta.id],
    );

    // Quarta: nenhuma carta.
    await runEmailSchedulerTick(QUARTA_0730_SP);
    assert.equal((await sends("carta_semanal")).length, 0);

    // Domingo 8h30: carta só pro leitor (missão também sai — dia novo).
    const r = await runEmailSchedulerTick(DOMINGO_0830_SP);
    assert.equal(r.carta, 1);
    const rows = await sends("carta_semanal");
    assert.deepEqual(rows.map((x) => x.user_id), [leitor.id]);
    // semCarta continua recebendo a missão diária (preferências separadas).
    const missao = await sends("missao_diaria");
    assert.ok(missao.some((x) => x.user_id === semCarta.id), "opt-out da carta não afeta a missão");
  });
});
