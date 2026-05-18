// Task #238 — Gate de e-mail offline em notifyRecipient (sendMessage).
//
// Cada branch loga uma linha estruturada `dm_email_gate ... decision=...
// reason=...` via `logger.info` (que escreve em console.log). Aqui
// intercepta `console.log` pra capturar essas linhas e asserta cada
// caminho:
//   • online              → skip reason=online
//   • offline, idle < 10m → skip reason=below_threshold
//   • offline, idle ≥ 10m → send  (cria row em dm_email_sent)
//   • 2ª msg dentro do cooldown de 60m → skip reason=cooldown
//
// notifyRecipient é fire-and-forget (`void ... .catch()`), então
// `waitForLogMatch` poll-and-retries até timeout.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import {
  getOrCreateConversation,
  sendMessage,
} from "../../../server/features/messages/service.js";
import { initRealtime, SOCKET_IO_PATH } from "../../../server/realtime/io.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

// ────────────────────── Console capture ──────────────────────
function captureConsole() {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  return {
    lines,
    restore: () => { console.log = original; },
    async waitFor(pattern: RegExp, timeoutMs = 2000): Promise<string> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const hit = lines.find((l) => pattern.test(l));
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(`waitFor timeout: ${pattern} not found in ${lines.length} lines\n` + lines.join("\n"));
    },
  };
}

// Helper: força "offline há N minutos" via UPDATE direto.
async function setLastActive(userId: number, minutesAgo: number): Promise<void> {
  await getPool().query(
    `UPDATE users SET last_active_at = NOW() - ($2 || ' minutes')::interval WHERE id = $1`,
    [userId, String(minutesAgo)],
  );
}

describe("DM / Email gate (Task #238)", () => {
  it("offline, idle < 10min → skip reason=below_threshold", async () => {
    const cap = captureConsole();
    try {
      const a = await makeUser(); const b = await makeUser();
      await setLastActive(b.id, 5);
      const conv = await getOrCreateConversation(a.id, b.id);
      await sendMessage(conv.id, a.id, { kind: "text", content: "oi" });

      const line = await cap.waitFor(/dm_email_gate.*decision=skip.*reason=below_threshold/);
      assert.match(line, new RegExp(`user_id=${b.id}`));
      assert.match(line, new RegExp(`conversation_id=${conv.id}`));
      assert.match(line, /online=false/);

      // nada inserido em dm_email_sent
      const { rows } = await getPool().query(`SELECT 1 FROM dm_email_sent`);
      assert.equal(rows.length, 0);
    } finally {
      cap.restore();
    }
  });

  it("offline, idle ≥ 10min → decision=send + row em dm_email_sent", async () => {
    const cap = captureConsole();
    try {
      const a = await makeUser(); const b = await makeUser();
      await setLastActive(b.id, 15);
      const conv = await getOrCreateConversation(a.id, b.id);
      await sendMessage(conv.id, a.id, { kind: "text", content: "vai por email" });

      const line = await cap.waitFor(/dm_email_gate.*decision=send/);
      assert.match(line, new RegExp(`user_id=${b.id}`));
      assert.match(line, /online=false/);
      assert.doesNotMatch(line, /reason=/, "decision=send não tem reason no contrato");

      const { rows } = await getPool().query(
        `SELECT recipient_id FROM dm_email_sent WHERE conversation_id = $1`,
        [conv.id],
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].recipient_id, b.id);
    } finally {
      cap.restore();
    }
  });

  it("2ª msg dentro do cooldown de 60min → skip reason=cooldown", async () => {
    const cap = captureConsole();
    try {
      const a = await makeUser(); const b = await makeUser();
      await setLastActive(b.id, 15);
      const conv = await getOrCreateConversation(a.id, b.id);

      // 1ª — manda e-mail (decision=send)
      await sendMessage(conv.id, a.id, { kind: "text", content: "1" });
      await cap.waitFor(/dm_email_gate.*decision=send/);

      // 2ª na sequência — cooldown bate
      await sendMessage(conv.id, a.id, { kind: "text", content: "2" });
      const line = await cap.waitFor(/dm_email_gate.*decision=skip.*reason=cooldown/);
      assert.match(line, new RegExp(`conversation_id=${conv.id}`));

      // Só 1 row em dm_email_sent (PK = conversation_id)
      const { rows } = await getPool().query(`SELECT COUNT(*)::int AS c FROM dm_email_sent`);
      assert.equal(rows[0].c, 1);
    } finally {
      cap.restore();
    }
  });

  it("recipient online (socket conectado) → skip reason=online", async () => {
    // Spin up real Socket.IO + 1 client conectado como Bob.
    // Como isUserOnline lê `dmNs.adapter.rooms.get('user:<id>').size`,
    // basta ter 1 socket dele autenticado.
    const httpServer = http.createServer();
    const realtimeIo = initRealtime(httpServer);
    if (!realtimeIo) {
      // SOCKET_IO_ENABLED=false no env → pula sem falhar (kill-switch absoluto)
      return;
    }
    await new Promise<void>((r) => httpServer.listen(0, r));
    const port = (httpServer.address() as { port: number }).port;

    const a = await makeUser(); const b = await makeUser();
    const conv = await getOrCreateConversation(a.id, b.id);

    const client: ClientSocket = ioClient(`http://127.0.0.1:${port}/dm`, {
      path: SOCKET_IO_PATH,
      transports: ["websocket"],
      extraHeaders: { Cookie: b.sessionCookie },
      reconnection: false,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("connect timeout")), 3000);
        client.once("connect", () => { clearTimeout(t); resolve(); });
        client.once("connect_error", (err) => { clearTimeout(t); reject(err); });
      });

      const cap = captureConsole();
      try {
        await sendMessage(conv.id, a.id, { kind: "text", content: "estou online" });
        const line = await cap.waitFor(/dm_email_gate.*decision=skip.*reason=online/);
        assert.match(line, new RegExp(`user_id=${b.id}`));
        assert.match(line, /online=true/);
      } finally {
        cap.restore();
      }
    } finally {
      client.disconnect();
      await new Promise<void>((r) => httpServer.close(() => r()));
      // limpa singleton do io.ts pra próximas specs não usarem este server
      const ioMod = await import("../../../server/realtime/io.js");
      (ioMod as { __resetForTest?: () => void }).__resetForTest?.();
    }
  });
});
