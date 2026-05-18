// Task #237 — Gap-fill `/api/community/forums/:slug/since?cursor=`.
//
// Após reconnect do Socket.IO, cliente passa o maior post.id recebido.
// Servidor devolve posts com id > cursor, ordem ASC, máx 50, sem
// hidden, sem class_id (feed público da comunidade).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createForumByUser,
  createPost,
  deletePost,
} from "../../../server/features/community/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface ApiOk<T> { success: true; data: T; error: null }
interface SincePayload {
  posts: Array<{ id: number; content: string; class_id: number | null }>;
  cursor: number;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Community / forums/:slug/since gap-fill (Task #237)", () => {
  it("retorna posts > cursor em ordem ASC com cursor atualizado", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Since-Asc" });
    const p1 = await createPost(u.id, forum.id, "1");
    const p2 = await createPost(u.id, forum.id, "2");
    const p3 = await createPost(u.id, forum.id, "3");

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<SincePayload>>(base, {
        path: `/api/community/forums/${forum.slug}/since?cursor=${p1.id}`,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
      const ids = r.body.data.posts.map((p) => p.id);
      assert.deepEqual(ids, [p2.id, p3.id]);
      assert.equal(r.body.data.cursor, p3.id);
    });
  });

  it("cursor=0 (sem cursor) devolve todos os posts visíveis", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Since-All" });
    const p1 = await createPost(u.id, forum.id, "a");
    const p2 = await createPost(u.id, forum.id, "b");

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<SincePayload>>(base, {
        path: `/api/community/forums/${forum.slug}/since`,
      });
      assert.equal(r.status, 200);
      const ids = r.body.data.posts.map((p) => p.id);
      assert.deepEqual(ids, [p1.id, p2.id]);
    });
  });

  it("respeita is_hidden — soft-deleted não aparece no gap-fill", async () => {
    const u = await makeUser();
    const mod = await makeUser({ role: "moderator" });
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Since-Hidden" });
    const p1 = await createPost(u.id, forum.id, "visível");
    const p2 = await createPost(u.id, forum.id, "será escondido");
    await deletePost(p2.id, mod.id, true);

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<SincePayload>>(base, {
        path: `/api/community/forums/${forum.slug}/since?cursor=0`,
      });
      assert.equal(r.status, 200);
      const ids = r.body.data.posts.map((p) => p.id);
      assert.deepEqual(ids, [p1.id], "post escondido não retorna");
    });
  });

  it("filtra class_id IS NULL — posts de turma NÃO vazam pro feed da comunidade", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Since-Class" });
    const publico = await createPost(u.id, forum.id, "público");
    // Cria post escopado a uma turma direto no banco (bypass do validate
    // de matrícula — interessa só ver o filtro do gap-fill).
    const { rows: cls } = await getPool().query<{ id: number }>(
      `INSERT INTO courses (title) VALUES ('Turma teste') RETURNING id`,
    );
    const classId = cls[0].id;
    const { rows: classPost } = await getPool().query<{ id: number }>(
      `INSERT INTO posts (user_id, forum_id, content, class_id, is_hidden)
       VALUES ($1, $2, 'turma-only', $3, FALSE) RETURNING id`,
      [u.id, forum.id, classId],
    );

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<SincePayload>>(base, {
        path: `/api/community/forums/${forum.slug}/since?cursor=0`,
      });
      assert.equal(r.status, 200);
      const ids = r.body.data.posts.map((p) => p.id);
      assert.deepEqual(ids, [publico.id], "class post não pode aparecer no gap-fill público");
      assert.ok(!ids.includes(classPost[0].id));
    });
  });

  it("respeita LIMIT 50 — devolve no máximo 50 posts mesmo com mais no banco", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Since-Limit" });
    // Cria 55 posts. Performance ok pra integration test.
    for (let i = 0; i < 55; i++) {
      await createPost(u.id, forum.id, `p${i}`);
    }
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<SincePayload>>(base, {
        path: `/api/community/forums/${forum.slug}/since?cursor=0`,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.posts.length, 50, "LIMIT 50 hardcoded no service");
    });
  });

  it("slug com chars inválidos → 400 INVALID_SLUG", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ success: false; error: { code: string } }>(base, {
        path: `/api/community/forums/SLUG_GRANDE_DEMAIS_E_COM_UPPERCASE/since?cursor=0`,
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_SLUG");
    });
  });

  it("slug inexistente → 404 FORUM_NOT_FOUND", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ success: false; error: { code: string } }>(base, {
        path: `/api/community/forums/nao-existe/since?cursor=0`,
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "FORUM_NOT_FOUND");
    });
  });
});
