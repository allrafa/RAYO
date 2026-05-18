// Task #237 — Reactions multi-emoji (Task #122).
//
// Set fechado ["❤️","😂","🙏","💡","🔥","👏"]. Toggle:
//   • sem reação atual + emoji novo  → INSERT (like_count++)
//   • mesma emoji do registro atual  → DELETE (like_count--)
//   • emoji diferente                → UPDATE (like_count inalterado)
// like_count reflete o TOTAL de reações (qualquer emoji).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createForumByUser,
  createPost,
  togglePostReaction,
  ALLOWED_REACTION_EMOJIS,
} from "../../../server/features/community/service.js";
import { AppError } from "../../../server/features/academia/service.js";
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

async function getLikeCount(postId: number): Promise<number> {
  const { rows } = await getPool().query<{ like_count: number }>(
    `SELECT like_count FROM posts WHERE id = $1`,
    [postId],
  );
  return Number(rows[0].like_count);
}

describe("Community / Reactions multi-emoji (Task #237)", () => {
  it("primeiro toggle insere reação, user_reaction = emoji enviado", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "React-1" });
    const post = await createPost(u.id, forum.id, "x");

    const r = await togglePostReaction(post.id, u.id, "🔥");
    assert.equal(r.user_reaction, "🔥");
    assert.equal(r.reactions.length, 1);
    assert.equal(r.reactions[0].emoji, "🔥");
    assert.equal(r.reactions[0].count, 1);
    assert.equal(await getLikeCount(post.id), 1);
  });

  it("toggle off — mesmo emoji duas vezes remove a reação", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "React-2" });
    const post = await createPost(u.id, forum.id, "x");

    await togglePostReaction(post.id, u.id, "👏");
    const r = await togglePostReaction(post.id, u.id, "👏");
    assert.equal(r.user_reaction, null);
    assert.equal(r.reactions.length, 0);
    assert.equal(await getLikeCount(post.id), 0);
  });

  it("trocar emoji (swap) NÃO mexe no like_count", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "React-3" });
    const post = await createPost(u.id, forum.id, "x");

    await togglePostReaction(post.id, u.id, "❤️");
    assert.equal(await getLikeCount(post.id), 1);

    const r = await togglePostReaction(post.id, u.id, "😂");
    assert.equal(r.user_reaction, "😂");
    assert.equal(await getLikeCount(post.id), 1, "swap mantém o total");
    assert.equal(r.reactions[0].emoji, "😂");
    assert.equal(r.reactions[0].count, 1);
  });

  it("contagem por emoji é correta com múltiplos usuários", async () => {
    const author = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "React-multi" });
    const post = await createPost(author.id, forum.id, "x");

    // 3 usuários reagem com ❤️, 2 com 🔥
    const heartUsers = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const fireUsers = await Promise.all([makeUser(), makeUser()]);
    for (const u of heartUsers) await togglePostReaction(post.id, u.id, "❤️");
    for (const u of fireUsers) await togglePostReaction(post.id, u.id, "🔥");

    const finalR = await togglePostReaction(post.id, fireUsers[1].id, "🔥");
    // último toggle off: tira fireUsers[1]; sobra 3❤ + 1🔥
    const byEmoji = new Map(finalR.reactions.map((r) => [r.emoji, r.count]));
    assert.equal(byEmoji.get("❤️"), 3);
    assert.equal(byEmoji.get("🔥"), 1);
    assert.equal(await getLikeCount(post.id), 4);
  });

  it("emoji fora do set fechado → INVALID_REACTION_EMOJI", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "React-bad" });
    const post = await createPost(u.id, forum.id, "x");
    await assert.rejects(
      () => togglePostReaction(post.id, u.id, "🤡"),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "INVALID_REACTION_EMOJI");
        return true;
      },
    );
  });

  it("ALLOWED_REACTION_EMOJIS expõe exatamente os 6 emojis contratados", () => {
    assert.deepEqual(
      [...ALLOWED_REACTION_EMOJIS],
      ["❤️", "😂", "🙏", "💡", "🔥", "👏"],
    );
  });

  it("post inexistente → POST_NOT_FOUND", async () => {
    const u = await makeUser();
    await assert.rejects(
      () => togglePostReaction(999_999, u.id, "❤️"),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "POST_NOT_FOUND");
        return true;
      },
    );
  });
});
