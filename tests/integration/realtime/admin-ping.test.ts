// Task #237 — Smoke endpoint admin-only do realtime (Task #230).
//
// `GET /api/admin/realtime/ping`:
//   • Sem auth                                  → 401
//   • Auth como producer (não admin)            → 403
//   • Auth como admin                           → 200 + schema estável
//
// Schema estável é importante porque ops consomem isso pra dashboards —
// chaves precisam existir mesmo quando SOCKET_IO_ENABLED=false (counts
// viram 0). Esse teste roda com SOCKET_IO_ENABLED não setado (default
// true) mas o `getIO()` retorna `null` em ambiente de teste (createApp
// não anexa o servidor HTTP) — exatamente o caminho que vira counts=0
// e enabled=false. Validamos as chaves, não os valores numéricos.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface ApiOk<T> { success: true; data: T; error: null }
interface PingPayload {
  ok: boolean;
  enabled: boolean;
  path: string;
  uptime_seconds: number;
  namespace_dm_sockets: number;
  namespace_community_sockets: number;
  namespaces: Record<string, number>;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Realtime / admin ping (Task #237)", () => {
  it("sem auth → 401", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/admin/realtime/ping" });
      assert.equal(r.status, 401);
    });
  });

  it("producer (role abaixo de admin) → 403", async () => {
    const producer = await makeUser({ role: "producer" });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        path: "/api/admin/realtime/ping",
        cookie: producer.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("moderator também recebe 403 (endpoint é admin-only)", async () => {
    const mod = await makeUser({ role: "moderator" });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, {
        path: "/api/admin/realtime/ping",
        cookie: mod.sessionCookie,
      });
      assert.equal(r.status, 403);
    });
  });

  it("admin → 200 + schema estável (chaves flat + namespaces map)", async () => {
    const admin = await makeUser({ role: "admin" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<PingPayload>>(base, {
        path: "/api/admin/realtime/ping",
        cookie: admin.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.success, true);
      const d = r.body.data;
      assert.equal(d.ok, true);
      assert.equal(typeof d.enabled, "boolean");
      assert.equal(typeof d.path, "string");
      assert.match(d.path, /\/$/, "path normalizado termina em /");
      assert.equal(typeof d.uptime_seconds, "number");
      assert.ok(d.uptime_seconds >= 0);
      assert.equal(typeof d.namespace_dm_sockets, "number");
      assert.equal(typeof d.namespace_community_sockets, "number");
      assert.ok(d.namespaces && typeof d.namespaces === "object");
      assert.equal(typeof d.namespaces["/dm"], "number");
      assert.equal(typeof d.namespaces["/community"], "number");
    });
  });
});
