// Task #237 — Comments: criar, reply nesting (parent_id), soft-hide via
// `setCommentHiddenWithAuth` (mod local OU global), reaction em comment.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createForumByUser,
  createPost,
  addComment,
  toggleCommentReaction,
  setCommentHiddenWithAuth,
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

describe("Community / Comments (Task #237)", () => {
  it("addComment cria comment + incrementa posts.comment_count", async () => {
    const author = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Com-1" });
    const post = await createPost(author.id, forum.id, "x");

    const c = await addComment(post.id, author.id, "primeiro comentário");
    assert.equal(c.content, "primeiro comentário");
    assert.equal(c.parent_id, null);

    const { rows } = await getPool().query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = $1`,
      [post.id],
    );
    assert.equal(Number(rows[0].comment_count), 1);
  });

  it("reply aninhado — parent_id aponta pro pai", async () => {
    const author = await makeUser();
    const replier = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Reply" });
    const post = await createPost(author.id, forum.id, "x");
    const parent = await addComment(post.id, author.id, "topo");
    const child = await addComment(post.id, replier.id, "resposta", parent.id);
    assert.equal(child.parent_id, parent.id);
  });

  it("comment vazio → EMPTY_COMMENT", async () => {
    const author = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Empty" });
    const post = await createPost(author.id, forum.id, "x");
    await assert.rejects(
      () => addComment(post.id, author.id, "   "),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "EMPTY_COMMENT");
        return true;
      },
    );
  });

  it("parent_id inexistente em post diferente → PARENT_NOT_FOUND", async () => {
    const author = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Bad-parent" });
    const postA = await createPost(author.id, forum.id, "A");
    const postB = await createPost(author.id, forum.id, "B");
    const cInA = await addComment(postA.id, author.id, "no A");
    // tentar replicar parent de A num comentário em B
    await assert.rejects(
      () => addComment(postB.id, author.id, "resposta cross-post", cInA.id),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "PARENT_NOT_FOUND");
        return true;
      },
    );
  });

  it("setCommentHiddenWithAuth (mod global) soft-hide + mod_action", async () => {
    const author = await makeUser();
    const mod = await makeUser({ role: "moderator" });
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Mod-comment" });
    const post = await createPost(author.id, forum.id, "x");
    const c = await addComment(post.id, author.id, "ofensivo");

    await setCommentHiddenWithAuth(c.id, true, mod.id, true);

    const { rows } = await getPool().query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM comments WHERE id = $1`,
      [c.id],
    );
    assert.equal(rows[0].is_hidden, true);

    const { rows: actions } = await getPool().query<{ action: string }>(
      `SELECT action FROM mod_actions WHERE target_kind='comment' AND target_id=$1`,
      [c.id],
    );
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "comment_hidden");
  });

  it("setCommentHiddenWithAuth via moderador LOCAL (sem role global) também esconde", async () => {
    const author = await makeUser();
    const localMod = await makeUser(); // role = client
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Mod-local" });
    await getPool().query(
      `INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2)`,
      [forum.id, localMod.id],
    );
    const post = await createPost(author.id, forum.id, "x");
    const c = await addComment(post.id, author.id, "alvo");

    // isModeratorPlus=false — caminho positivo é o `isForumModerator`.
    await setCommentHiddenWithAuth(c.id, true, localMod.id, false);

    const { rows } = await getPool().query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM comments WHERE id = $1`, [c.id],
    );
    assert.equal(rows[0].is_hidden, true);

    const { rows: actions } = await getPool().query<{ actor_id: number }>(
      `SELECT actor_id FROM mod_actions
        WHERE target_kind='comment' AND target_id=$1`, [c.id],
    );
    assert.equal(actions[0].actor_id, localMod.id);
  });

  it("setCommentHiddenWithAuth sem permissão → FORBIDDEN", async () => {
    const author = await makeUser();
    const intruso = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Mod-403" });
    const post = await createPost(author.id, forum.id, "x");
    const c = await addComment(post.id, author.id, "qualquer");

    await assert.rejects(
      () => setCommentHiddenWithAuth(c.id, true, intruso.id, false),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORBIDDEN");
        assert.equal((err as AppError).statusCode, 403);
        return true;
      },
    );
  });

  it("toggleCommentReaction insere e remove reação no comment", async () => {
    const author = await makeUser();
    const reactor = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "C-react" });
    const post = await createPost(author.id, forum.id, "x");
    const c = await addComment(post.id, author.id, "y");

    const r1 = await toggleCommentReaction(c.id, reactor.id, "🙏");
    assert.equal(r1.user_reaction, "🙏");
    assert.equal(r1.reactions[0].emoji, "🙏");
    assert.equal(r1.reactions[0].count, 1);

    const r2 = await toggleCommentReaction(c.id, reactor.id, "🙏");
    assert.equal(r2.user_reaction, null);
    assert.equal(r2.reactions.length, 0);
  });
});
