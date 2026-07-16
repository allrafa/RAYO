// DIFERENCIAL_PLAN.md D2 — Pedidos de oração & testemunhos do casal.
//
// Cobre: 401/NOT_PAIRED; criar (validação, notificação ao cônjuge,
// visível pros dois); responder ("Deus respondeu") vira testemunho com
// notificação e é idempotente; remover; teto de 20 abertos; unpair
// apaga em cascata.
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

interface InviteOk { success: true; data: { code: string }; error: null }
interface Req {
  id: number; text: string; status: string; createdByMe: boolean;
  answer_note: string | null;
}
interface ListOk { success: true; data: { open: Req[]; answered: Req[] }; error: null }
interface CreateOk { success: true; data: { request: Req }; error: null }
interface ApiErr { success: false; data: null; error: { code: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function pairUp(base: string, a: { sessionCookie: string }, b: { sessionCookie: string }) {
  const inv = await request<InviteOk>(base, {
    method: "POST", path: "/api/alianca/invite", cookie: a.sessionCookie, body: {},
  });
  const acc = await request(base, {
    method: "POST", path: "/api/alianca/accept", cookie: b.sessionCookie,
    body: { code: inv.body.data.code },
  });
  assert.equal(acc.status, 200);
}

describe("Aliança / Pedidos & testemunhos (DIFERENCIAL D2)", () => {
  it("401 sem cookie; 409 sem aliança (list/create)", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      assert.equal((await request(base, { path: "/api/alianca/pedidos" })).status, 401);
      const list = await request<ApiErr>(base, { path: "/api/alianca/pedidos", cookie: u.sessionCookie });
      assert.equal(list.status, 409);
      const create = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/pedidos", cookie: u.sessionCookie,
        body: { text: "Pela nossa casa" },
      });
      assert.equal(create.status, 409);
    });
  });

  it("criar: validação de texto, cônjuge vê e é notificado", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);

      const invalid = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/pedidos", cookie: ana.sessionCookie,
        body: { text: "ab" },
      });
      assert.equal(invalid.status, 400);

      const ok = await request<CreateOk>(base, {
        method: "POST", path: "/api/alianca/pedidos", cookie: ana.sessionCookie,
        body: { text: "Pela saúde da nossa família" },
      });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.request.status, "open");
      assert.equal(ok.body.data.request.createdByMe, true);

      // Beto vê o pedido (createdByMe false) e foi notificado.
      const listB = await request<ListOk>(base, { path: "/api/alianca/pedidos", cookie: beto.sessionCookie });
      assert.equal(listB.body.data.open.length, 1);
      assert.equal(listB.body.data.open[0].createdByMe, false);
      const { rows: notifs } = await getPool().query(
        `SELECT user_id FROM notifications WHERE kind = 'couple_prayer_request'`,
      );
      assert.deepEqual(notifs.map((n) => n.user_id), [beto.id]);
    });
  });

  it("responder vira testemunho (notifica, idempotente); remover apaga", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      const created = await request<CreateOk>(base, {
        method: "POST", path: "/api/alianca/pedidos", cookie: ana.sessionCookie,
        body: { text: "Pelo emprego novo do Beto" },
      });
      const id = created.body.data.request.id;

      // Beto marca como respondido com nota.
      const answered = await request<{ success: true; data: { answered: boolean; alreadyAnswered: boolean }; error: null }>(base, {
        method: "POST", path: `/api/alianca/pedidos/${id}/responder`, cookie: beto.sessionCookie,
        body: { note: "Contratado esta semana!" },
      });
      assert.equal(answered.status, 200);
      assert.equal(answered.body.data.alreadyAnswered, false);

      // Idempotente.
      const again = await request<{ success: true; data: { alreadyAnswered: boolean }; error: null }>(base, {
        method: "POST", path: `/api/alianca/pedidos/${id}/responder`, cookie: ana.sessionCookie,
        body: {},
      });
      assert.equal(again.body.data.alreadyAnswered, true);

      // Ana (a criadora) foi notificada do testemunho.
      const { rows: notifs } = await getPool().query(
        `SELECT user_id, title FROM notifications WHERE kind = 'couple_testimony'`,
      );
      assert.deepEqual(notifs.map((n) => n.user_id), [ana.id]);
      assert.match(notifs[0].title, /Deus respondeu/);

      // Lista: 0 abertos, 1 testemunho com a nota.
      const list = await request<ListOk>(base, { path: "/api/alianca/pedidos", cookie: ana.sessionCookie });
      assert.equal(list.body.data.open.length, 0);
      assert.equal(list.body.data.answered.length, 1);
      assert.equal(list.body.data.answered[0].answer_note, "Contratado esta semana!");

      // Pedido inexistente → 404. Remover o testemunho → some.
      const missing = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/pedidos/99999/responder", cookie: ana.sessionCookie, body: {},
      });
      assert.equal(missing.status, 404);
      await request(base, {
        method: "DELETE", path: `/api/alianca/pedidos/${id}`, cookie: beto.sessionCookie,
      });
      const after = await request<ListOk>(base, { path: "/api/alianca/pedidos", cookie: ana.sessionCookie });
      assert.equal(after.body.data.answered.length, 0);
    });
  });

  it("teto de 20 pedidos abertos; unpair apaga tudo em cascata", async () => {
    const ana = await makeUser();
    const beto = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await pairUp(base, ana, beto);
      const { rows: couple } = await getPool().query<{ id: number }>(
        `SELECT id FROM couples LIMIT 1`,
      );
      // Semeia 20 direto no banco (mais rápido que 20 requests).
      await getPool().query(
        `INSERT INTO couple_prayer_requests (couple_id, created_by, text)
         SELECT $1, $2, 'Pedido ' || g FROM generate_series(1, 20) g`,
        [couple[0].id, ana.id],
      );
      const overflow = await request<ApiErr>(base, {
        method: "POST", path: "/api/alianca/pedidos", cookie: ana.sessionCookie,
        body: { text: "O vigésimo primeiro" },
      });
      assert.equal(overflow.status, 409);
      assert.equal(overflow.body.error.code, "LIMIT_REACHED");

      await request(base, { method: "DELETE", path: "/api/alianca", cookie: ana.sessionCookie });
      const { rows: left } = await getPool().query(
        `SELECT COUNT(*)::int AS n FROM couple_prayer_requests`,
      );
      assert.equal(left[0].n, 0, "pedidos caem em cascata com o casal");
    });
  });
});
