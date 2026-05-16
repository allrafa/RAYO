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
// Kill-switch:
//  • `SOCKET_IO_ENABLED=false` desliga o Socket.IO inteiro (DM +
//    Comunidade + Notificações ficam sem realtime — fallback é polling).
//
// Path configurável (Task #230):
//  • `SOCKET_IO_PATH` (default `/socket.io`) — só altere se houver
//    colisão com outra rota. Cliente precisa do mesmo valor via
//    `VITE_SOCKET_IO_PATH` (com barra final).
//
// Task #229: SSE foi removido. Socket.IO é o transporte ÚNICO; não há
// mais `DM_REALTIME` ou `COMMUNITY_REALTIME` — o servidor sempre emite
// pelo socket e o cliente sempre ouve.

import type { Server as HttpServer } from "node:http";
import type { Namespace, Socket } from "socket.io";
import { Server as IOServer } from "socket.io";
import cookie from "cookie";
import { validateSession } from "../features/auth/service.js";
import { logger } from "../utils/logger.js";
import { attachCommunityNamespace } from "./community.js";

type AuthedSocket = Socket & { data: { userId: number; conversationIds: Set<number> } };

let io: IOServer | null = null;
let dmNs: Namespace | null = null;

const ENABLED = (process.env.SOCKET_IO_ENABLED ?? "true").toLowerCase() !== "false";

// Task #230 — path configurável. Normalizado pra terminar em `/` (o
// engine.io espera o trailing slash quando bate com o cliente).
function normalizeSocketPath(raw: string | undefined): string {
  const fallback = "/socket.io";
  const value = (raw ?? fallback).trim() || fallback;
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  const stripped = withLeadingSlash.replace(/\/+$/, "");
  return `${stripped}/`;
}

export const SOCKET_IO_PATH = normalizeSocketPath(process.env.SOCKET_IO_PATH);

export function isSocketEnabled(): boolean {
  return ENABLED && io !== null;
}

export function getIO(): IOServer | null {
  return io;
}

// Task #230 — ponto de extensão pra adapter externo (ex: Redis pra
// múltiplas instâncias). Hoje é no-op silencioso: vivemos com adapter
// in-memory padrão do socket.io. Quando precisar escalar horizontal,
// trocar este helper por algo como `io.adapter(createAdapter(redis))`
// — o resto do código não muda.
export function attachAdapter(_io: IOServer): void {
  // intentional no-op (single-instance). Single source of truth do
  // ponto onde futuros adapters serão plugados.
}

// Helper: fan-out pra todas as conexões de um user (todas as abas).
export function emitToUser(userId: number, event: string, payload: unknown): void {
  if (!dmNs) return;
  dmNs.to(`user:${userId}`).emit(event, payload);
}

// Task #229 — Substitui `getActiveSubscriberCount` do SSE: o cliente
// está "online" se tem pelo menos um socket conectado na sala
// `user:<id>` do namespace `/dm`. Usado pra decidir se mandamos
// e-mail de notificação de DM offline.
//
// Task #230 — log estruturado em debug pra rastrear decisões de gate
// quando algum recipient reclama de "não recebi e-mail" ou vice-versa.
export function isUserOnline(userId: number): boolean {
  if (!dmNs) {
    logger.debug("Realtime", `isUserOnline user=${userId} → false (namespace not attached)`);
    return false;
  }
  const room = dmNs.adapter.rooms.get(`user:${userId}`);
  const sockets = room?.size ?? 0;
  const online = sockets > 0;
  logger.debug("Realtime", `isUserOnline user=${userId} sockets=${sockets} online=${online}`);
  return online;
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
    path: SOCKET_IO_PATH,
    cors: { origin: false },
    serveClient: false,
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  // Task #230 — ponto de extensão pra adapter externo (no-op hoje).
  attachAdapter(io);

  dmNs = io.of("/dm");

  // Task #223 — anexa o namespace de Comunidade no mesmo http.Server,
  // SINCRONAMENTE. Era async via `import().then(...)` mas isso criava
  // janela onde `getCommunityTransport()` retornava "sse" pra clientes
  // que faziam handshake / `GET /me` no exato boot. Como o módulo já
  // está carregado estaticamente no topo, attach é determinístico.
  attachCommunityNamespace(io);

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

  logger.info("Realtime", "Socket.IO server attached (namespace=/dm)");
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
