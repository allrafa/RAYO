// Task #238 — Anexos (imagem + áudio) via `sendMessage` no service.
//
// Não exercitamos o multer/upload aqui (depende de Object Storage real e
// `optimizeCmsImage` com sharp); foco está nas validações server-side
// que ficam DEPOIS do upload — prefixo obrigatório `objstore://messages/`,
// allowlist de mimes, preview correto em listConversations.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateConversation,
  sendMessage,
  listConversations,
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

describe("DM / Attachments (Task #238)", () => {
  it("anexa imagem (objstore + mime válido) e expõe meta no GET", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    const msg = await sendMessage(conv.id, a.id, {
      kind: "image",
      content: "",
      attachmentUrl: "objstore://messages/image/photo.jpg",
      attachmentMeta: { mime: "image/jpeg", size: 1234, name: "photo.jpg" },
    });
    assert.equal(msg.kind, "image");
    assert.equal(msg.content, "");
    assert.equal(msg.attachment_meta?.mime, "image/jpeg");

    const page = await getMessages(conv.id, b.id);
    assert.equal(page.messages[0].kind, "image");
    assert.equal(page.messages[0].attachment_meta?.mime, "image/jpeg");
  });

  it("anexa áudio com duração e preview na lista vira `🎤 Áudio (m:ss)`", async () => {
    const a = await makeUser({ name: "Alice" }); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    await sendMessage(conv.id, a.id, {
      kind: "audio",
      content: "",
      attachmentUrl: "objstore://messages/audio/clip.webm",
      attachmentMeta: { mime: "audio/webm", size: 2048, duration_sec: 7, name: "clip.webm" },
    });
    const listB = await listConversations(b.id);
    assert.equal(listB.length, 1);
    assert.equal(listB[0].last_message_kind, "audio");
    // duration_sec viaja em last_message_meta — UI formata como `🎤 Áudio (0:07)`.
    assert.equal((listB[0].last_message_meta as Record<string, unknown> | null)?.duration_sec, 7);
  });

  it("INVALID_ATTACHMENT_URL: URL externa ou namespace errado", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await assert.rejects(
      () => sendMessage(conv.id, a.id, {
        kind: "image",
        attachmentUrl: "https://evil.test/x.jpg",
        attachmentMeta: { mime: "image/jpeg" },
      }),
      (err: { code?: string }) => err.code === "INVALID_ATTACHMENT_URL",
    );
    // Chave de outro namespace (CMS) também bloqueada
    await assert.rejects(
      () => sendMessage(conv.id, a.id, {
        kind: "image",
        attachmentUrl: "objstore://cms/photo.jpg",
        attachmentMeta: { mime: "image/jpeg" },
      }),
      (err: { code?: string }) => err.code === "INVALID_ATTACHMENT_URL",
    );
  });

  it("ATTACHMENT_REQUIRED + ATTACHMENT_META_REQUIRED + MIME_MISMATCH", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    await assert.rejects(
      () => sendMessage(conv.id, a.id, { kind: "image", attachmentUrl: null }),
      (err: { code?: string }) => err.code === "ATTACHMENT_REQUIRED",
    );
    await assert.rejects(
      () => sendMessage(conv.id, a.id, {
        kind: "image",
        attachmentUrl: "objstore://messages/image/x.jpg",
        attachmentMeta: null,
      }),
      (err: { code?: string }) => err.code === "ATTACHMENT_META_REQUIRED",
    );
    // image kind + audio mime → mismatch
    await assert.rejects(
      () => sendMessage(conv.id, a.id, {
        kind: "image",
        attachmentUrl: "objstore://messages/image/x.jpg",
        attachmentMeta: { mime: "audio/webm" },
      }),
      (err: { code?: string }) => err.code === "ATTACHMENT_MIME_MISMATCH",
    );
    // audio kind + image mime → mismatch
    await assert.rejects(
      () => sendMessage(conv.id, a.id, {
        kind: "audio",
        attachmentUrl: "objstore://messages/audio/x.webm",
        attachmentMeta: { mime: "image/jpeg" },
      }),
      (err: { code?: string }) => err.code === "ATTACHMENT_MIME_MISMATCH",
    );
  });

  it("preview de imagem na lista vira `📷 Foto` em notificações (via last_message_kind)", async () => {
    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);
    await sendMessage(conv.id, a.id, {
      kind: "image",
      content: "",
      attachmentUrl: "objstore://messages/image/p.png",
      attachmentMeta: { mime: "image/png" },
    });
    const listB = await listConversations(b.id);
    assert.equal(listB[0].last_message_kind, "image");
    // UI usa last_message_kind p/ renderizar ícone; backend só guarda meta.
    assert.equal(listB[0].last_message_content, "");
  });
});
