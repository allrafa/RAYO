// Socket.IO realtime base (Task #222 — DM migration).
//
// Atualmente cobre só DM. Conforme outras features migrarem (Comunidade,
// Notificações), os helpers desta camada são reaproveitados.
//
// Modelo:
//  • 1 namespace default (`/`) — basta pra DM no escopo desta task.
//  • Auth via cookie httpOnly `session_token` (mesma sessão da app).
//  • Cada socket entra automaticamente na sala `user:<id>`. `emitToUser`
//    publica nessa sala (todos os clientes/abas do mesmo user recebem).
//  • Eventos emitidos pelo servidor reusam EXATAMENTE os mesmos nomes
//    e payloads do SSE legado (`message:new`, `message:read`,
//    `unread:changed`, `message:reaction`, `typing`, `listening`) —
//    cliente dedup por `message.id`/timestamp.
//  • Eventos cliente→servidor (Task #222): `dm:typing` e `dm:listening`
//    substituem `POST /typing` e `POST /listening` (mantidos pra
//    clientes ainda no SSE).

import type { Server as HttpServer } from "node:http";
import type { Socket } from "socket.io";
import { Server as IOServer } from "socket.io";
import cookie from "cookie";
import { validateSession } from "../features/auth/service.js";
import { logger } from "../utils/logger.js";

type AuthedSocket = Socket & { data: { userId: number } };

let io: IOServer | null = null;

const ENABLED = (process.env.SOCKET_IO_ENABLED ?? "true").toLowerCase() !== "false";

export function isSocketEnabled(): boolean {
  return ENABLED && io !== null;
}

export function getIO(): IOServer | null {
  return io;
}

// Helper: fan-out pra todas as conexões de um user. Usado pelo
// publishToUser de DM (events.ts) em paralelo ao SSE legado.
export function emitToUser(userId: number, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function initRealtime(httpServer: HttpServer): IOServer | null {
  if (!ENABLED) {
    logger.info("Realtime", "Socket.IO disabled via SOCKET_IO_ENABLED=false");
    return null;
  }
  if (io) return io;

  io = new IOServer(httpServer, {
    // Reusa o mesmo host/proxy (Replit). `path` default `/socket.io/`.
    // CORS: same-origin no Replit, então não precisa abrir; se for
    // necessário cross-origin no futuro, vem por env.
    cors: { origin: false },
    // Permite long-poll como fallback quando o proxy bloqueia WS.
    // Ordem padrão (polling → websocket upgrade) está OK.
    serveClient: false,
    // Keep-alive frequente: Replit proxy mata conexões idle ~30s.
    pingInterval: 20_000,
    pingTimeout: 25_000,
    // Cliente envia cookie httpOnly automaticamente em same-origin;
    // não precisamos de extraHeaders.
  });

  // Auth middleware: valida cookie `session_token`. Sem sessão → reject.
  io.use(async (socket, next) => {
    try {
      const raw = socket.request.headers.cookie;
      if (!raw) return next(new Error("UNAUTHORIZED"));
      const parsed = cookie.parse(raw);
      const token = parsed.session_token;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const user = await validateSession(token);
      if (!user) return next(new Error("SESSION_EXPIRED"));
      (socket as AuthedSocket).data.userId = user.id;
      next();
    } catch (err) {
      logger.warn("Realtime", `auth handshake failed: ${(err as Error).message}`);
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as AuthedSocket).data.userId;
    void socket.join(`user:${userId}`);

    // ─── DM client→server events (Task #222) ───
    // Os handlers abaixo replicam as MESMAS validações dos endpoints
    // REST (`POST /conversations/:id/typing` e `/listening`):
    // membership da conversa, e — pra listening — mensagem existe,
    // é de áudio, e o listener não é o próprio autor. Sem isso o
    // socket viraria um vetor de abuso (eventos forjados pra ids
    // arbitrários).
    socket.on("dm:typing", async (payload: { conversation_id?: number }, ack?: (ok: boolean) => void) => {
      try {
        if (!takeSocketToken(userId, "typing")) return ack?.(false);
        const conversationId = Number(payload?.conversation_id);
        if (!Number.isFinite(conversationId)) return ack?.(false);
        const other = await getOtherParticipant(conversationId, userId);
        if (other == null) return ack?.(false);
        // Não emite pra si mesmo (evita feedback em outras abas do typing).
        emitToUser(other, "typing", { conversation_id: conversationId, user_id: userId });
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
          // Paridade com REST: precisa ser membro, ser áudio, e o
          // listener não pode ser o autor (no-op silencioso).
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

  logger.info("Realtime", "Socket.IO server attached (namespace=/)");
  return io;
}

// Lookup ad-hoc pra evitar import circular com features/messages.
// Retorna o id do outro participante OU null se userId não pertence.
async function getOtherParticipant(conversationId: number, userId: number): Promise<number | null> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<{ user_a_id: number; user_b_id: number }>(
    `SELECT user_a_id, user_b_id FROM conversations WHERE id = $1`,
    [conversationId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.user_a_id === userId) return row.user_b_id;
  if (row.user_b_id === userId) return row.user_a_id;
  return null;
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

// ─── Rate limiting por socket/usuário (Task #222 review) ───
// Bucket in-memory simples, mesma filosofia de `rateLimiter` em
// `server/middleware/security.ts`. Reset por janela. Não persiste
// entre reinicializações — não importa pra typing/listening
// (efêmero). Limites são generosos por design: typing front-end
// já throttla a 1/3s, listening a 1/5s por message — então 60/min
// dá folga para múltiplas conversas simultâneas sem permitir
// flood de DB queries.
const SOCKET_RATE_LIMIT_WINDOW_MS = 60_000;
const SOCKET_RATE_LIMIT_MAX = 60;
const socketBuckets = new Map<string, { count: number; resetAt: number }>();

function takeSocketToken(userId: number, kind: "typing" | "listening"): boolean {
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
