// Hook genérico de subscrição ao Socket.IO da Comunidade (Task #223).
//
// API mínima:
//   const { joinForum, leaveForum, joinPost, leavePost, on, onReconnect,
//           emitCommentTyping } = useCommunitySocket(enabled);
//
// `enabled` é um gate local (testes, kill-switch UX). Em produção
// (Task #229) é sempre `true` — Socket.IO é o transporte único da
// Comunidade. Quando `false`, o hook não monta listeners nem entra em
// salas; o componente continua via estado local + refetch.
//
// O hook lida com reconnect automaticamente: ao receber `connect` do
// socket, re-entra nas salas que o componente declarou via `joinForum`
// / `joinPost` (mantemos refs do conjunto ativo), e dispara qualquer
// callback registrado por `onReconnect` (usado pelo cliente pra
// chamar a rota REST `/since` e reconciliar posts perdidos).

import { useEffect, useMemo, useRef } from "react";
import { getCommunitySocket, emitCommunityWithAck } from "../realtime/communitySocket";

// Payloads tipados — espelham `server/features/community/realtime.ts`.
export interface PostNewEvent {
  id: number;
  forum_id: number;
  forum_slug: string;
  forum_name?: string;
  author_id: number;
  author_name: string;
  title: string | null;
  content: string;
  created_at: string;
  class_id: number | null;
}

export interface PostUpdatedEvent {
  post_id: number;
  forum_slug: string;
  updated_at?: string;
  content?: string;
  title?: string | null;
  category?: string | null;
  images?: unknown;
  is_hidden?: boolean;
  deleted?: boolean;
  comment_count?: number;
}

export interface PostReactionEvent {
  post_id: number;
  forum_slug: string;
  user_id: number;
  reactions: Array<{ emoji: string; count: number }>;
  like_count: number;
}

export interface CommentNewEvent {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  like_count: number;
  reactions?: Array<{ emoji: string; count: number }>;
}

export interface CommentUpdatedEvent {
  comment_id: number;
  post_id: number;
  is_hidden?: boolean;
}

export interface CommentReactionEvent {
  comment_id: number;
  post_id: number;
  user_id: number;
  reactions: Array<{ emoji: string; count: number }>;
}

export interface CommentTypingEvent {
  post_id: number;
  user_id: number;
}

export interface PostPresenceEvent {
  post_id: number;
  viewers: number;
}

export type CommunityEventMap = {
  "post:new": PostNewEvent;
  "post:updated": PostUpdatedEvent;
  "post:reaction": PostReactionEvent;
  "post:presence": PostPresenceEvent;
  "comment:new": CommentNewEvent;
  "comment:updated": CommentUpdatedEvent;
  "comment:reaction": CommentReactionEvent;
  "comment:typing": CommentTypingEvent;
};

type EventHandler<E extends keyof CommunityEventMap> = (payload: CommunityEventMap[E]) => void;
type AnyHandler = (payload: unknown) => void;

export interface UseCommunitySocket {
  /** Entra na sala de um fórum (idempotente). Use `leaveForum` ao desmontar/trocar. */
  joinForum: (slug: string) => void;
  /** Sai da sala do fórum. Idempotente. */
  leaveForum: (slug: string) => void;
  /** Entra na sala de um post (idempotente). Use `leavePost` ao desmontar/trocar. */
  joinPost: (postId: number) => void;
  /** Sai da sala do post. Idempotente. */
  leavePost: (postId: number) => void;
  /** Adiciona listener tipado; retorna função pra remover. */
  on: <E extends keyof CommunityEventMap>(event: E, handler: EventHandler<E>) => () => void;
  /** Callback disparado após reconnect (não no primeiro connect). Retorna cleanup. */
  onReconnect: (cb: () => void) => () => void;
  /** Emite "está digitando comentário" — broadcast na sala do post. */
  emitCommentTyping: (postId: number) => void;
  /** Sinaliza visualização do post (idempotente por sessão de socket, throttled). */
  reportView: (postId: number) => void;
}

const NOOP: UseCommunitySocket = {
  joinForum: () => {},
  leaveForum: () => {},
  joinPost: () => {},
  leavePost: () => {},
  on: () => () => {},
  onReconnect: () => () => {},
  emitCommentTyping: () => {},
  reportView: () => {},
};

export function useCommunitySocket(enabled: boolean): UseCommunitySocket {
  const forumsRef = useRef<Set<string>>(new Set());
  const postsRef = useRef<Set<number>>(new Set());
  // Handlers ativos por evento — pra cleanup determinístico no unmount.
  const handlersRef = useRef<Map<string, Set<AnyHandler>>>(new Map());
  const reconnectCbsRef = useRef<Set<() => void>>(new Set());
  // `true` depois do primeiro `connect` recebido — usado pra distinguir
  // connect inicial de reconnect real (só dispara onReconnect no segundo+).
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const s = getCommunitySocket();

    const onConnect = () => {
      // Re-join salas (idempotente no servidor).
      forumsRef.current.forEach((slug) => {
        void emitCommunityWithAck("forum:join", { slug });
      });
      postsRef.current.forEach((postId) => {
        void emitCommunityWithAck("post:join", { post_id: postId });
      });
      // Dispara reconnect callbacks só nos `connect` subsequentes.
      if (hasConnectedRef.current) {
        reconnectCbsRef.current.forEach((cb) => {
          try { cb(); } catch { /* swallow */ }
        });
      } else {
        hasConnectedRef.current = true;
      }
    };

    if (s.connected) onConnect();
    s.on("connect", onConnect);
    return () => {
      s.off("connect", onConnect);
      forumsRef.current.forEach((slug) => {
        void emitCommunityWithAck("forum:leave", { slug });
      });
      postsRef.current.forEach((postId) => {
        void emitCommunityWithAck("post:leave", { post_id: postId });
      });
      forumsRef.current.clear();
      postsRef.current.clear();
      handlersRef.current.forEach((set, event) => {
        set.forEach((h) => s.off(event, h));
      });
      handlersRef.current.clear();
      reconnectCbsRef.current.clear();
    };
  }, [enabled]);

  // CRÍTICO — identidade estável do objeto retornado. Sem `useMemo`,
  // cada render produz um novo objeto, fazendo effects que dependem
  // de `community` re-executarem e thrashar leave/join (passando do
  // rate limit no servidor e perdendo eventos).
  const api = useMemo<UseCommunitySocket>(() => {
    if (!enabled) return NOOP;
    return {
      joinForum: (slug: string) => {
        const norm = slug.trim().toLowerCase();
        if (!norm || forumsRef.current.has(norm)) return;
        forumsRef.current.add(norm);
        void emitCommunityWithAck("forum:join", { slug: norm });
      },
      leaveForum: (slug: string) => {
        const norm = slug.trim().toLowerCase();
        if (!norm || !forumsRef.current.has(norm)) return;
        forumsRef.current.delete(norm);
        void emitCommunityWithAck("forum:leave", { slug: norm });
      },
      joinPost: (postId: number) => {
        if (!Number.isFinite(postId) || postsRef.current.has(postId)) return;
        postsRef.current.add(postId);
        void emitCommunityWithAck("post:join", { post_id: postId });
      },
      leavePost: (postId: number) => {
        if (!Number.isFinite(postId) || !postsRef.current.has(postId)) return;
        postsRef.current.delete(postId);
        void emitCommunityWithAck("post:leave", { post_id: postId });
      },
      on: <E extends keyof CommunityEventMap>(event: E, handler: EventHandler<E>) => {
        const s = getCommunitySocket();
        const wrapped = handler as unknown as AnyHandler;
        s.on(event, wrapped);
        let set = handlersRef.current.get(event);
        if (!set) {
          set = new Set();
          handlersRef.current.set(event, set);
        }
        set.add(wrapped);
        return () => {
          s.off(event, wrapped);
          handlersRef.current.get(event)?.delete(wrapped);
        };
      },
      onReconnect: (cb: () => void) => {
        reconnectCbsRef.current.add(cb);
        return () => {
          reconnectCbsRef.current.delete(cb);
        };
      },
      emitCommentTyping: (postId: number) => {
        void emitCommunityWithAck("comment:typing", { post_id: postId });
      },
      reportView: (postId: number) => {
        if (!Number.isFinite(postId)) return;
        void emitCommunityWithAck("post:view", { post_id: postId });
      },
    };
  }, [enabled]);

  return api;
}
