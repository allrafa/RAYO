// Task #238 — Messages CRUD + paginação + read receipts + reactions.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markConversationRead,
  getUnreadConversationCount,
  toggleMessageReaction,
  removeMessageReaction,
} from "../../../server/features/messages/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("DM / Messages (Task #238)", () => {
  it("send text + getMessages ordena ASC e devolve sender_name resolvido", async () => {
    const a = await makeUser({ name: "Alice" });
    const b = await makeUser({ name: "Bob" });
    const conv = await getOrCreateConversation(a.id, b.id);

    const m1 = await sendMessage(conv.id, a.id, { kind: "text", content: "primeira" });
    const m2 = await sendMessage(conv.id, b.id, { kind: "text", content: "segunda" });
    assert.equal(m1.kind, "text");
    assert.equal(m1.sender_name, "Alice");
    assert.equal(m2.sender_name, "Bob");

    const page = await getMessages(conv.id, a.id, 1, 50);
    assert.equal(page.total, 2);
    assert.deepEqual(page.messages.map((m) => m.content), ["primeira", "segunda"]);
  });

  it("EMPTY_MESSAGE e MESSAGE_TOO_LONG", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await assert.rejects(
      () => sendMessage(conv.id, a.id, { kind: "text", content: "   " }),
      (err: { code?: string }) => err.code === "EMPTY_MESSAGE",
    );
    await assert.rejects(
      () => sendMessage(conv.id, a.id, { kind: "text", content: "x".repeat(4001) }),
      (err: { code?: string }) => err.code === "MESSAGE_TOO_LONG",
    );
  });

  it("FORBIDDEN se userId não é membro da conversa", async () => {
    const a = await makeUser(); const b = await makeUser(); const intruder = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await assert.rejects(
      () => sendMessage(conv.id, intruder.id, { kind: "text", content: "hack" }),
      (err: { code?: string }) => err.code === "FORBIDDEN",
    );
    await assert.rejects(
      () => getMessages(conv.id, intruder.id),
      (err: { code?: string }) => err.code === "FORBIDDEN",
    );
  });

  it("paginação: limit=2 page=1 → últimas 2 em ASC; page=2 → as 2 anteriores", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    for (let i = 0; i < 4; i++) {
      await sendMessage(conv.id, a.id, { kind: "text", content: `m${i}` });
    }
    const p1 = await getMessages(conv.id, a.id, 1, 2);
    assert.equal(p1.total, 4);
    assert.equal(p1.totalPages, 2);
    // getMessages faz DESC + reverse → page 1 traz as 2 últimas em ASC
    assert.deepEqual(p1.messages.map((m) => m.content), ["m2", "m3"]);
    const p2 = await getMessages(conv.id, a.id, 2, 2);
    assert.deepEqual(p2.messages.map((m) => m.content), ["m0", "m1"]);
  });

  it("markConversationRead é idempotente e só marca msgs do OUTRO", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, { kind: "text", content: "1" });
    await sendMessage(conv.id, a.id, { kind: "text", content: "2" });

    assert.equal(await getUnreadConversationCount(b.id), 1, "1 conversa com unread");

    const r1 = await markConversationRead(conv.id, b.id);
    assert.equal(r1.marked, 2, "marca as 2 da contraparte");

    // 2ª chamada não muda nada (idempotente)
    const r2 = await markConversationRead(conv.id, b.id);
    assert.equal(r2.marked, 0);

    assert.equal(await getUnreadConversationCount(b.id), 0);

    // Alice marcando seu próprio lado: zero (sender_id <> userId)
    const r3 = await markConversationRead(conv.id, a.id);
    assert.equal(r3.marked, 0);

    // Confirma read_at != null nas mensagens
    const page = await getMessages(conv.id, b.id);
    assert.ok(page.messages.every((m) => m.read_at !== null));
  });

  it("reactions: toggle insert/swap/remove + set fechado + DM reaction validation", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    const msg = await sendMessage(conv.id, a.id, { kind: "text", content: "olha isso" });

    // Bob reage com ❤️
    const r1 = await toggleMessageReaction(msg.id, b.id, "❤️");
    assert.equal(r1.user_reaction, "❤️");
    assert.deepEqual(r1.reactions, [{ emoji: "❤️", count: 1 }]);

    // Bob troca pra 🔥
    const r2 = await toggleMessageReaction(msg.id, b.id, "🔥");
    assert.equal(r2.user_reaction, "🔥");
    assert.deepEqual(r2.reactions, [{ emoji: "🔥", count: 1 }]);

    // Bob reage de novo com 🔥 → remove (toggle off)
    const r3 = await toggleMessageReaction(msg.id, b.id, "🔥");
    assert.equal(r3.user_reaction, null);
    assert.deepEqual(r3.reactions, []);

    // Set fechado: emoji fora da lista vira 400
    await assert.rejects(
      () => toggleMessageReaction(msg.id, b.id, "💀"),
      (err: { code?: string }) => err.code === "INVALID_REACTION_EMOJI",
    );

    // removeMessageReaction é idempotente — chamar sem nada existir não quebra
    const r4 = await removeMessageReaction(msg.id, b.id);
    assert.equal(r4.user_reaction, null);
    assert.deepEqual(r4.reactions, []);

    // FORBIDDEN se quem reage não é membro
    const intruder = await makeUser();
    await assert.rejects(
      () => toggleMessageReaction(msg.id, intruder.id, "❤️"),
      (err: { code?: string }) => err.code === "FORBIDDEN",
    );
  });
});
