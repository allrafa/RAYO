// Task #238 — Conversations (Direct Messaging v2).
//
// Cobre per-side state: criar conversa, ambos os lados verem na lista,
// archive idempotente, delete (que marca cleared_at + deleted_at e
// reabre só com mensagens novas), e o filtro `cleared_at` independente
// por lado quando o outro participante apaga.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateConversation,
  sendMessage,
  listConversations,
  setConversationArchived,
  deleteConversationForUser,
  getMessages,
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

describe("DM / Conversations (Task #238)", () => {
  it("getOrCreateConversation cria 1 conversa e é idempotente entre os lados", async () => {
    const a = await makeUser({ name: "Alice" });
    const b = await makeUser({ name: "Bob" });

    const c1 = await getOrCreateConversation(a.id, b.id);
    assert.equal(c1.created, true);
    assert.equal(c1.other_user_id, b.id);

    // Mesma chamada do mesmo lado: reusa
    const c2 = await getOrCreateConversation(a.id, b.id);
    assert.equal(c2.created, false);
    assert.equal(c2.id, c1.id);

    // Chamada do outro lado: ordem é normalizada (user_a_id < user_b_id),
    // então tem que cair na MESMA conversa.
    const c3 = await getOrCreateConversation(b.id, a.id);
    assert.equal(c3.created, false);
    assert.equal(c3.id, c1.id);
    assert.equal(c3.other_user_id, a.id);
  });

  it("rejeita self-DM e usuário inexistente", async () => {
    const a = await makeUser();
    await assert.rejects(
      () => getOrCreateConversation(a.id, a.id),
      (err: { code?: string }) => err.code === "INVALID_TARGET",
    );
    await assert.rejects(
      () => getOrCreateConversation(a.id, 999999),
      (err: { code?: string }) => err.code === "USER_NOT_FOUND",
    );
  });

  it("ambos os lados veem a conversa em listConversations após 1ª mensagem", async () => {
    const a = await makeUser({ name: "Alice" });
    const b = await makeUser({ name: "Bob" });
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, { kind: "text", content: "oi bob" });

    const listA = await listConversations(a.id);
    const listB = await listConversations(b.id);
    assert.equal(listA.length, 1);
    assert.equal(listB.length, 1);
    assert.equal(listA[0].id, conv.id);
    assert.equal(listB[0].id, conv.id);
    assert.equal(listA[0].other_user_name, "Bob", "lado de Alice mostra Bob");
    assert.equal(listB[0].other_user_name, "Alice", "lado de Bob mostra Alice");
    // unread: Bob não leu ainda → 1; Alice é a autora → 0.
    assert.equal(listA[0].unread_count, 0);
    assert.equal(listB[0].unread_count, 1);
  });

  it("archive é per-side: Alice arquiva, Bob continua vendo em active", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, { kind: "text", content: "x" });

    await setConversationArchived(conv.id, a.id, true);

    const activeA = await listConversations(a.id, "active");
    const archivedA = await listConversations(a.id, "archived");
    const activeB = await listConversations(b.id, "active");
    assert.equal(activeA.length, 0, "alice some das ativas");
    assert.equal(archivedA.length, 1, "alice tem na seção arquivada");
    assert.equal(activeB.length, 1, "bob não foi afetado");

    // Desarquivar = idempotente: archived_at = NULL
    await setConversationArchived(conv.id, a.id, false);
    const activeA2 = await listConversations(a.id, "active");
    assert.equal(activeA2.length, 1);
  });

  it("delete per-side: Alice some, histórico antigo invisível pra ela; Bob vê tudo; nova msg reabre p/ Alice só com o que vem depois", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, { kind: "text", content: "antiga 1" });
    await sendMessage(conv.id, b.id, { kind: "text", content: "antiga 2" });

    // Espera 1s pra garantir que cleared_at fique > created_at das antigas
    // (a granularidade de NOW() é microssegundo no PG; só por defesa).
    await new Promise((r) => setTimeout(r, 1100));
    await deleteConversationForUser(conv.id, a.id);

    // Alice: some das ativas (deleted_at != null)
    const listA = await listConversations(a.id);
    assert.equal(listA.length, 0, "conversa some da lista de Alice");

    // Bob: continua vendo histórico inteiro
    const listB = await listConversations(b.id);
    assert.equal(listB.length, 1);
    const msgsB = await getMessages(conv.id, b.id);
    assert.equal(msgsB.total, 2);

    // Bob manda nova mensagem → reabre p/ Alice; só essa nova é visível
    await sendMessage(conv.id, b.id, { kind: "text", content: "nova depois do clear" });
    const listA2 = await listConversations(a.id);
    assert.equal(listA2.length, 1, "conversa reabre p/ Alice");
    const msgsA = await getMessages(conv.id, a.id);
    assert.equal(msgsA.total, 1, "só a nova é visível p/ Alice (cleared_at corta)");
    assert.equal(msgsA.messages[0].content, "nova depois do clear");

    // Bob ainda vê as 3
    const msgsB2 = await getMessages(conv.id, b.id);
    assert.equal(msgsB2.total, 3, "cleared_at de Alice não afeta Bob");
  });
});
