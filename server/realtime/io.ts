// Socket.IO realtime — DM transport (Task #222).
//
// Modelo:
//  • Namespace dedicado `/dm` (deixa o `/` default livre pra futuras
//    features sem colidir com este contrato).
//  • Auth via cookie httpOnly `session_token` no handshake — mesma
//    sessão da API REST.
//  • Salas:
//     - `user:<id>`  → eventos user-scoped (unread:changed, notif).
//     - `conversation:<id>` → eventos conversation-scoped (message:new,
//       message:read, message:reaction, message:typing, listening,
//       conversation:updated). Todos os participantes ativos da
//       conversa entram automaticamente ao conectar.
//  • Reconexão: ao (re)conectar, o servidor manda `conversation:sync`
//    por conversa, com `last_event_id` (id da última mensagem visível
//    pro lado dele). O cliente compara com seu cursor local e, se
//    perdeu evento, puxa o gap via `GET /api/messages/conversations/
//    :id/since?cursor=<id>` (idempotente, dedupa por message.id).
//  • Eventos cliente→servidor:
//     - `message:typing`    → fan-out pra sala da conversa.
//     - `message:read`      → marca lido + fan-out `message:read`.
//     - `dm:listening`      → recibo de "ouvindo áudio" (legacy nome).
//     - `conversation:join` → cliente acabou de criar/entrar numa nova
//       conversa e pede pro socket entrar na sala dela.
//
// Kill-switches:
//  • `SOCKET_IO_ENABLED=false` desliga o Socket.IO inteiro.
//  • `DM_REALTIME=sse`         mantém o servidor com dual-write, mas
//    o cliente vai ignorar o Socket.IO. Server expõe a flag em
//    `GET /api/auth/me` pra o cliente saber qual transporte ouvir.

import type { Server as HttpServer } from "node:http";
import type { Namespace, Socket } from "socket.io";
import { Server as IOServer } from "socket.io";
import cookie from "cookie";
import { validateSession } from "../features/auth/service.js";
import { logger } from "../utils/logger.js";

type AuthedSocket = Socket & { data: { userId: number; conversationIds: Set<number> } };

let io: IOServer | null = null;
let dmNs: Namespace | null = null;

const ENABLED = (process.env.SOCKET_IO_ENABLED ?? "true").toLowerCase() !== "false";

// Flag de transporte do cliente. Server faz dual-write sempre; isto
// só diz pro cliente "ouça SSE" ou "ouça Socket.IO".
const DM_TRANSPORT: "socket" | "sse" = (() => {
  const v = (process.env.DM_REALTIME ?? "").toLowerCase();
  if (v === "sse") return "sse";
  if (v === "socket") return "socket";
  // Default: socket em dev, sse em prod (até estabilizar).
  return process.env.NODE_ENV === "production" ? "sse" : "socket";
})();

export function isSocketEnabled(): boolean {
  return ENABLED && io !== null;
}

export function getDmTransport(): "socket" | "sse" {
  return DM_TRANSPORT;
}

export function getIO(): IOServer | null {
  return io;
}

// Helper: fan-out pra todas as conexões de um user (todas as abas).
export function emitToUser(userId: number, event: string, payload: unknown): void {
  if (!dmNs) return;
  dmNs.to(`user:${userId}`).emit(event, payload);
}

// Helper: fan-out pra todos os participantes ativos de uma conversa
// via sala `conversation:<id>`. Usado SÓ pra eventos transientes
// (typing/listening) onde perder um evento ocasional é aceitável.
//
// Pra eventos críticos (message:new/read/reaction) use
// `publishToConversation` em events.ts — emite via `user:<id>`,
// imune a salas frias em conversas recém-criadas.
//
// Sender recebe de volta também — cliente filtra por `user_id` quando
// faz sentido (ex: typing do próprio user vira no-op).
export function emitToConversation(conversationId: number, event: string, payload: unknown): void {
  if (!dmNs) return;
  dmNs.to(`conversation:${conversationId}`).emit(event, payload);
}

export function initRealtime(httpServer: HttpServer): IOServer | null {
  if (!ENABLED) {
    logger.info("Realtime", "Socket.IO disabled via SOCKET_IO_ENABLED=false");
    return null;
  }
  if (io) return io;

  io = new IOServer(httpServer, {
    cors: { origin: false },
    serveClient: false,
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  dmNs = io.of("/dm");

  // Auth middleware: valida cookie `session_token`. Sem sessão → reject.
  dmNs.use(async (socket, next) => {
    try {
      const raw = socket.request.headers.cookie;
      if (!raw) return next(new Error("UNAUTHORIZED"));
      const parsed = cookie.parse(raw);
      const token = parsed.session_token;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const user = await validateSession(token);
      if (!user) return next(new Error("SESSION_EXPIRED"));
      (socket as AuthedSocket).data.userId = user.id;
      (socket as AuthedSocket).data.conversationIds = new Set();
      next();
    } catch (err) {
      logger.warn("Realtime", `auth handshake failed: ${(err as Error).message}`);
      next(new Error("UNAUTHORIZED"));
    }
  });

  dmNs.on("connection", (socket) => {
    const authed = socket as AuthedSocket;
    const userId = authed.data.userId;
    void socket.join(`user:${userId}`);

    // ─── Join automático nas conversas ativas + gap-fill ───
    void joinUserConversations(authed).catch((err) => {
      logger.warn("Realtime", `joinUserConversations failed user=${userId}: ${(err as Error).message}`);
    });

    // Cliente avisa que criou/entrou numa nova conversa e quer
    // receber eventos dela neste socket.
    socket.on("conversation:join", async (payload: { conversation_id?: number }, ack?: (ok: boolean) => void) => {
      try {
        const conversationId = Number(payload?.conversation_id);
        if (!Number.isFinite(conversationId)) return ack?.(false);
        const ok = await ensureMembership(conversationId, userId);
        if (!ok) return ack?.(false);
        authed.data.conversationIds.add(conversationId);
        await socket.join(`conversation:${conversationId}`);
        // Emite sync só pra este socket — não floda os outros clients.
        const cursor = await getConversationCursor(conversationId, userId);
        socket.emit("conversation:sync", { conversation_id: conversationId, last_event_id: cursor });
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    // ─── DM client→server ───
    socket.on("message:typing", async (payload: { conversation_id?: number }, ack?: (ok: boolean) => void) => {
      try {
        if (!takeSocketToken(userId, "typing")) return ack?.(false);
        const conversationId = Number(payload?.conversation_id);
        if (!Number.isFinite(conversationId)) return ack?.(false);
        if (!authed.data.conversationIds.has(conversationId)) {
          // Não membro (ou ainda não entrou). Verifica no DB pra
          // tolerância a corrida no boot.
          const ok = await ensureMembership(conversationId, userId);
          if (!ok) return ack?.(false);
          authed.data.conversationIds.add(conversationId);
          await socket.join(`conversation:${conversationId}`);
        }
        emitToConversation(conversationId, "message:typing", {
          conversation_id: conversationId,
          user_id: userId,
        });
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on("message:read", async (payload: { conversation_id?: number }, ack?: (ok: boolean) => void) => {
      try {
        if (!takeSocketToken(userId, "read")) return ack?.(false);
        const conversationId = Number(payload?.conversation_id);
        if (!Number.isFinite(conversationId)) return ack?.(false);
        // markConversationRead já valida ownership e dispara fan-out
        // por publishToUser / publishToConversation, então o socket
        // só precisa delegar.
        const { markConversationRead } = await import("../features/messages/service.js");
        await markConversationRead(conversationId, userId);
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on(
      "dm:listening",
      async (payload: { conversation_id?: number; message_id?: number }, ack?: (ok: boolean) => void) => {
        try {
          if (!takeSocketToken(userId, "listening")) return ack?.(false);
          const conversationId = Number(payload?.conversation_id);
          const messageId = Number(payload?.message_id);
          if (!Number.isFinite(conversationId) || !Number.isFinite(messageId)) return ack?.(false);
          const meta = await loadConversationMessageMeta(conversationId, messageId);
          if (!meta) return ack?.(false);
          if (meta.user_a_id !== userId && meta.user_b_id !== userId) return ack?.(false);
          if (meta.kind !== "audio") return ack?.(false);
          if (meta.sender_id === userId) return ack?.(true);
          emitToUser(meta.sender_id, "listening", {
            conversation_id: conversationId,
            user_id: userId,
            message_id: messageId,
          });
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );
  });

  logger.info("Realtime", `Socket.IO server attached (namespace=/dm, dm_transport=${DM_TRANSPORT})`);
  return io;
}

// ─────────── Helpers internos ───────────

async function joinUserConversations(socket: AuthedSocket): Promise<void> {
  const userId = socket.data.userId;
  const { query } = await import("../db/index.js");
  // Conversas que NÃO foram "excluídas" pelo lado deste user
  // (mesmo critério usado em listConversations). Arquivadas entram
  // — usuário pode receber evento e a UI decide se mostra.
  const { rows } = await query<{ id: number }>(
    `SELECT c.id
       FROM conversations c
       LEFT JOIN conversation_user_state s
         ON s.conversation_id = c.id AND s.user_id = $1
      WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
        AND (s.deleted_at IS NULL)`,
    [userId],
  );
  for (const r of rows) {
    socket.data.conversationIds.add(r.id);
    await socket.join(`conversation:${r.id}`);
    const cursor = await getConversationCursor(r.id, userId);
    socket.emit("conversation:sync", { conversation_id: r.id, last_event_id: cursor });
  }
}

async function ensureMembership(conversationId: number, userId: number): Promise<boolean> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<{ ok: boolean }>(
    `SELECT 1 AS ok FROM conversations
      WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
    [conversationId, userId],
  );
  return rows.length > 0;
}

// Cursor é o id da última mensagem visível pro user na conversa,
// respeitando o corte `cleared_at` (lado-by-lado). Cliente usa esse
// id pra pedir "me dá mensagens com id > cursor".
async function getConversationCursor(conversationId: number, userId: number): Promise<number> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<{ max_id: number | null }>(
    `SELECT MAX(m.id) AS max_id
       FROM messages m
       LEFT JOIN conversation_user_state s
         ON s.conversation_id = m.conversation_id AND s.user_id = $2
      WHERE m.conversation_id = $1
        AND (s.cleared_at IS NULL OR m.created_at > s.cleared_at)`,
    [conversationId, userId],
  );
  return rows[0]?.max_id ?? 0;
}

interface ConversationMessageMeta {
  user_a_id: number;
  user_b_id: number;
  sender_id: number;
  kind: string;
}

async function loadConversationMessageMeta(
  conversationId: number,
  messageId: number,
): Promise<ConversationMessageMeta | null> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<ConversationMessageMeta>(
    `SELECT c.user_a_id, c.user_b_id, m.sender_id, m.kind
       FROM conversations c
       JOIN messages m ON m.conversation_id = c.id
      WHERE c.id = $1 AND m.id = $2`,
    [conversationId, messageId],
  );
  return rows[0] ?? null;
}

// ─── Rate limiting por socket/usuário ───
const SOCKET_RATE_LIMIT_WINDOW_MS = 60_000;
const SOCKET_RATE_LIMIT_MAX = 120;
const socketBuckets = new Map<string, { count: number; resetAt: number }>();

function takeSocketToken(userId: number, kind: "typing" | "listening" | "read"): boolean {
  const key = `${userId}:${kind}`;
  const now = Date.now();
  const bucket = socketBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    socketBuckets.set(key, { count: 1, resetAt: now + SOCKET_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= SOCKET_RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}
