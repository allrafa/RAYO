// Hook genérico de subscrição ao Socket.IO da Comunidade (Task #223).
//
// API mínima:
//   const { joinForum, joinPost, on } = useCommunitySocket(enabled);
//
// `enabled` é o gate de transporte (`communityTransport === "socket"`).
// Quando `false`, o hook não monta listeners nem entra em salas. O
// componente continua usando estado local e refetch — comportamento
// idêntico ao pré-task #223.
//
// O hook lida com reconnect automaticamente: ao receber `connect` do
// socket, re-entra nas salas que o componente declarou via `joinForum`
// / `joinPost` (mantemos refs do conjunto ativo).

import { useEffect, useRef } from "react";
import { getCommunitySocket, emitCommunityWithAck } from "../realtime/communitySocket";

type EventHandler = (payload: any) => void;

export interface UseCommunitySocket {
  /** Entra na sala de um fórum (idempotente). Sai automaticamente ao desmontar. */
  joinForum: (slug: string) => void;
  /** Entra na sala de um post (idempotente). Sai automaticamente ao desmontar. */
  joinPost: (postId: number) => void;
  /** Adiciona listener; retorna função pra remover. */
  on: (event: string, handler: EventHandler) => () => void;
  /** Avisa o servidor que entrou no post (placeholder de view-count). */
  reportView: (postId: number) => void;
  /** Emite "está digitando comentário" — broadcast na sala do post. */
  emitCommentTyping: (postId: number) => void;
}

const NOOP: UseCommunitySocket = {
  joinForum: () => {},
  joinPost: () => {},
  on: () => () => {},
  reportView: () => {},
  emitCommentTyping: () => {},
};

export function useCommunitySocket(enabled: boolean): UseCommunitySocket {
  const forumsRef = useRef<Set<string>>(new Set());
  const postsRef = useRef<Set<number>>(new Set());
  // Mantém handlers por evento pra (a) re-attachar no reconnect e
  // (b) garantir cleanup deterministico no unmount.
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    const s = getCommunitySocket();

    const onConnect = () => {
      // Re-join salas após reconnect.
      forumsRef.current.forEach((slug) => {
        void emitCommunityWithAck("forum:join", { slug });
      });
      postsRef.current.forEach((postId) => {
        void emitCommunityWithAck("post:join", { post_id: postId });
      });
    };

    if (s.connected) onConnect();
    s.on("connect", onConnect);
    return () => {
      s.off("connect", onConnect);
      // Sai de todas as salas declaradas por este hook.
      forumsRef.current.forEach((slug) => {
        void emitCommunityWithAck("forum:leave", { slug });
      });
      postsRef.current.forEach((postId) => {
        void emitCommunityWithAck("post:leave", { post_id: postId });
      });
      forumsRef.current.clear();
      postsRef.current.clear();
      // Remove listeners residuais.
      handlersRef.current.forEach((set, event) => {
        set.forEach((h) => s.off(event, h));
      });
      handlersRef.current.clear();
    };
  }, [enabled]);

  if (!enabled) return NOOP;

  return {
    joinForum: (slug: string) => {
      const norm = slug.trim().toLowerCase();
      if (!norm || forumsRef.current.has(norm)) return;
      forumsRef.current.add(norm);
      void emitCommunityWithAck("forum:join", { slug: norm });
    },
    joinPost: (postId: number) => {
      if (!Number.isFinite(postId) || postsRef.current.has(postId)) return;
      postsRef.current.add(postId);
      void emitCommunityWithAck("post:join", { post_id: postId });
    },
    on: (event: string, handler: EventHandler) => {
      const s = getCommunitySocket();
      s.on(event, handler);
      let set = handlersRef.current.get(event);
      if (!set) {
        set = new Set();
        handlersRef.current.set(event, set);
      }
      set.add(handler);
      return () => {
        s.off(event, handler);
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    reportView: (postId: number) => {
      void emitCommunityWithAck("post:view", { post_id: postId });
    },
    emitCommentTyping: (postId: number) => {
      void emitCommunityWithAck("comment:typing", { post_id: postId });
    },
  };
}
