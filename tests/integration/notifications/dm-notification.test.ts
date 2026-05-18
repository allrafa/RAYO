// Task #237 — Integração DM → Notification.
//
// Quando o usuário A manda mensagem pro B numa conversa, o service
// `sendMessage` chama `notifyRecipient` que cria uma notification de
// kind "message" pro B. Importante: A (sender) NÃO recebe notification.
// Esse teste cobre a integração que `notifications/api.test.ts` deixou
// de fora ao chamar `createNotification` direto.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateConversation,
  sendMessage,
} from "../../../server/features/messages/service.js";
import {
  listNotifications,
  getUnreadCount,
} from "../../../server/features/notifications/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("DM → Notification integration (Task #237)", () => {
  it("sendMessage cria notification kind='message' pro destinatário (e nada pro sender)", async () => {
    const alice = await makeUser({ name: "Alice" });
    const bob = await makeUser({ name: "Bob" });
    const conv = await getOrCreateConversation(alice.id, bob.id);

    const msg = await sendMessage(conv.id, alice.id, {
      kind: "text",
      content: "oi bob",
    });
    assert.equal(msg.content, "oi bob");

    // notifyRecipient roda via `void ... .catch()` em paralelo — aguarda
    // o microtask flush + alguns ticks pra a INSERT no PG terminar.
    await new Promise((r) => setTimeout(r, 200));

    const bobNotifs = await listNotifications(bob.id, 1, 20);
    assert.equal(bobNotifs.total, 1, "bob recebe exatamente 1 notification");
    const n = bobNotifs.notifications[0];
    assert.equal(n.kind, "message");
    assert.match(n.title, /Alice/, "título cita o sender");
    assert.equal(n.body, "oi bob", "body é o preview");
    assert.equal(n.link, `/conversas/${conv.id}`);
    assert.equal(n.read_at, null, "nova → não-lida");

    // Unread by section reflete: bob tem 1 não-lida.
    assert.equal(await getUnreadCount(bob.id), 1);

    // Sender NÃO recebe notification do próprio envio.
    const aliceNotifs = await listNotifications(alice.id, 1, 20);
    assert.equal(aliceNotifs.total, 0, "sender não recebe notif do próprio envio");
  });

  it("DM de imagem gera notification com preview '📷 Foto'", async () => {
    const alice = await makeUser({ name: "Alice" });
    const bob = await makeUser({ name: "Bob" });
    const conv = await getOrCreateConversation(alice.id, bob.id);

    await sendMessage(conv.id, alice.id, {
      kind: "image",
      content: "",
      attachmentUrl: "objstore://messages/image/test.jpg",
      attachmentMeta: { mime: "image/jpeg" },
    });
    await new Promise((r) => setTimeout(r, 200));

    const notifs = await listNotifications(bob.id, 1, 20);
    assert.equal(notifs.total, 1);
    assert.equal(notifs.notifications[0].body, "📷 Foto",
      "anexo image vira preview iconado, não vaza URL");
  });

  it("múltiplas DMs acumulam notifications (1 por mensagem)", async () => {
    const alice = await makeUser({ name: "Alice" });
    const bob = await makeUser({ name: "Bob" });
    const conv = await getOrCreateConversation(alice.id, bob.id);

    await sendMessage(conv.id, alice.id, { kind: "text", content: "1" });
    await sendMessage(conv.id, alice.id, { kind: "text", content: "2" });
    await sendMessage(conv.id, alice.id, { kind: "text", content: "3" });
    await new Promise((r) => setTimeout(r, 300));

    assert.equal(await getUnreadCount(bob.id), 3);
    const notifs = await listNotifications(bob.id, 1, 20);
    assert.equal(notifs.total, 3);
    assert.ok(notifs.notifications.every((n) => n.kind === "message"));
  });
});
