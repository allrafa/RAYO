// Task #235 — POST /api/lgpd/data-export.
//
// Contrato (server/features/lgpd/service.ts:exportUserData):
//  - Requer auth (requireAuth no router).
//  - Devolve { profile, courseProgress, lessonProgress, posts, comments,
//    badges, xpLog, missions, analyticsEvents, lgpdRequests, exportedAt }.
//  - Cada lista é escopada por user_id; nenhum dado de outro user vaza.
//  - Cria uma linha em `lgpd_requests` com request_type='export' e
//    status='completed'.
//
// O endpoint NÃO aceita cross-user lookups (não tem :userId no path), então
// "só dono pode acessar" é implícito — testamos via 401 anônimo.

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, getPool, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

interface ExportPayload {
  message: string;
  export: {
    profile: { id?: number; email?: string; name?: string };
    posts: unknown[];
    comments: unknown[];
    badges: unknown[];
    xpLog: unknown[];
    missions: unknown[];
    analyticsEvents: unknown[];
    lgpdRequests: unknown[];
    exportedAt: string;
  };
}

describe("LGPD data export (Task #235)", () => {
  it("anônimo → 401", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request(base, { method: "POST", path: "/api/lgpd/data-export" });
      assert.equal(r.status, 401);
    });
  });

  it("autenticado → 200 com profile + listas vazias pra user limpo", async () => {
    const user = await makeUser({ name: "Exportador" });
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ success: boolean; data: ExportPayload }>(base, {
        method: "POST", path: "/api/lgpd/data-export", cookie: user.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
      const exp = r.body.data.export;
      assert.equal(exp.profile.id, user.id);
      assert.equal(exp.profile.email, user.email);
      assert.equal(exp.profile.name, user.name);
      assert.ok(Array.isArray(exp.posts) && exp.posts.length === 0);
      assert.ok(Array.isArray(exp.comments) && exp.comments.length === 0);
      assert.ok(typeof exp.exportedAt === "string");
    });
    // Foi registrado em lgpd_requests com status completed.
    const { rows } = await getPool().query<{ status: string; request_type: string }>(
      `SELECT status, request_type FROM lgpd_requests WHERE user_id = $1`, [user.id],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].request_type, "export");
    assert.equal(rows[0].status, "completed");
  });

  it("export inclui progresso de curso/lição quando o user tem completions", async () => {
    // Garante que completions registradas via user_course_progress e
    // user_lesson_progress aparecem no payload do export.
    const user = await makeUser();
    const pool = getPool();
    // Seed mínimo: 1 curso + 1 módulo + 1 lição.
    const { rows: cRows } = await pool.query<{ id: number }>(
      `INSERT INTO courses (title, description)
       VALUES ('Curso LGPD', 'desc') RETURNING id`,
    );
    const courseId = cRows[0].id;
    const { rows: mRows } = await pool.query<{ id: number }>(
      `INSERT INTO course_modules (course_id, title, sort_order)
       VALUES ($1, 'Módulo 1', 1) RETURNING id`,
      [courseId],
    );
    const moduleId = mRows[0].id;
    const { rows: lRows } = await pool.query<{ id: number }>(
      `INSERT INTO course_lessons (module_id, title, sort_order, content_type)
       VALUES ($1, 'Lição 1', 1, 'video') RETURNING id`,
      [moduleId],
    );
    const lessonId = lRows[0].id;
    await pool.query(
      `INSERT INTO user_course_progress (user_id, course_id, progress_percentage,
         completed_lessons, total_lessons, enrolled_at)
       VALUES ($1, $2, 100, 1, 1, NOW())`,
      [user.id, courseId],
    );
    await pool.query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, status,
         progress_seconds, completed_at, started_at)
       VALUES ($1, $2, 'completed', 120, NOW(), NOW())`,
      [user.id, lessonId],
    );

    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{
        data: {
          export: {
            courseProgress: Array<{ course_title?: string; progress_percentage?: number }>;
            lessonProgress: Array<{ lesson_title?: string; status?: string }>;
          };
        };
      }>(base, {
        method: "POST", path: "/api/lgpd/data-export", cookie: user.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.export.courseProgress.length, 1);
      assert.equal(r.body.data.export.courseProgress[0].course_title, "Curso LGPD");
      assert.equal(Number(r.body.data.export.courseProgress[0].progress_percentage), 100);
      assert.equal(r.body.data.export.lessonProgress.length, 1);
      assert.equal(r.body.data.export.lessonProgress[0].status, "completed");
    });
  });

  it("export do user A não traz nada do user B (isolamento por user_id)", async () => {
    const a = await makeUser({ name: "Alice" });
    const b = await makeUser({ name: "Bob" });
    // Bob gera dado próprio: 1 evento de analytics.
    await getPool().query(
      `INSERT INTO analytics_events (user_id, event_name, metadata)
       VALUES ($1, 'test_event', '{}'::jsonb)`,
      [b.id],
    );

    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request<{ data: ExportPayload }>(base, {
        method: "POST", path: "/api/lgpd/data-export", cookie: a.sessionCookie,
      });
      assert.equal(r.status, 200);
      // Alice não vê nenhum evento do Bob.
      assert.equal(r.body.data.export.analyticsEvents.length, 0);
      assert.equal(r.body.data.export.profile.id, a.id);
    });
  });
});
