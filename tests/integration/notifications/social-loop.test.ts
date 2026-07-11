// UX_PLAN.md J2 — regressão do loop social: comentário e reação no seu
// conteúdo geram notificação; agir no próprio conteúdo NÃO notifica; e a
// reação tem dedupe (toggle repetido não spamma).
//
// As notificações são fire-and-forget (void) — as asserções fazem polling
// curto até a notificação aparecer.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createPost,
  addComment,
  togglePostReaction,
} from "../../../server/features/community/service.js";
import { getPool, closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

async function makeForum(): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO forums (name, description, life_context, category, sort_order, is_active)
     VALUES ($1, 'forum de teste', 'casados', 'Relacionamento', 99, true)
     RETURNING id`,
    [`Forum IT ${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`],
  );
  return rows[0].id;
}

async function pollNotifications(
  userId: number,
  kind: string,
  timeoutMs = 3000,
): Promise<Array<{ kind: string; title: string; payload: Record<string, unknown> }>> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await getPool().query(
      `SELECT kind, title, payload FROM notifications WHERE user_id = $1 AND kind = $2`,
      [userId, kind],
    );
    if (rows.length > 0 || Date.now() > deadline) return rows;
    await new Promise((r) => setTimeout(r, 100));
  }
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Notificações / loop social (UX_PLAN J2)", () => {
  it("comentário no post notifica o autor; comentar no próprio post não notifica", async () => {
    const author = await makeUser({ name: "Autora" });
    const commenter = await makeUser({ name: "Visitante" });
    const forumId = await makeForum();
    const post = await createPost(author.id, forumId, "post para comentar");

    await addComment(post.id, commenter.id, "que legal esse post!");
    const notifs = await pollNotifications(author.id, "post_comment");
    assert.equal(notifs.length, 1, "autor deve receber 1 notificação de comentário");
    assert.ok(notifs[0].title.includes("Visitante"), `título deve citar o ator: ${notifs[0].title}`);

    // Autocomentário não notifica.
    await addComment(post.id, author.id, "obrigada gente!");
    await new Promise((r) => setTimeout(r, 400));
    const { rows: after2 } = await getPool().query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND kind = 'post_comment'`,
      [author.id],
    );
    assert.equal(after2[0].c, 1, "comentar no próprio post não deve gerar notificação nova");
  });

  it("reação no post notifica o autor UMA vez (dedupe em toggles repetidos)", async () => {
    const author = await makeUser({ name: "Autora" });
    const reactor = await makeUser({ name: "Fã" });
    const forumId = await makeForum();
    const post = await createPost(author.id, forumId, "post para reagir");

    await togglePostReaction(post.id, reactor.id, "❤️");
    const first = await pollNotifications(author.id, "post_reaction");
    assert.equal(first.length, 1, "autor deve receber a notificação da reação");

    // Toggle off + on de novo → dedupe segura (nada novo).
    await togglePostReaction(post.id, reactor.id, "❤️");
    await togglePostReaction(post.id, reactor.id, "❤️");
    await new Promise((r) => setTimeout(r, 400));
    const { rows } = await getPool().query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND kind = 'post_reaction'`,
      [author.id],
    );
    assert.equal(rows[0].c, 1, "toggles repetidos não devem spammar o autor");
  });

  it("resposta a comentário notifica o autor do comentário pai", async () => {
    const author = await makeUser({ name: "Autora" });
    const commenter = await makeUser({ name: "Comentarista" });
    const replier = await makeUser({ name: "Replicante" });
    const forumId = await makeForum();
    const post = await createPost(author.id, forumId, "post com thread");
    const parent = await addComment(post.id, commenter.id, "primeiro comentário");

    await addComment(post.id, replier.id, "respondendo você!", parent.id);
    const replyNotifs = await pollNotifications(commenter.id, "comment_reply");
    assert.equal(replyNotifs.length, 1, "autor do comentário pai deve ser notificado da resposta");
  });
});
