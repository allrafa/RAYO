// Task #240 — Turmas (mini-Skool, alias do Academia).
//
// Cobre:
//   * POST /api/courses/:id/enroll cria user_course_progress; 2ª chamada
//     devolve ALREADY_ENROLLED.
//   * POST /api/turmas/:id/posts: non-member → 404 TURMA_NOT_FOUND
//     (deliberado, não vaza existência); member → 201 + post tem class_id.
//   * GET /api/turmas/:id/posts segue mesma regra de membership.
//   * POST /api/turmas/:id/interest: 201 na 1ª; 2ª dentro de 24h vira
//     `duplicated: true` (mesma resposta 201, sem 2ª linha em DB).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface EnrollOk { success: true; data: { alreadyEnrolled: boolean; courseTitle: string }; error: null }
interface PostOk { success: true; data: { post: { id: number; class_id: number | null } }; error: null }
interface PostsListOk { success: true; data: { posts: Array<{ id: number }> }; error: null }
interface InterestOk { success: true; data: { duplicated: boolean; courseTitle: string }; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function seedCourse(title: string = "Turma Test"): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO courses (title, total_lessons, is_active) VALUES ($1, 0, TRUE) RETURNING id`,
    [title],
  );
  return rows[0].id;
}

async function seedForum(name: string = "Forum Test"): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO forums (name, is_active) VALUES ($1, TRUE) RETURNING id`,
    [name],
  );
  return rows[0].id;
}

describe("Turmas (Task #240)", () => {
  it("POST /api/courses/:id/enroll: cria progresso; segunda chamada → ALREADY_ENROLLED", async () => {
    const u = await makeUser();
    const courseId = await seedCourse("Curso A");

    await withServer(createTestApp(), async (base) => {
      const r1 = await request<EnrollOk>(base, {
        method: "POST",
        path: `/api/courses/${courseId}/enroll`,
        cookie: u.sessionCookie,
      });
      assert.equal(r1.status, 201);
      assert.equal(r1.body.data.alreadyEnrolled, false);

      // DB: linha em user_course_progress
      const { rows } = await getPool().query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_course_progress WHERE user_id = $1 AND course_id = $2`,
        [u.id, courseId],
      );
      assert.equal(rows[0].count, "1");

      const r2 = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/courses/${courseId}/enroll`,
        cookie: u.sessionCookie,
      });
      assert.equal(r2.status, 400);
      assert.equal(r2.body.error.code, "ALREADY_ENROLLED");
    });
  });

  it("GET /api/turmas/:id/posts: non-member → 404 TURMA_NOT_FOUND", async () => {
    const u = await makeUser();
    const courseId = await seedCourse("Privada");

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "GET",
        path: `/api/turmas/${courseId}/posts`,
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "TURMA_NOT_FOUND");
    });
  });

  it("POST /api/turmas/:id/posts: member cria post escopado por class_id", async () => {
    const u = await makeUser();
    const courseId = await seedCourse("Aberta");
    const forumId = await seedForum("Geral");
    // Matrícula direta no banco pra evitar acoplar com /enroll neste spec.
    await getPool().query(
      `INSERT INTO user_course_progress (user_id, course_id, total_lessons) VALUES ($1, $2, 0)`,
      [u.id, courseId],
    );

    await withServer(createTestApp(), async (base) => {
      const r = await request<PostOk>(base, {
        method: "POST",
        path: `/api/turmas/${courseId}/posts`,
        cookie: u.sessionCookie,
        body: { forum_id: forumId, content: "Olá turma!" },
      });
      assert.equal(r.status, 201);
      assert.equal(r.body.data.post.class_id, courseId, "post deve ter class_id setado");

      // GET /api/turmas/:id/posts agora devolve esse post.
      const list = await request<PostsListOk>(base, {
        path: `/api/turmas/${courseId}/posts`,
        cookie: u.sessionCookie,
      });
      assert.equal(list.status, 200);
      assert.equal(list.body.data.posts.length, 1);
      assert.equal(list.body.data.posts[0].id, r.body.data.post.id);
    });
  });

  it("POST /api/turmas/:id/interest: 1ª 201 grava, 2ª dentro de 24h vira duplicated", async () => {
    const u = await makeUser();
    const courseId = await seedCourse("Em Breve");

    await withServer(createTestApp(), async (base) => {
      const r1 = await request<InterestOk>(base, {
        method: "POST",
        path: `/api/turmas/${courseId}/interest`,
        cookie: u.sessionCookie,
        body: { name: "Maria Teste", email: "maria@teste.dev", message: "Quero!" },
      });
      assert.equal(r1.status, 201);
      assert.equal(r1.body.data.duplicated, false);

      const r2 = await request<InterestOk>(base, {
        method: "POST",
        path: `/api/turmas/${courseId}/interest`,
        cookie: u.sessionCookie,
        body: { name: "Maria Teste", email: "maria@teste.dev", message: "De novo" },
      });
      assert.equal(r2.status, 201);
      assert.equal(r2.body.data.duplicated, true);

      // DB: somente 1 linha em class_interests
      const { rows } = await getPool().query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM class_interests WHERE course_id = $1`,
        [courseId],
      );
      assert.equal(rows[0].count, "1");
    });
  });

  it("POST /api/turmas/:id/interest: payload inválido → INVALID_EMAIL", async () => {
    const u = await makeUser();
    const courseId = await seedCourse("Curso X");

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: `/api/turmas/${courseId}/interest`,
        cookie: u.sessionCookie,
        body: { name: "Joana", email: "nao-eh-email", message: "" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_EMAIL");
    });
  });
});
