// DIFERENCIAL_PLAN.md D1 — a Palavra sai do app.
//
// 1) tickVersePost: cria a thread do dia em c/geral assinada pelo
//    usuário-sistema (Equipe RAYO); idempotente (2ª chamada devolve o
//    MESMO post, sem duplicar); sem fórum geral, não registra claim.
// 2) tickVersePush (sender injetado): só quem tem push_subscriptions e
//    não fez opt-out recebe; claim idempotente entre ticks; o link
//    aponta pra thread do dia; sem VAPID (pushReady=false) nem claim.
// 3) runEmailSchedulerTick: janela 8h–11h59 (7h30 não dispara D1).
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
  runEmailSchedulerTick,
  tickVersePost,
  tickVersePush,
  spNowParts,
} from "../../../server/lib/emailScheduler.js";
import { verseForDate } from "../../../server/features/home/verses.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

const QUARTA_0830_SP = new Date("2026-07-15T11:30:00.000Z"); // 08:30 SP
const QUARTA_0730_SP = new Date("2026-07-15T10:30:00.000Z"); // 07:30 SP

async function seedGeralForum(): Promise<number> {
  // O seed do ensureSchema pode já ter criado c/geral (1º teste da
  // suíte roda antes de qualquer truncate) — idempotente.
  const existing = await getPool().query<{ id: number }>(
    `SELECT id FROM forums WHERE slug = 'geral' LIMIT 1`,
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  const owner = await makeUser();
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO forums (name, slug, category, created_by)
     VALUES ('Geral', 'geral', 'geral', $1) RETURNING id`,
    [owner.id],
  );
  return rows[0].id;
}

async function fakeSub(userId: number) {
  await getPool().query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, 'key', 'auth')`,
    [userId, `https://push.example/ep-${userId}`],
  );
}

describe("D1 / thread do dia (tickVersePost)", () => {
  it("cria a thread em c/geral assinada pela Equipe RAYO; idempotente", async () => {
    const forumId = await seedGeralForum();
    const sp = spNowParts(QUARTA_0830_SP);
    const verse = verseForDate(QUARTA_0830_SP);

    const r1 = await tickVersePost(sp, QUARTA_0830_SP);
    assert.equal(r1.created, true);
    assert.ok(r1.postId, "post criado");

    const { rows: posts } = await getPool().query(
      `SELECT p.forum_id, p.title, p.content, u.email AS author_email
         FROM posts p JOIN users u ON u.id = p.user_id
        WHERE p.id = $1`,
      [r1.postId],
    );
    assert.equal(posts[0].forum_id, forumId);
    assert.equal(posts[0].author_email, "comunidade@rayo.app.br");
    assert.ok(posts[0].title.includes(verse.ref), "título carrega a referência do dia");
    assert.ok(posts[0].content.includes(verse.text), "conteúdo carrega o versículo");

    // 2ª chamada no mesmo dia: nada novo, devolve o mesmo post.
    const r2 = await tickVersePost(sp, QUARTA_0830_SP);
    assert.equal(r2.created, false);
    assert.equal(r2.postId, r1.postId);
    const { rows: count } = await getPool().query(
      `SELECT COUNT(*)::int AS n FROM posts WHERE title LIKE '🌿 Palavra do dia%'`,
    );
    assert.equal(count[0].n, 1);
  });

  it("sem fórum geral: não cria e não queima o claim do dia", async () => {
    const sp = spNowParts(QUARTA_0830_SP);
    const r = await tickVersePost(sp, QUARTA_0830_SP);
    assert.equal(r.created, false);
    assert.equal(r.postId, null);
    const { rows } = await getPool().query(
      `SELECT COUNT(*)::int AS n FROM email_sends WHERE kind = 'verse_post'`,
    );
    assert.equal(rows[0].n, 0, "claim liberado — o dia continua disponível");
  });
});

describe("D1 / push diário da Palavra (tickVersePush)", () => {
  it("envia só pra quem tem push ativo e sem opt-out; idempotente; link na thread", async () => {
    await seedGeralForum();
    const sp = spNowParts(QUARTA_0830_SP);
    const post = await tickVersePost(sp, QUARTA_0830_SP);

    const comSub = await makeUser();
    const semSub = await makeUser();
    const optOut = await makeUser();
    await fakeSub(comSub.id);
    await fakeSub(optOut.id);
    await getPool().query(
      `UPDATE users SET notification_preferences = '{"notifications":{"push":false}}'::jsonb
        WHERE id = $1`,
      [optOut.id],
    );

    const delivered: Array<{ userId: number; title: string; link?: string }> = [];
    const sender = async (userId: number, payload: { title: string; body?: string | null; link?: string | null }) => {
      delivered.push({ userId, title: payload.title, link: payload.link ?? undefined });
    };

    const n1 = await tickVersePush(sp, QUARTA_0830_SP, post.postId, sender, () => true);
    assert.equal(n1, 1, "só o usuário com subscription e opt-in");
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].userId, comSub.id);
    assert.match(delivered[0].title, /Palavra do dia/);
    assert.equal(delivered[0].link, `/c/geral/p/${post.postId}`, "push aponta pra thread do dia");
    void semSub;

    // 2º tick: ninguém de novo.
    const n2 = await tickVersePush(sp, QUARTA_0830_SP, post.postId, sender, () => true);
    assert.equal(n2, 0);
    assert.equal(delivered.length, 1);
  });

  it("sem VAPID (pushReady=false): nenhum claim — o dia fica disponível", async () => {
    const sp = spNowParts(QUARTA_0830_SP);
    const u = await makeUser();
    await fakeSub(u.id);
    const n = await tickVersePush(sp, QUARTA_0830_SP, null, async () => {}, () => false);
    assert.equal(n, 0);
    const { rows } = await getPool().query(
      `SELECT COUNT(*)::int AS n FROM email_sends WHERE kind = 'verse_push'`,
    );
    assert.equal(rows[0].n, 0);
  });
});

describe("D1 / janela no tick geral", () => {
  it("7h30: missão roda, D1 ainda não; 8h30: thread criada", async () => {
    await seedGeralForum();
    const r1 = await runEmailSchedulerTick(QUARTA_0730_SP);
    assert.equal(r1.versePost, false, "antes das 8h não posta");
    const r2 = await runEmailSchedulerTick(QUARTA_0830_SP);
    assert.equal(r2.versePost, true);
  });
});
