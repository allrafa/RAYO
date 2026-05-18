// Task #240 — Admin: moderação de posts e comentários.
//
// Cobre:
//   * GET /api/admin/moderation/posts: client → 403; moderator → 200.
//   * Filtro `?status=hidden|visible|all` aplicado.
//   * POST /moderation/posts/:id/hide: producer → 403; moderator → 200
//     + posts.is_hidden=TRUE + hidden_by setado.
//   * POST /moderation/posts/:id/restore: moderator → 200 + is_hidden=FALSE.
//   * POST_NOT_FOUND para id inexistente.
//   * Espelhamento básico p/ comments (hide/restore).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
  type MadeUser,
} from "../helpers/db.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface PostsOk { success: true; data: { posts: Array<{ id: number; is_hidden: boolean }>; total: number }; error: null }
interface HiddenOk { success: true; data: { hidden: boolean }; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function seedPost(author: MadeUser, opts: { hidden?: boolean } = {}): Promise<number> {
  const pool = getPool();
  const { rows: forumRows } = await pool.query<{ id: number }>(
    `INSERT INTO forums (name, is_active) VALUES ('Geral', TRUE) RETURNING id`,
  );
  const { rows: postRows } = await pool.query<{ id: number }>(
    `INSERT INTO posts (forum_id, user_id, title, content, is_hidden)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [forumRows[0].id, author.id, "Post título", "Conteúdo do post", opts.hidden ?? false],
  );
  return postRows[0].id;
}

async function seedComment(author: MadeUser, postId: number): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
    [postId, author.id, "Comentário"],
  );
  return rows[0].id;
}

describe("Admin / Moderation (Task #240)", () => {
  it("GET /api/admin/moderation/posts 401 sem cookie", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/admin/moderation/posts" });
      assert.equal(r.status, 401);
    });
  });

  it("GET /api/admin/moderation/posts client → 403", async () => {
    const u = await makeUser({ role: "client" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        path: "/api/admin/moderation/posts",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("GET /api/admin/moderation/posts moderator → 200 lista todos", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    await seedPost(author, { hidden: false });
    await seedPost(author, { hidden: true });

    await withServer(createTestApp(), async (base) => {
      const r = await request<PostsOk>(base, {
        path: "/api/admin/moderation/posts",
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.total, 2);
      assert.equal(r.body.data.posts.length, 2);
    });
  });

  it("GET ?status=hidden devolve apenas hidden", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    await seedPost(author, { hidden: false });
    const hiddenId = await seedPost(author, { hidden: true });

    await withServer(createTestApp(), async (base) => {
      const r = await request<PostsOk>(base, {
        path: "/api/admin/moderation/posts?status=hidden",
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.posts.length, 1);
      assert.equal(r.body.data.posts[0].id, hiddenId);
      assert.equal(r.body.data.posts[0].is_hidden, true);
    });
  });

  it("GET ?status=invalido → INVALID_STATUS 400", async () => {
    const mod = await makeUser({ role: "moderator" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        path: "/api/admin/moderation/posts?status=foo",
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_STATUS");
    });
  });

  it("POST /moderation/posts/:id/hide producer → 403 (moderator+)", async () => {
    const prod = await makeUser({ role: "producer" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author);

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/admin/moderation/posts/${postId}/hide`,
        cookie: prod.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("POST /moderation/posts/:id/hide moderator → 200 + DB is_hidden=true", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author);

    await withServer(createTestApp(), async (base) => {
      const r = await request<HiddenOk>(base, {
        method: "POST",
        path: `/api/admin/moderation/posts/${postId}/hide`,
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.hidden, true);

      const { rows } = await getPool().query<{ is_hidden: boolean; hidden_by: number | null }>(
        `SELECT is_hidden, hidden_by FROM posts WHERE id = $1`, [postId],
      );
      assert.equal(rows[0].is_hidden, true);
      assert.equal(rows[0].hidden_by, mod.id);
    });
  });

  it("POST /moderation/posts/:id/restore moderator → 200 + is_hidden=false", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author, { hidden: true });

    await withServer(createTestApp(), async (base) => {
      const r = await request<HiddenOk>(base, {
        method: "POST",
        path: `/api/admin/moderation/posts/${postId}/restore`,
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.hidden, false);

      const { rows } = await getPool().query<{ is_hidden: boolean; hidden_by: number | null }>(
        `SELECT is_hidden, hidden_by FROM posts WHERE id = $1`, [postId],
      );
      assert.equal(rows[0].is_hidden, false);
      assert.equal(rows[0].hidden_by, null);
    });
  });

  it("POST /moderation/posts/:id/hide id inexistente → POST_NOT_FOUND 404", async () => {
    const mod = await makeUser({ role: "moderator" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/admin/moderation/posts/9999999/hide`,
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "POST_NOT_FOUND");
    });
  });

  it("GET /api/admin/moderation/comments moderator → 200 lista incluindo hidden", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author);
    const c1 = await seedComment(author, postId);
    const c2 = await seedComment(author, postId);
    // Esconde um pra cobrir o filtro padrão (lista ambos).
    await getPool().query(
      `UPDATE comments SET is_hidden = TRUE, hidden_by = $1, hidden_at = NOW() WHERE id = $2`,
      [mod.id, c2],
    );

    await withServer(createTestApp(), async (base) => {
      const r = await request<{
        success: true;
        data: { comments: Array<{ id: number; is_hidden: boolean }>; total: number };
        error: null;
      }>(base, {
        path: "/api/admin/moderation/comments",
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.total, 2);
      const ids = r.body.data.comments.map((c) => c.id).sort();
      assert.deepEqual(ids, [c1, c2].sort());
    });
  });

  it("POST /moderation/comments/:id/restore moderator → 200 + is_hidden=false", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author);
    const commentId = await seedComment(author, postId);
    await getPool().query(
      `UPDATE comments SET is_hidden = TRUE, hidden_by = $1, hidden_at = NOW() WHERE id = $2`,
      [mod.id, commentId],
    );

    await withServer(createTestApp(), async (base) => {
      const r = await request<HiddenOk>(base, {
        method: "POST",
        path: `/api/admin/moderation/comments/${commentId}/restore`,
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.hidden, false);

      const { rows } = await getPool().query<{ is_hidden: boolean; hidden_by: number | null }>(
        `SELECT is_hidden, hidden_by FROM comments WHERE id = $1`, [commentId],
      );
      assert.equal(rows[0].is_hidden, false);
      assert.equal(rows[0].hidden_by, null);
    });
  });

  it("POST /moderation/comments/:id/hide moderator → 200 + DB is_hidden=true", async () => {
    const mod = await makeUser({ role: "moderator" });
    const author = await makeUser({ role: "client" });
    const postId = await seedPost(author);
    const commentId = await seedComment(author, postId);

    await withServer(createTestApp(), async (base) => {
      const r = await request<HiddenOk>(base, {
        method: "POST",
        path: `/api/admin/moderation/comments/${commentId}/hide`,
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.hidden, true);

      const { rows } = await getPool().query<{ is_hidden: boolean; hidden_by: number | null }>(
        `SELECT is_hidden, hidden_by FROM comments WHERE id = $1`, [commentId],
      );
      assert.equal(rows[0].is_hidden, true);
      assert.equal(rows[0].hidden_by, mod.id);
    });
  });
});
