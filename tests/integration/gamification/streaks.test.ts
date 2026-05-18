// Task #240 — Gamification: streaks (sequência diária).
//
// Cobre:
//   * Sem last_activity_date → primeira chamada inicia streak=1.
//   * Mesma data → idempotente (não muda streak, não dá XP de streak_day).
//   * diff=1 dia → streak+=1 + XP streak_day (5 XP).
//   * diff>1 dia → streak reseta pra 1, streakBroken=true.
//   * Atingir streak=7 → unlocka badge streak_7.
//
// `updateStreak` lê `users.last_activity_date` (date-only). Pra simular
// "ontem" / "anteontem" sem mexer no clock, fazemos UPDATE direto na
// coluna entre os passos. É o mesmo padrão usado em outras specs.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { updateStreak } from "../../../server/features/gamification/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

async function setLastActivity(userId: number, daysAgo: number, streak: number) {
  await getPool().query(
    `UPDATE users
        SET last_activity_date = CURRENT_DATE - ($2::int),
            streak = $3,
            longest_streak = GREATEST(longest_streak, $3),
            xp = 0, level = 1
      WHERE id = $1`,
    [userId, daysAgo, streak],
  );
}

describe("Gamification / Streaks (Task #240)", () => {
  it("primeira chamada (sem last_activity_date) → streak=1", async () => {
    const u = await makeUser();
    const r = await updateStreak(u.id);
    assert.equal(r.currentStreak, 1);
    assert.equal(r.streakBroken, false);
    assert.equal(r.longestStreak, 1);
  });

  it("mesma data → idempotente (não muda streak, não loga XP)", async () => {
    const u = await makeUser();
    await updateStreak(u.id);
    const { rows: xpBefore } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM xp_log WHERE user_id = $1`, [u.id],
    );
    const r = await updateStreak(u.id);
    assert.equal(r.currentStreak, 1);
    assert.equal(r.streakBroken, false);
    const { rows: xpAfter } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM xp_log WHERE user_id = $1`, [u.id],
    );
    assert.equal(xpAfter[0].count, xpBefore[0].count, "idempotente: xp_log não cresceu");
  });

  it("diff=1 dia (ontem) → streak+=1 e XP streak_day (5)", async () => {
    const u = await makeUser();
    await setLastActivity(u.id, 1, 3); // 3 → 4
    const r = await updateStreak(u.id);
    assert.equal(r.currentStreak, 4);
    assert.equal(r.streakBroken, false);

    const { rows } = await getPool().query<{ reason: string; amount: number }>(
      `SELECT reason, amount FROM xp_log WHERE user_id = $1`, [u.id],
    );
    const streakDay = rows.find((x) => x.reason === "streak_day");
    assert.ok(streakDay, "deveria ter logado XP por streak_day");
    assert.equal(streakDay!.amount, 5);
  });

  it("diff>1 dia → reset pra 1 com streakBroken=true", async () => {
    const u = await makeUser();
    await setLastActivity(u.id, 3, 5); // pulou 2 dias
    const r = await updateStreak(u.id);
    assert.equal(r.currentStreak, 1);
    assert.equal(r.streakBroken, true);
    assert.equal(r.longestStreak, 5, "longest_streak preserva o pico anterior");
  });

  it("atingir streak=7 → unlocka badge streak_7", async () => {
    const u = await makeUser();
    await setLastActivity(u.id, 1, 6); // 6 → 7
    const r = await updateStreak(u.id);
    assert.equal(r.currentStreak, 7);

    const { rows: badges } = await getPool().query<{ name: string }>(
      `SELECT b.name FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
        WHERE ub.user_id = $1`, [u.id],
    );
    assert.ok(badges.some((b) => b.name === "streak_7"), "badge streak_7 não foi concedido");
  });
});
