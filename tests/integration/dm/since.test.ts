// Task #238 — Gap-fill HTTP `/api/messages/conversations/:id/since?cursor=`.
//
// Cliente passa o maior message.id que tem em cache; servidor devolve
// tudo com id > cursor em ordem ASC, respeitando `cleared_at` do
// solicitante (mensagens anteriores ao corte ficam invisíveis pra ele
// mesmo que sejam > cursor).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateConversation,
  sendMessage,
  deleteConversationForUser,
} from "../../../server/features/messages/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface ApiOk<T> { success: true; data: T; error: null }
interface SincePayload {
  messages: Array<{ id: number; content: string }>;
  last_event_id: number;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("DM / /since gap-fill (Task #238)", () => {
  it("retorna mensagens com id > cursor em ordem ASC + last_event_id", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    const m1 = await sendMessage(conv.id, a.id, { kind: "text", content: "1" });
    const m2 = await sendMessage(conv.id, a.id, { kind: "text", content: "2" });
    const m3 = await sendMessage(conv.id, a.id, { kind: "text", content: "3" });

    await withServer(createTestApp(), async (base) => {
      const res = await request<ApiOk<SincePayload>>(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=${m1.id}`,
        cookie: b.sessionCookie,
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.messages.map((m) => m.content), ["2", "3"]);
      assert.equal(res.body.data.last_event_id, m3.id);
      assert.ok(res.body.data.messages[0].id > m1.id);
    });
  });

  it("cursor=0 (cliente vazio) retorna tudo da conversa", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, { kind: "text", content: "a" });
    await sendMessage(conv.id, a.id, { kind: "text", content: "b" });

    await withServer(createTestApp(), async (base) => {
      const res = await request<ApiOk<SincePayload>>(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=0`,
        cookie: b.sessionCookie,
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.messages.length, 2);
    });
  });

  it("respeita cleared_at do solicitante: msgs antigas não aparecem mesmo > cursor", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    const old1 = await sendMessage(conv.id, a.id, { kind: "text", content: "antiga 1" });
    await sendMessage(conv.id, a.id, { kind: "text", content: "antiga 2" });

    await new Promise((r) => setTimeout(r, 1100));
    await deleteConversationForUser(conv.id, b.id); // marca cleared_at = NOW() p/ Bob
    await new Promise((r) => setTimeout(r, 50));

    const newMsg = await sendMessage(conv.id, a.id, { kind: "text", content: "nova" });

    await withServer(createTestApp(), async (base) => {
      // Bob pede tudo desde 0 — só vê "nova" (cleared_at corta o histórico)
      const resB = await request<ApiOk<SincePayload>>(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=0`,
        cookie: b.sessionCookie,
      });
      assert.equal(resB.status, 200);
      assert.deepEqual(resB.body.data.messages.map((m) => m.content), ["nova"]);
      assert.equal(resB.body.data.messages[0].id, newMsg.id);

      // Alice (sem cleared_at) vê tudo a partir do cursor
      const resA = await request<ApiOk<SincePayload>>(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=${old1.id}`,
        cookie: a.sessionCookie,
      });
      assert.equal(resA.body.data.messages.length, 2, "alice vê antiga 2 + nova");
    });
  });

  it("INVALID_CURSOR pra cursor negativo / não-numérico", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    await withServer(createTestApp(), async (base) => {
      const r1 = await request(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=-1`,
        cookie: a.sessionCookie,
      });
      assert.equal(r1.status, 400);
      assert.equal((r1.body as { error: { code: string } }).error.code, "INVALID_CURSOR");

      const r2 = await request(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=abc`,
        cookie: a.sessionCookie,
      });
      assert.equal(r2.status, 400);
      assert.equal((r2.body as { error: { code: string } }).error.code, "INVALID_CURSOR");
    });
  });

  it("401 sem cookie / 403 se não-membro / 404 conversa inexistente", async () => {
    const a = await makeUser(); const b = await makeUser(); const intruder = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    await withServer(createTestApp(), async (base) => {
      const r401 = await request(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=0`,
      });
      assert.equal(r401.status, 401);

      const r403 = await request(base, {
        path: `/api/messages/conversations/${conv.id}/since?cursor=0`,
        cookie: intruder.sessionCookie,
      });
      assert.equal(r403.status, 403);

      const r404 = await request(base, {
        path: `/api/messages/conversations/999999/since?cursor=0`,
        cookie: a.sessionCookie,
      });
      assert.equal(r404.status, 404);
    });
  });
});
