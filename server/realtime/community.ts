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
//   - `post:view`                    — throttled, sem persistência (place-
//     holder pra view-count em features futuras).
//   - `comment:typing`               — broadcast na sala do post.
//
// Kill-switch: `COMMUNITY_REALTIME=sse` força o cliente a ignorar este
// transporte (servidor segue emitindo, é só switch de leitura).
// `SOCKET_IO_ENABLED=false` desliga o Socket.IO inteiro (kill-switch
// absoluto compartilhado com o /dm).

import type { Server as IOServer, Namespace, Socket } from "socket.io";
import cookie from "cookie";
import { validateSession } from "../features/auth/service.js";
import { logger } from "../utils/logger.js";

type AuthedSocket = Socket & {
  data: { userId: number; forumSlugs: Set<string>; postIds: Set<number> };
};

let communityNs: Namespace | null = null;

const COMMUNITY_TRANSPORT: "socket" | "sse" = (() => {
  const v = (process.env.COMMUNITY_REALTIME ?? "").toLowerCase();
  if (v === "sse") return "sse";
  if (v === "socket") return "socket";
  // Default: socket em dev, sse em prod (até estabilizar — mesma
  // política do DM transport).
  return process.env.NODE_ENV === "production" ? "sse" : "socket";
})();

export function getCommunityTransport(): "socket" | "sse" {
  // Coerência com o kill-switch absoluto: se Socket.IO não está
  // ligado, força "sse" mesmo que a env diga "socket".
  if (!communityNs) return "sse";
  return COMMUNITY_TRANSPORT;
}

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
          ack?.(true);
        } catch {
          ack?.(false);
        }
      },
    );

    socket.on("post:leave", async (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
      const postId = Number(payload?.post_id);
      if (!Number.isFinite(postId)) return ack?.(false);
      authed.data.postIds.delete(postId);
      await socket.leave(`post:${postId}`);
      ack?.(true);
    });

    // post:view — sem persistência nesta iteração (view_count não vive
    // em schema). Throttled por (user, post) e idempotente por sessão:
    // não emite nada, só serve de placeholder pra feature de view-count
    // futura. Retornar ack=true mantém o contrato.
    const seenViews = new Set<number>();
    socket.on("post:view", (payload: { post_id?: number }, ack?: (ok: boolean) => void) => {
      try {
        const postId = Number(payload?.post_id);
        if (!Number.isFinite(postId) || postId < 1) return ack?.(false);
        if (seenViews.has(postId)) return ack?.(true); // idempotente por socket
        if (!takeToken(userId, "view")) return ack?.(false);
        seenViews.add(postId);
        ack?.(true);
      } catch {
        ack?.(false);
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

  logger.info(
    "Realtime",
    `Socket.IO community namespace attached (community_transport=${COMMUNITY_TRANSPORT})`,
  );
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
