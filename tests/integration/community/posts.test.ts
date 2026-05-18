// Task #237 — Posts CRUD + RBAC + soft-hide.
//
// • createPost aceita só texto, só fotos (sentinels objstore://posts/), ou
//   ambos. Vazio (sem texto + sem foto) → EMPTY_CONTENT.
// • Imagem com sentinel inválido (URL externa, sentinel CMS) → INVALID_IMAGE_REF.
// • updatePost: autor edita; outro autor → 403 FORBIDDEN.
// • deletePost: moderator local OU role global moderator+ pode soft-hide.
//   Soft-hide cria entrada em mod_actions + notificação `post_moderated`
//   pro autor.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createForumByUser,
  createPost,
  updatePost,
  deletePost,
  getPostDetail,
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

describe("Community / Posts (Task #237)", () => {
  it("cria post só com texto", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Texto" });
    const post = await createPost(u.id, forum.id, "Olá comunidade");
    assert.equal(post.content, "Olá comunidade");
    assert.equal(post.forum_id, forum.id);
    assert.deepEqual(post.images, []);
  });

  it("cria post só com fotos (sem texto) — Reddit-style", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Fotos" });
    const post = await createPost(u.id, forum.id, "", undefined, undefined, [
      "objstore://posts/abc.jpg",
    ]);
    // O `images` resolvido pra signed URL pode falhar sem sidecar; ok
    // checar refs crus via banco.
    const { rows } = await getPool().query<{ images: unknown }>(
      `SELECT images FROM posts WHERE id = $1`,
      [post.id],
    );
    assert.deepEqual(rows[0].images, ["objstore://posts/abc.jpg"]);
  });

  it("post vazio (sem texto + sem fotos) → EMPTY_CONTENT", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Vazio" });
    await assert.rejects(
      () => createPost(u.id, forum.id, ""),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "EMPTY_CONTENT");
        assert.equal((err as AppError).statusCode, 400);
        return true;
      },
    );
  });

  it("imagem com sentinel inválido (URL externa) → INVALID_IMAGE_REF", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Invalida" });
    await assert.rejects(
      () => createPost(u.id, forum.id, "x", undefined, undefined, [
        "https://evil.example.com/img.jpg",
      ]),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "INVALID_IMAGE_REF");
        return true;
      },
    );
  });

  it("post em forum inexistente → FORUM_NOT_FOUND", async () => {
    const u = await makeUser();
    await assert.rejects(
      () => createPost(u.id, 999_999, "x"),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORUM_NOT_FOUND");
        return true;
      },
    );
  });

  it("autor edita o próprio post (content + title)", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Edit" });
    const post = await createPost(u.id, forum.id, "rascunho");
    const r = await updatePost(post.id, u.id, {
      content: "versão final",
      title: "Título novo",
    });
    assert.equal(r.updated, true);
    const detail = await getPostDetail(post.id, u.id);
    assert.equal(detail.content, "versão final");
    assert.equal(detail.title, "Título novo");
  });

  it("outro usuário (não-autor) tenta editar → FORBIDDEN 403", async () => {
    const owner = await makeUser();
    const intruso = await makeUser();
    const forum = await createForumByUser(owner.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Edit-403" });
    const post = await createPost(owner.id, forum.id, "meu");
    await assert.rejects(
      () => updatePost(post.id, intruso.id, { content: "hijacked" }),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORBIDDEN");
        assert.equal((err as AppError).statusCode, 403);
        return true;
      },
    );
  });

  it("moderator global (isModeratorPlus=true) soft-hide do post + mod_action + notificação", async () => {
    const author = await makeUser();
    const mod = await makeUser({ role: "moderator" });
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Modera" });
    const post = await createPost(author.id, forum.id, "spam suspeito");

    const r = await deletePost(post.id, mod.id, true, "regra 3");
    assert.equal(r.deleted, true);

    // is_hidden = TRUE no banco (soft delete).
    const { rows } = await getPool().query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM posts WHERE id = $1`,
      [post.id],
    );
    assert.equal(rows[0].is_hidden, true);

    // mod_actions registrado.
    const { rows: actions } = await getPool().query(
      `SELECT actor_id, action, reason FROM mod_actions
        WHERE target_kind = 'post' AND target_id = $1`,
      [post.id],
    );
    assert.equal(actions.length, 1);
    assert.equal(actions[0].actor_id, mod.id);
    assert.equal(actions[0].action, "post_deleted");
    assert.equal(actions[0].reason, "regra 3");

    // Notificação `post_moderated` criada pro autor.
    const { rows: notifs } = await getPool().query(
      `SELECT kind, user_id FROM notifications WHERE user_id = $1`,
      [author.id],
    );
    assert.ok(notifs.some((n) => n.kind === "post_moderated"));
  });

  it("moderador local (forum_moderators) — não-admin — soft-hide do post", async () => {
    const author = await makeUser();
    const localMod = await makeUser(); // role = client
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "LocalMod" });
    // promove localMod a moderador APENAS deste fórum
    await getPool().query(
      `INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2)`,
      [forum.id, localMod.id],
    );
    const post = await createPost(author.id, forum.id, "y");
    // isModeratorPlus=false (não tem role global) — bypass vem do forum_moderators
    const r = await deletePost(post.id, localMod.id, false, "regra local");
    assert.equal(r.deleted, true);

    const { rows } = await getPool().query<{ is_hidden: boolean }>(
      `SELECT is_hidden FROM posts WHERE id = $1`,
      [post.id],
    );
    assert.equal(rows[0].is_hidden, true);

    const { rows: actions } = await getPool().query(
      `SELECT actor_id FROM mod_actions WHERE target_kind='post' AND target_id=$1`,
      [post.id],
    );
    assert.equal(actions.length, 1);
    assert.equal(actions[0].actor_id, localMod.id);
  });

  it("usuário comum (não-autor, não-mod) tenta deletar → FORBIDDEN", async () => {
    const author = await makeUser();
    const intruso = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "NoDel" });
    const post = await createPost(author.id, forum.id, "x");
    await assert.rejects(
      () => deletePost(post.id, intruso.id, false),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORBIDDEN");
        return true;
      },
    );
  });

  it("autor pode auto-deletar o próprio post (sem mod_action, sem notif)", async () => {
    const author = await makeUser();
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "SelfDel" });
    const post = await createPost(author.id, forum.id, "tchau");
    const r = await deletePost(post.id, author.id, false);
    assert.equal(r.deleted, true);

    const { rows: actions } = await getPool().query(
      `SELECT 1 FROM mod_actions WHERE target_id = $1`,
      [post.id],
    );
    assert.equal(actions.length, 0, "auto-delete não registra em mod_actions");
  });


  it("post oculto (soft-hide) some de getPostDetail (POST_NOT_FOUND)", async () => {
    const author = await makeUser();
    const mod = await makeUser({ role: "moderator" });
    const forum = await createForumByUser(author.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Hidden" });
    const post = await createPost(author.id, forum.id, "vai sumir");
    await deletePost(post.id, mod.id, true);
    await assert.rejects(
      () => getPostDetail(post.id),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "POST_NOT_FOUND");
        return true;
      },
    );
  });
});
