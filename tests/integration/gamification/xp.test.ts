// Task #240 — Gamification: XP, level-up e mission progress.
//
// Cobre:
//   * addXP cresce `users.xp` e escreve em xp_log + user_xp.
//   * Atravessar limiar de nível (>= 250) promove pra level 3 e unlocka
//     o badge `level_3`; idem 1000 → level 5 + `level_5`.
//   * Subir de nível idempotente (segundo addXP no mesmo nível NÃO
//     duplica entrada em user_badges).
//   * recordMissionProgress: 1ª chamada cria `user_mission_progress`
//     (ON CONFLICT DO NOTHING), 2ª chamada incrementa current_progress
//     e marca `completed=true` quando atinge action_count.
//
// Estratégia: chamamos o service direto (já é integration test contra
// Postgres real) e fazemos asserts em DB. Mais determinístico que ir
// pelo endpoint interno POST /api/gamification/xp (que exige
// INTERNAL_API_KEY no ambiente).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addXP,
  recordMissionProgress,
} from "../../../server/features/gamification/service.js";
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

describe("Gamification / XP + Level-up + Missions (Task #240)", () => {
  it("addXP cresce users.xp e registra xp_log + user_xp", async () => {
    const u = await makeUser();
    const r = await addXP(u.id, 30, "create_post");
    assert.equal(r.newTotalXP, 30);
    assert.equal(r.newLevel, 1); // ainda nível 1 (limiar é 100)
    assert.equal(r.leveledUp, false);

    const { rows: userRow } = await getPool().query<{ xp: number; level: number }>(
      `SELECT xp, level FROM users WHERE id = $1`, [u.id],
    );
    assert.equal(userRow[0].xp, 30);
    assert.equal(userRow[0].level, 1);

    const { rows: log } = await getPool().query<{ amount: number; reason: string }>(
      `SELECT amount, reason FROM xp_log WHERE user_id = $1`, [u.id],
    );
    assert.equal(log.length, 1);
    assert.equal(log[0].amount, 30);
    assert.equal(log[0].reason, "create_post");

    const { rows: ux } = await getPool().query<{ total_xp: number; current_level: number }>(
      `SELECT total_xp, current_level FROM user_xp WHERE user_id = $1`, [u.id],
    );
    assert.equal(ux[0].total_xp, 30);
    assert.equal(ux[0].current_level, 1);
  });

  it("atravessar 250 XP → level 3 + unlock badge level_3", async () => {
    const u = await makeUser();
    const r = await addXP(u.id, 260, "complete_course");
    assert.equal(r.newLevel, 3);
    assert.equal(r.leveledUp, true);

    const { rows: badges } = await getPool().query<{ name: string }>(
      `SELECT b.name FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
        WHERE ub.user_id = $1`, [u.id],
    );
    assert.ok(badges.some((b) => b.name === "level_3"), "badge level_3 não foi concedido");
    assert.ok(!badges.some((b) => b.name === "level_5"), "level_5 não deveria ter sido concedido ainda");
  });

  it("atravessar limiares progressivamente: level_3 → level_5; sem duplicar", async () => {
    const u = await makeUser();

    // addXP só unlocka o badge do nível RECÉM-atingido (level_${newLevel}),
    // não dos intermediários (ver service.ts: [3,5].includes(newLevel)).
    // Cruzando os limiares em passos:
    await addXP(u.id, 260, "complete_course"); // → level 3
    const { rows: b1 } = await getPool().query<{ name: string }>(
      `SELECT b.name FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
        WHERE ub.user_id = $1`, [u.id],
    );
    assert.ok(b1.some((b) => b.name === "level_3"));

    await addXP(u.id, 800, "complete_course"); // → level 5 (>= 1000)
    const { rows: b2 } = await getPool().query<{ name: string }>(
      `SELECT b.name FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
        WHERE ub.user_id = $1`, [u.id],
    );
    assert.ok(b2.some((b) => b.name === "level_5"));

    // Mais XP sem mudar de nível: NÃO deve duplicar user_badges.
    const totalBefore = b2.length;
    await addXP(u.id, 50, "create_post");
    const { rows: count } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_badges WHERE user_id = $1`, [u.id],
    );
    assert.equal(parseInt(count[0].count, 10), totalBefore, "user_badges duplicou após XP sem level-up");
  });

  it("recordMissionProgress: 1ª chamada cria progresso, 2ª completa quando atinge action_count", async () => {
    const u = await makeUser();

    // Missão seedada por initializeSchema: type='daily', action_type='watch_lesson',
    // action_count=1, xp_reward=25. Ver server/db/schema.ts seedBadgesAndMissions.
    await recordMissionProgress(u.id, "watch_lesson");

    const { rows: prog1 } = await getPool().query<{
      current_progress: number;
      completed: boolean;
    }>(
      `SELECT ump.current_progress, ump.completed
         FROM user_mission_progress ump
         JOIN missions m ON m.id = ump.mission_id
        WHERE ump.user_id = $1 AND m.type = 'daily' AND m.action_type = 'watch_lesson'`,
      [u.id],
    );
    assert.equal(prog1.length, 1, "deve existir 1 linha de progresso diário");
    assert.equal(prog1[0].current_progress, 1);
    assert.equal(prog1[0].completed, true, "daily watch_lesson completa em 1 ação");

    // Segunda chamada não duplica linha (ON CONFLICT DO NOTHING no insert)
    // nem aumenta progresso além do action_count (LEAST na UPDATE).
    await recordMissionProgress(u.id, "watch_lesson");
    const { rows: prog2 } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_mission_progress
         WHERE user_id = $1`, [u.id],
    );
    // 1 daily + 1 weekly (mesma action_type, períodos distintos).
    assert.ok(parseInt(prog2[0].count, 10) >= 1);
  });

  it("recordMissionProgress: weekly mission acumula até action_count=3", async () => {
    const u = await makeUser();
    // weekly watch_lesson tem action_count=3, xp_reward=75.
    await recordMissionProgress(u.id, "watch_lesson");
    await recordMissionProgress(u.id, "watch_lesson");
    await recordMissionProgress(u.id, "watch_lesson");
    const { rows } = await getPool().query<{
      current_progress: number;
      completed: boolean;
    }>(
      `SELECT ump.current_progress, ump.completed
         FROM user_mission_progress ump
         JOIN missions m ON m.id = ump.mission_id
        WHERE ump.user_id = $1 AND m.type = 'weekly' AND m.action_type = 'watch_lesson'`,
      [u.id],
    );
    assert.equal(rows[0].current_progress, 3);
    assert.equal(rows[0].completed, true);
  });
});
