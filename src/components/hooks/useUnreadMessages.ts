import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../AuthContext";
import { getSocket, disconnectSocket } from "../../lib/realtime/socket";

// Slow safety-net poll used only when the realtime stream is NOT connected
// (e.g. proxy stripped SSE, browser blocked it, or transient network drop).
const FALLBACK_POLL_INTERVAL_MS = 60_000;

interface UnreadCountResponse {
  count: number;
}

export type MessageStreamEvent =
  | { type: "message:new"; payload: MessageNewPayload }
  | { type: "message:read"; payload: MessageReadPayload }
  | { type: "message:reaction"; payload: MessageReactionPayload }
  | { type: "unread:changed"; payload: UnreadChangedPayload }
  | { type: "typing"; payload: TypingPayload }
  | { type: "listening"; payload: ListeningPayload }
  | { type: "notification:new"; payload: NotificationPayload }
  | { type: "notification:unread"; payload: { unread: number } }
  | { type: "connected"; payload: Record<string, never> };

export interface MessageReactionPayload {
  conversation_id: number;
  message_id: number;
  reactions: Array<{ emoji: string; count: number }>;
}

export interface NotificationPayload {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface TypingPayload {
  conversation_id: number;
  user_id: number;
}

export interface ListeningPayload {
  conversation_id: number;
  user_id: number;
  message_id: number;
}

export type MessageKind = "text" | "image" | "audio";

export interface MessageAttachmentMeta {
  mime?: string;
  size?: number;
  name?: string;
  duration_sec?: number;
  [key: string]: unknown;
}

export interface MessageNewPayload {
  conversation_id: number;
  message: {
    id: number;
    conversation_id: number;
    sender_id: number;
    sender_name?: string;
    kind: MessageKind;
    content: string;
    attachment_url: string | null;
    attachment_meta: MessageAttachmentMeta | null;
    read_at: string | null;
    created_at: string;
  };
}

export interface UnreadChangedPayload {
  count: number;
}

export interface MessageReadPayload {
  conversation_id: number;
  reader_id: number;
  message_ids: number[];
  read_at: string;
}

type StreamHandler = (event: MessageStreamEvent) => void;

interface UnreadMessagesContextValue {
  count: number;
  loaded: boolean;
  refresh: () => Promise<void>;
  /** Subscribe to raw stream events. Returns an unsubscribe function. */
  subscribe: (handler: StreamHandler) => () => void;
  /** True when the realtime channel (active transport) is currently open. */
  streamConnected: boolean;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null);

// Task #222 — Cursor por conversa pra gap-fill após reconectar.
// Atualizado em todo `message:new` recebido. Quando o servidor manda
// `conversation:sync`, comparamos `last_event_id` com o que temos e,
// se houver gap, fazemos GET /api/messages/conversations/:id/since.
const conversationCursors = new Map<number, number>();

function bumpConversationCursor(conversationId: number, id: number): void {
  const prev = conversationCursors.get(conversationId) ?? 0;
  if (id > prev) conversationCursors.set(conversationId, id);
}

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user, dmTransport } = useAuth();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const mountedRef = useRef(true);
  const subscribersRef = useRef<Set<StreamHandler>>(new Set());
  const streamConnectedRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await api.get<UnreadCountResponse>("/api/messages/unread-count");
    if (!mountedRef.current) return;
    if (res.success && res.data) {
      setCount(res.data.count);
    }
    setLoaded(true);
  }, []);

  const subscribe = useCallback((handler: StreamHandler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const broadcast = useCallback((event: MessageStreamEvent) => {
    if (event.type === "message:new") {
      bumpConversationCursor(event.payload.conversation_id, event.payload.message.id);
    }
    for (const h of Array.from(subscribersRef.current)) {
      try {
        h(event);
      } catch {
        // Ignore subscriber errors.
      }
    }
  }, []);

  // Gap-fill: cliente pede mensagens com id > cursor local. Idempotente,
  // dedup downstream por message.id.
  const fillGap = useCallback(
    async (conversationId: number, serverLastId: number) => {
      const localCursor = conversationCursors.get(conversationId) ?? 0;
      if (serverLastId <= localCursor) return;
      try {
        const res = await api.get<{
          messages: Array<MessageNewPayload["message"]>;
          last_event_id: number;
        }>(`/api/messages/conversations/${conversationId}/since?cursor=${localCursor}`);
        if (!res.success || !res.data) return;
        for (const m of res.data.messages) {
          broadcast({ type: "message:new", payload: { conversation_id: conversationId, message: m } });
        }
      } catch {
        /* gap-fill é best-effort; pode tentar de novo no próximo connect */
      }
    },
    [broadcast],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      setCount(0);
      setLoaded(false);
      setStreamConnected(false);
      streamConnectedRef.current = false;
      // Limpa cursors de DM no logout / troca de conta, pra que a próxima
      // sessão não tente gap-fill com cursor de outro usuário.
      conversationCursors.clear();
      return;
    }

    // Initial unread fetch so the badge has a value before the first event arrives.
    void refresh();

    // Task #222 — Single-transport policy: o servidor decide via
    // env DM_REALTIME e o cliente respeita. `notification:*` continua
    // vindo por SSE em ambos os casos — escopo separado (Task #224).
    const useSocket = dmTransport === "socket";
    let lastConnectedFireAt = 0;
    let es: EventSource | null = null;
    try {
      // Same-origin: cookies (session_token) are sent automatically.
      es = new EventSource("/api/messages/stream");
    } catch {
      es = null;
    }

    if (es) {
      const handleConnected = () => {
        if (!mountedRef.current) return;
        if (!useSocket) {
          streamConnectedRef.current = true;
          setStreamConnected(true);
        }
        const now = Date.now();
        if (now - lastConnectedFireAt < 2_000) return;
        lastConnectedFireAt = now;
        // On (re)connect we MUST resync authoritative state, because any
        // events that fired while the channel was down were lost.
        void refresh();
        broadcast({ type: "connected", payload: {} });
      };
      const handleError = () => {
        if (!useSocket) {
          streamConnectedRef.current = false;
          setStreamConnected(false);
        }
      };
      const handleNotificationNew = (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as NotificationPayload;
          broadcast({ type: "notification:new", payload: data });
        } catch {
          /* ignore */
        }
      };
      const handleNotificationUnread = (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as { unread: number };
          broadcast({ type: "notification:unread", payload: data });
        } catch {
          /* ignore */
        }
      };

      es.addEventListener("connected", handleConnected);
      es.addEventListener("error", handleError);
      // Notifications são SEMPRE via SSE (não migram nesta task).
      es.addEventListener("notification:new", handleNotificationNew);
      es.addEventListener("notification:unread", handleNotificationUnread);

      // DM via SSE só quando dmTransport === "sse".
      if (!useSocket) {
        const handleMessageNew = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as MessageNewPayload;
            broadcast({ type: "message:new", payload: data });
          } catch {
            /* ignore */
          }
        };
        const handleMessageRead = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as MessageReadPayload;
            broadcast({ type: "message:read", payload: data });
          } catch {
            /* ignore */
          }
        };
        const handleUnreadChanged = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as UnreadChangedPayload;
            if (typeof data.count === "number") {
              setCount(data.count);
              setLoaded(true);
            }
            broadcast({ type: "unread:changed", payload: data });
          } catch {
            /* ignore */
          }
        };
        const handleTyping = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as TypingPayload;
            broadcast({ type: "typing", payload: data });
          } catch {
            /* ignore */
          }
        };
        const handleListening = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as ListeningPayload;
            broadcast({ type: "listening", payload: data });
          } catch {
            /* ignore */
          }
        };
        const handleMessageReaction = (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data) as MessageReactionPayload;
            broadcast({ type: "message:reaction", payload: data });
          } catch {
            /* ignore */
          }
        };

        es.addEventListener("message:new", handleMessageNew);
        es.addEventListener("message:read", handleMessageRead);
        es.addEventListener("unread:changed", handleUnreadChanged);
        es.addEventListener("typing", handleTyping);
        es.addEventListener("listening", handleListening);
        es.addEventListener("message:reaction", handleMessageReaction);
      }
    }

    // Task #222 — Socket.IO só quando dmTransport === "socket". Quando
    // SSE é o ativo, nem conectamos pra não desperdiçar handshake.
    let socket: ReturnType<typeof getSocket> | null = null;
    if (useSocket) {
      socket = getSocket();
      const onSocketConnect = () => {
        if (!mountedRef.current) return;
        streamConnectedRef.current = true;
        setStreamConnected(true);
        const now = Date.now();
        if (now - lastConnectedFireAt < 2_000) return;
        lastConnectedFireAt = now;
        void refresh();
        broadcast({ type: "connected", payload: {} });
      };
      const onSocketDisconnect = () => {
        streamConnectedRef.current = false;
        setStreamConnected(false);
      };
      const onSocketMessageNew = (payload: MessageNewPayload) =>
        broadcast({ type: "message:new", payload });
      const onSocketMessageRead = (payload: MessageReadPayload) =>
        broadcast({ type: "message:read", payload });
      const onSocketUnreadChanged = (payload: UnreadChangedPayload) => {
        if (typeof payload?.count === "number") {
          setCount(payload.count);
          setLoaded(true);
        }
        broadcast({ type: "unread:changed", payload });
      };
      const onSocketTyping = (payload: TypingPayload) =>
        broadcast({ type: "typing", payload });
      const onSocketListening = (payload: ListeningPayload) =>
        broadcast({ type: "listening", payload });
      const onSocketReaction = (payload: MessageReactionPayload) =>
        broadcast({ type: "message:reaction", payload });
      const onConversationSync = (payload: { conversation_id: number; last_event_id: number }) => {
        if (!mountedRef.current) return;
        void fillGap(payload.conversation_id, payload.last_event_id);
      };

      socket.on("connect", onSocketConnect);
      socket.on("disconnect", onSocketDisconnect);
      socket.on("message:new", onSocketMessageNew);
      socket.on("message:read", onSocketMessageRead);
      socket.on("unread:changed", onSocketUnreadChanged);
      // Servidor emite `message:typing` no socket (era `typing` no SSE).
      socket.on("message:typing", onSocketTyping);
      socket.on("listening", onSocketListening);
      socket.on("message:reaction", onSocketReaction);
      socket.on("conversation:sync", onConversationSync);
      if (socket.connected) onSocketConnect();
    }

    // Fallback poll: only fires when the active transport is down.
    const fallbackInterval = window.setInterval(() => {
      if (streamConnectedRef.current) return;
      if (document.visibilityState !== "visible") return;
      void refresh();
    }, FALLBACK_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !streamConnectedRef.current) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (es) es.close();
      if (socket) disconnectSocket();
      streamConnectedRef.current = false;
      setStreamConnected(false);
    };
  }, [user, dmTransport, refresh, broadcast, fillGap]);

  return createElement(
    UnreadMessagesContext.Provider,
    { value: { count, loaded, refresh, subscribe, streamConnected } },
    children
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    return {
      count: 0,
      loaded: false,
      refresh: async () => {},
      subscribe: () => () => {},
      streamConnected: false,
    } satisfies UnreadMessagesContextValue;
  }
  return ctx;
}
