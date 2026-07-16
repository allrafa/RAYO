// Socket.IO realtime — Community transport (Task #223).
//
// Namespace dedicado `/community`. Auth pelo mesmo cookie `session_token`
// (validateSession) — handler em `attachCommunityNamespace` reusa o
// mesmo padrão do `/dm`.
//
// Modelo de salas:
//   • `forum:<slug>`  → fan-out de eventos de feed de uma comunidade
//     (post:new, post:updated, post:reaction).
//   • `post:<id>`     → fan-out de eventos dentro de uma discussão
//     (comment:new, comment:updated, comment:reaction, comment:typing).
//
// Eventos servidor→cliente (publicados pelos call sites em
// `server/features/community/realtime.ts`):
//   - post:new, post:updated, post:reaction
//   - comment:new, comment:updated, comment:reaction
//
// Eventos cliente→servidor:
//   - `forum:join` / `forum:leave`  — gate por forum existir + active.
//   - `post:join`  / `post:leave`   — gate por post existir + não hidden.
//   - `post:view`                    — idempotente por (socket, post),
//     throttled. Sem persistência nesta iteração (view_count não vive
//     em schema), mas mantém contrato pro futuro view-count.
//   - `comment:typing`               — broadcast na sala do post.
//
// Eventos servidor→sala (presence):
//   - `post:presence` — total de viewers únicos na sala `post:<id>`,
//     re-emitido após join/leave/disconnect, throttled a 1 emit/3s
//     por post pra evitar avalanche.
//
// Kill-switch: `SOCKET_IO_ENABLED=false` desliga o Socket.IO inteiro
// (compartilhado com o /dm). Task #229: `COMMUNITY_REALTIME` foi
// removido — Socket.IO é o transporte único, o cliente sempre ouve.

import type { Server as IOServer, Namespace, Socket } from "socket.io";
import cookie from "cookie";
import { validateSession } from "../features/auth/service.js";
import { logger } from "../utils/logger.js";
import { spNowParts } from "../lib/emailScheduler.js";

type AuthedSocket = Socket & {
  data: {
    userId: number;
    forumSlugs: Set<string>;
    postIds: Set<number>;
    // DIFERENCIAL_PLAN.md D3 — sala do Momento RAYO em que o socket
    // está (nome completo `momento:<data SP>`), pra broadcast do
    // contador no leave/disconnect.
    momentoRoom?: string;
  };
};

let communityNs: Namespace | null = null;

// Helpers de fan-out — usados pelo `community/realtime.ts` depois do
// INSERT/UPDATE no service. Quando o namespace não está montado (kill
// switch ou ambiente de teste), viram no-op silencioso.

export function emitToForumRoom(slug: string, event: string, payload: unknown): void {
  if (!communityNs || !slug) return;
  communityNs.to(`forum:${slug.toLowerCase()}`).emit(event, payload);
}

export function emitToPostRoom(postId: number, event: string, payload: unknown): void {
  if (!communityNs || !Number.isFinite(postId)) return;
  communityNs.to(`post:${postId}`).emit(event, payload);
}

export function attachCommunityNamespace(io: IOServer): void {
  if (communityNs) return;
  communityNs = io.of("/community");

  communityNs.use(async (socket, next) => {
    try {
      const raw = socket.request.headers.cookie;
      if (!raw) return next(new Error("UNAUTHORIZED"));
      const parsed = cookie.parse(raw);
      const token = parsed.session_token;
      if (!token) return next(new Error("UNAUTHORIZED"));
      const user = await validateSession(token);
      if (!user) return next(new Error("SESSION_EXPIRED"));
      (socket as AuthedSocket).data.userId = user.id;
      (socket as AuthedSocket).data.forumSlugs = new Set();
      (socket as AuthedSocket).data.postIds = new Set();
      next();
    } catch (err) {
      logger.warn("Realtime", `community handshake failed: ${(err as Error).message}`);
      next(new Error("UNAUTHORIZED"));
    }
  });

  communityNs.on("connection", (socket) => {
    const authed = socket as AuthedSocket;
    const userId = authed.data.userId;
    void socket.join(`user:${userId}`);

    socket.on(
      "forum:join",
      async (payload: { slug?: string }, ack?: (ok: boolean) => void) => {
        try {
          if (!takeToken(userId, "join")) return ack?.(false);
          const slug = String(payload?.slug ?? "").trim().toLowerCase();
          if (!/^[a-z0-9-]{2,60}$/.test(slug)) return ack?.(false);
          const ok = await forumExists(slug);
          if (!ok) return ack?.(false);
          authed.data.forumSlugs.add(slug);
          await socket.join(`forum:${slug}`);
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );

    socket.on("forum:leave", async (payload: { slug?: string }, ack?: (ok: boolean) => void) => {
      const slug = String(payload?.slug ?? "").trim().toLowerCase();
      if (!slug) return ack?.(false);
      authed.data.forumSlugs.delete(slug);
      await socket.leave(`forum:${slug}`);
      ack?.(true);
    });

    socket.on(
      "post:join",
      async (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
        try {
          if (!takeToken(userId, "join")) return ack?.(false);
          const postId = Number(payload?.post_id);
          if (!Number.isFinite(postId) || postId < 1) return ack?.(false);
          const access = await canViewPost(postId, userId);
          if (!access) return ack?.(false);
          authed.data.postIds.add(postId);
          await socket.join(`post:${postId}`);
          trackPresence(postId, userId, 1);
          schedulePresenceEmit(postId);
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );

    socket.on("post:leave", async (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
      const postId = Number(payload?.post_id);
      if (!Number.isFinite(postId)) return ack?.(false);
      if (authed.data.postIds.has(postId)) {
        authed.data.postIds.delete(postId);
        trackPresence(postId, userId, -1);
        schedulePresenceEmit(postId);
      }
      await socket.leave(`post:${postId}`);
      ack?.(true);
    });

    // post:view — incrementa `posts.view_count` (coluna já existe no
    // schema). Idempotente por (socket, post) — primeira chamada por
    // socket gera UPDATE; chamadas subsequentes são no-op silencioso.
    // Throttled via bucket `view` (60/min/user) como guarda extra
    // contra clientes maliciosos abrindo+fechando sockets em loop.
    const seenViews = new Set<number>();
    socket.on(
      "post:view",
      async (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
        try {
          const postId = Number(payload?.post_id);
          if (!Number.isFinite(postId) || postId < 1) return ack?.(false);
          if (seenViews.has(postId)) return ack?.(true); // idempotente por socket
          if (!takeToken(userId, "view")) return ack?.(false);
          seenViews.add(postId);
          const { query } = await import("../db/index.js");
          await query(
            `UPDATE posts SET view_count = COALESCE(view_count, 0) + 1
              WHERE id = $1 AND is_hidden = FALSE`,
            [postId],
          );
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );

    // ── Momento RAYO (DIFERENCIAL_PLAN.md D3) ────────────────────────
    // Sala diária de oração síncrona. O NOME da sala vem do servidor
    // (data SP) — o cliente não escolhe a sala. Contador broadcast em
    // join/leave/disconnect; améns flutuantes re-broadcast na sala.
    const momentoRoomName = () => `momento:${spNowParts(new Date()).date}`;
    const broadcastMomentoCount = (room: string) => {
      const count = communityNs?.adapter.rooms.get(room)?.size ?? 0;
      communityNs?.to(room).emit("momento:count", { count });
    };

    socket.on("momento:join", async (_payload: unknown, ack?: (ok: boolean, count?: number) => void) => {
      try {
        if (!takeToken(userId, "join")) return ack?.(false);
        const room = momentoRoomName();
        authed.data.momentoRoom = room;
        await socket.join(room);
        broadcastMomentoCount(room);
        ack?.(true, communityNs?.adapter.rooms.get(room)?.size ?? 0);
      } catch {
        ack?.(false);
      }
    });

    socket.on("momento:leave", async (_payload: unknown, ack?: (ok: boolean) => void) => {
      const room = authed.data.momentoRoom;
      authed.data.momentoRoom = undefined;
      if (room) {
        await socket.leave(room);
        broadcastMomentoCount(room);
      }
      ack?.(true);
    });

    socket.on("momento:amen", (_payload: unknown, ack?: (ok: boolean) => void) => {
      try {
        // Mesmo bucket do typing: alguns por segundo, sem flood.
        if (!takeToken(userId, "typing")) return ack?.(false);
        const room = authed.data.momentoRoom;
        if (!room) return ack?.(false);
        communityNs?.to(room).emit("momento:amen", { user_id: userId });
        ack?.(true);
      } catch {
        ack?.(false);
      }
    });

    socket.on("disconnect", () => {
      // Limpa contadores de presence pra cada post em que estava.
      authed.data.postIds.forEach((postId) => {
        trackPresence(postId, userId, -1);
        schedulePresenceEmit(postId);
      });
      authed.data.postIds.clear();
      // Momento: o socket já saiu da sala; só re-anuncia a contagem.
      if (authed.data.momentoRoom) {
        broadcastMomentoCount(authed.data.momentoRoom);
        authed.data.momentoRoom = undefined;
      }
    });

    socket.on(
      "comment:typing",
      (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
        try {
          if (!takeToken(userId, "typing")) return ack?.(false);
          const postId = Number(payload?.post_id);
          if (!Number.isFinite(postId) || postId < 1) return ack?.(false);
          if (!authed.data.postIds.has(postId)) return ack?.(false);
          emitToPostRoom(postId, "comment:typing", {
            post_id: postId,
            user_id: userId,
          });
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );
  });

  logger.info("Realtime", "Socket.IO community namespace attached");
}

// ─────────── Helpers internos ───────────

async function forumExists(slug: string): Promise<boolean> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<{ ok: boolean }>(
    `SELECT 1 AS ok FROM forums WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  return rows.length > 0;
}

// Gate de leitura de post pra socket join. Espelha COMPLETAMENTE a
// lógica da REST `GET /api/community/posts/:id` (que aplica trail gate
// via `requireTrailAccessForCourse`). Sem isso, usuário com matrícula
// legada mas sem assinatura ativa receberia eventos socket de uma
// turma paga (bypass de paywall).
//
// Ordem:
//  1) Post existe + não hidden.
//  2) Se não é class-scoped, libera.
//  3) Se é class-scoped:
//     a) moderator+ libera (necessário pra produtores/líderes);
//     b) caso contrário precisa de matrícula NO COURSE +
//        (se o course pertence a trilha paga) assinatura ativa na trilha.
async function canViewPost(postId: number, userId: number): Promise<boolean> {
  const { query } = await import("../db/index.js");
  const { rows } = await query<{ class_id: number | null; is_hidden: boolean }>(
    `SELECT class_id, is_hidden FROM posts WHERE id = $1`,
    [postId],
  );
  if (rows.length === 0) return false;
  const post = rows[0];
  if (post.is_hidden) return false;
  if (!post.class_id) return true;

  const { rows: roleRows } = await query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1`,
    [userId],
  );
  const role = roleRows[0]?.role;
  if (role === "moderator" || role === "admin") return true;

  const { rows: enrolled } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM user_course_progress
      WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
    [userId, post.class_id],
  );
  if (enrolled.length === 0) return false;

  // Trail gate — espelha `checkCourseAccess`.
  const { getTrailIdForCourse, userHasActiveTrailAccess } = await import(
    "../features/billing/service.js"
  );
  const trailId = await getTrailIdForCourse(post.class_id);
  if (trailId === null) return true; // course gratuito
  return await userHasActiveTrailAccess(userId, trailId);
}

// Rate limiting por (user, kind) — janela rolante simples in-memory.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX: Record<string, number> = {
  join: 60,
  typing: 120,
  view: 60,
};
const buckets = new Map<string, { count: number; resetAt: number }>();
function takeToken(userId: number, kind: "join" | "typing" | "view"): boolean {
  const key = `${userId}:${kind}`;
  const now = Date.now();
  const max = RATE_MAX[kind] ?? 60;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

// ─────────── Presence ───────────
// Conta viewers únicos por post. Multi-tab/abas do mesmo user contam
// 1 enquanto pelo menos uma estiver conectada (refcount por sessão).
// Emit é throttled a 1/3s por post — evita avalanche em posts populares.
const PRESENCE_THROTTLE_MS = 3_000;
const presenceCounts = new Map<number, Map<number, number>>(); // post → user → refcount
const presenceTimers = new Map<number, NodeJS.Timeout>();
const presencePending = new Set<number>();

function trackPresence(postId: number, userId: number, delta: 1 | -1): void {
  let users = presenceCounts.get(postId);
  if (!users) {
    if (delta < 0) return;
    users = new Map();
    presenceCounts.set(postId, users);
  }
  const next = (users.get(userId) ?? 0) + delta;
  if (next <= 0) {
    users.delete(userId);
    if (users.size === 0) presenceCounts.delete(postId);
  } else {
    users.set(userId, next);
  }
}

function schedulePresenceEmit(postId: number): void {
  if (presenceTimers.has(postId)) {
    presencePending.add(postId);
    return;
  }
  emitPresenceNow(postId);
  const timer = setTimeout(() => {
    presenceTimers.delete(postId);
    if (presencePending.delete(postId)) emitPresenceNow(postId);
  }, PRESENCE_THROTTLE_MS);
  presenceTimers.set(postId, timer);
}

function emitPresenceNow(postId: number): void {
  const count = presenceCounts.get(postId)?.size ?? 0;
  emitToPostRoom(postId, "post:presence", { post_id: postId, viewers: count });
}
