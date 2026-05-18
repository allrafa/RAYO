// Task #240 — Admin: gestão de usuários.
//
// Cobre:
//   * GET /api/admin/users: producer/moderator → 403 (admin-only);
//     admin → 200 com lista paginada.
//   * PATCH /api/admin/users/:id/role: producer → 403; admin → 200.
//   * INVALID_ROLE → 400. USER_NOT_FOUND → 404. CANNOT_DEMOTE_SELF → 400.
//   * Filtro `?role=producer` aplicado no WHERE.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface UsersOk { success: true; data: { users: Array<{ id: number; role: string }>; total: number }; error: null }
interface UserOk { success: true; data: { user: { id: number; role: string } }; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

describe("Admin / Users (Task #240)", () => {
  it("GET /api/admin/users 401 sem cookie", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/admin/users" });
      assert.equal(r.status, 401);
    });
  });

  it("GET /api/admin/users producer → 403 (admin-only)", async () => {
    const u = await makeUser({ role: "producer" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        path: "/api/admin/users",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("GET /api/admin/users moderator → 403 (admin-only)", async () => {
    const u = await makeUser({ role: "moderator" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        path: "/api/admin/users",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("GET /api/admin/users admin → 200 + lista paginada", async () => {
    const admin = await makeUser({ role: "admin" });
    await makeUser({ role: "client" });
    await makeUser({ role: "producer" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<UsersOk>(base, {
        path: "/api/admin/users",
        cookie: admin.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.ok(r.body.data.total >= 3, `esperava ao menos 3 users, veio ${r.body.data.total}`);
      // O próprio admin está no resultado
      assert.ok(r.body.data.users.some((x) => x.id === admin.id));
    });
  });

  it("GET /api/admin/users com filtro role=producer só devolve producers", async () => {
    const admin = await makeUser({ role: "admin" });
    const prod = await makeUser({ role: "producer" });
    await makeUser({ role: "client" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<UsersOk>(base, {
        path: "/api/admin/users?role=producer",
        cookie: admin.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.ok(r.body.data.users.every((u) => u.role === "producer"), "filtro role=producer não foi aplicado");
      assert.ok(r.body.data.users.some((u) => u.id === prod.id));
    });
  });

  it("PATCH /api/admin/users/:id/role producer → 403 (admin-only)", async () => {
    const prod = await makeUser({ role: "producer" });
    const target = await makeUser({ role: "client" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "PATCH",
        path: `/api/admin/users/${target.id}/role`,
        cookie: prod.sessionCookie,
        body: { role: "producer" },
      });
      assert.equal(r.status, 403);
    });
  });

  it("PATCH /api/admin/users/:id/role admin → 200 + role atualizado", async () => {
    const admin = await makeUser({ role: "admin" });
    const target = await makeUser({ role: "client" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<UserOk>(base, {
        method: "PATCH",
        path: `/api/admin/users/${target.id}/role`,
        cookie: admin.sessionCookie,
        body: { role: "producer" },
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.user.role, "producer");
    });
  });

  it("PATCH /api/admin/users/:id/role com role inválido → INVALID_ROLE 400", async () => {
    const admin = await makeUser({ role: "admin" });
    const target = await makeUser({ role: "client" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "PATCH",
        path: `/api/admin/users/${target.id}/role`,
        cookie: admin.sessionCookie,
        body: { role: "superuser" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_ROLE");
    });
  });

  it("PATCH /api/admin/users/:id/role user inexistente → USER_NOT_FOUND 404", async () => {
    const admin = await makeUser({ role: "admin" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "PATCH",
        path: `/api/admin/users/9999999/role`,
        cookie: admin.sessionCookie,
        body: { role: "producer" },
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "USER_NOT_FOUND");
    });
  });

  it("admin não pode rebaixar a si mesmo → CANNOT_DEMOTE_SELF 400", async () => {
    const admin = await makeUser({ role: "admin" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "PATCH",
        path: `/api/admin/users/${admin.id}/role`,
        cookie: admin.sessionCookie,
        body: { role: "client" },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "CANNOT_DEMOTE_SELF");
    });
  });

  it("admin promovendo a si mesmo pra admin (no-op) → 200", async () => {
    const admin = await makeUser({ role: "admin" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<UserOk>(base, {
        method: "PATCH",
        path: `/api/admin/users/${admin.id}/role`,
        cookie: admin.sessionCookie,
        body: { role: "admin" },
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.user.role, "admin");
    });
  });
});
