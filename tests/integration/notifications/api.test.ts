// Task #237 — Notifications API.
//
// Cobre o ciclo completo: criar via service `createNotification`, listar
// e marcar como lida via HTTP, observar `unread` cair atomicamente.
// O fan-out via socket é best-effort (try/catch interno) — não testamos
// o emit aqui; o que importa é que o estado em PG fica consistente.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createNotification,
  getUnreadCount,
} from "../../../server/features/notifications/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface ApiOk<T> { success: true; data: T; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

interface NotifRow {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Notifications API (Task #237)", () => {
  it("createNotification persiste linha + getUnreadCount reflete", async () => {
    const u = await makeUser();
    const n = await createNotification({
      userId: u.id,
      kind: "post_moderated",
      title: "Seu post foi removido",
      body: "regra 3",
      link: "/c/teste",
      payload: { post_id: 1 },
    });
    assert.equal(n.kind, "post_moderated");
    assert.equal(n.read_at, null);
    assert.equal(await getUnreadCount(u.id), 1);
  });

  it("GET /api/notifications lista paginado completo com unread=total", async () => {
    const u = await makeUser();
    const n1 = await createNotification({ userId: u.id, kind: "class_post", title: "1" });
    const n2 = await createNotification({ userId: u.id, kind: "class_post", title: "2" });
    const n3 = await createNotification({ userId: u.id, kind: "class_post", title: "3" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<{
        notifications: NotifRow[];
        total: number;
        unread: number;
        page: number;
      }>>(base, { path: "/api/notifications", cookie: u.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.notifications.length, 3);
      // Ordenação é `created_at DESC`; em testes rápidos o timestamp pode
      // ser idêntico, então asseguramos presença (não ordem) — o que o
      // contrato realmente garante é "tudo do user, sem leak".
      const ids = r.body.data.notifications.map((n) => n.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [n1.id, n2.id, n3.id].sort((a, b) => a - b));
      assert.equal(r.body.data.total, 3);
      assert.equal(r.body.data.unread, 3);
    });
  });

  it("POST /api/notifications/:id/read zera o flag + unread cai", async () => {
    const u = await makeUser();
    const n = await createNotification({ userId: u.id, kind: "class_post", title: "x" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<{ marked: boolean }>>(base, {
        method: "POST",
        path: `/api/notifications/${n.id}/read`,
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.marked, true);

      const unread = await request<ApiOk<{ unread: number }>>(base, {
        path: "/api/notifications/unread-count",
        cookie: u.sessionCookie,
      });
      assert.equal(unread.body.data.unread, 0);
    });
  });

  it("marcar como lida 2x — segunda vez devolve marked=false (idempotente)", async () => {
    const u = await makeUser();
    const n = await createNotification({ userId: u.id, kind: "class_post", title: "x" });
    await withServer(createTestApp(), async (base) => {
      await request(base, {
        method: "POST",
        path: `/api/notifications/${n.id}/read`,
        cookie: u.sessionCookie,
      });
      const r2 = await request<ApiOk<{ marked: boolean }>>(base, {
        method: "POST",
        path: `/api/notifications/${n.id}/read`,
        cookie: u.sessionCookie,
      });
      assert.equal(r2.body.data.marked, false, "já lida — não remarca");
    });
  });

  it("usuário não pode ler notificação de outro (rowCount=0 → marked=false)", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const n = await createNotification({ userId: owner.id, kind: "class_post", title: "x" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<{ marked: boolean }>>(base, {
        method: "POST",
        path: `/api/notifications/${n.id}/read`,
        cookie: intruder.sessionCookie,
      });
      // Endpoint não devolve 403 — o UPDATE filtra por user_id e simplesmente
      // não afeta nada (defesa em profundidade equivalente à 404). Garantimos
      // que o read_at do owner continua null.
      assert.equal(r.body.data.marked, false);
      assert.equal(await getUnreadCount(owner.id), 1, "owner segue com unread");
    });
  });

  it("POST /api/notifications/read-all marca todas e zera o contador", async () => {
    const u = await makeUser();
    await createNotification({ userId: u.id, kind: "class_post", title: "1" });
    await createNotification({ userId: u.id, kind: "class_post", title: "2" });
    await createNotification({ userId: u.id, kind: "class_post", title: "3" });
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<{ marked: number }>>(base, {
        method: "POST",
        path: "/api/notifications/read-all",
        cookie: u.sessionCookie,
      });
      assert.equal(r.body.data.marked, 3);
      assert.equal(await getUnreadCount(u.id), 0);
    });
  });

  it("GET /api/notifications sem auth → 401", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, { path: "/api/notifications" });
      assert.equal(r.status, 401);
    });
  });

  it("GET /api/notifications/unread-by-section devolve {messages, community}", async () => {
    const u = await makeUser();
    await createNotification({ userId: u.id, kind: "class_post", title: "comunidade" });
    await createNotification({ userId: u.id, kind: "post_moderated", title: "moderado" });
    // kind fora da lista community não conta
    await createNotification({ userId: u.id, kind: "other_kind", title: "outro" });

    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiOk<{ messages: number; community: number }>>(base, {
        path: "/api/notifications/unread-by-section",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.community, 2, "só class_post + post_moderated");
      assert.equal(r.body.data.messages, 0, "sem mensagens criadas");
    });
  });

  it("POST /api/notifications/:id/read com ID inválido → 400", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: "/api/notifications/0/read",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_ID");
    });
  });
});
