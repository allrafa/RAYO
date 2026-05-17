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
