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
  /** True when the realtime SSE channel is currently open. */
  streamConnected: boolean;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const mountedRef = useRef(true);
  const subscribersRef = useRef<Set<StreamHandler>>(new Set());
  const streamConnectedRef = useRef(false);
  // Task #222 — Rastreamos os dois transportes separadamente para
  // recomputar `streamConnected = sse || socket`. Sem isso, se o
  // socket cai e o SSE NÃO estiver vivo, ficaríamos com flag
  // "conectado" antigo e o fallback poll não dispararia.
  const sseConnectedRef = useRef(false);
  const socketConnectedRef = useRef(false);
  const recomputeConnected = useCallback(() => {
    const next = sseConnectedRef.current || socketConnectedRef.current;
    streamConnectedRef.current = next;
    if (mountedRef.current) setStreamConnected(next);
  }, []);

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
    for (const h of Array.from(subscribersRef.current)) {
      try {
        h(event);
      } catch {
        // Ignore subscriber errors.
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      setCount(0);
      setLoaded(false);
      setStreamConnected(false);
      streamConnectedRef.current = false;
      return;
    }

    // Initial unread fetch so the badge has a value before the first event arrives.
    void refresh();

    // Task #222 — Compartilhado entre SSE e Socket.IO. Se um já fez o
    // "force resync" no último ~2s, o outro vira no-op pra evitar duplo
    // GET /unread-count + duplo refetch nos consumers do `connected`.
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
        sseConnectedRef.current = true;
        recomputeConnected();
        const now = Date.now();
        if (now - lastConnectedFireAt < 2_000) return;
        lastConnectedFireAt = now;
        // On (re)connect we MUST resync authoritative state, because any
        // events that fired while the SSE channel was down were lost
        // (the server does not buffer / replay). Refresh the unread total
        // here and let subscribers (e.g. ConversasPage) refetch their own
        // state via the broadcast below. Subscribers should treat 'connected'
        // as a "force resync" signal — it fires on the first open AND on
        // every successful reconnect after an EventSource error.
        void refresh();
        broadcast({ type: "connected", payload: {} });
      };
      const handleMessageNew = (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as MessageNewPayload;
          broadcast({ type: "message:new", payload: data });
        } catch {
          /* ignore malformed payload */
        }
      };
      const handleMessageRead = (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as MessageReadPayload;
          broadcast({ type: "message:read", payload: data });
        } catch {
          /* ignore malformed payload */
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
      const handleError = () => {
        // EventSource will auto-reconnect with built-in backoff. We just
        // flip the flag so the fallback poll kicks in until we recover.
        sseConnectedRef.current = false;
        recomputeConnected();
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
      es.addEventListener("message:new", handleMessageNew);
      es.addEventListener("message:read", handleMessageRead);
      es.addEventListener("unread:changed", handleUnreadChanged);
      es.addEventListener("typing", handleTyping);
      es.addEventListener("listening", handleListening);
      es.addEventListener("message:reaction", handleMessageReaction);
      es.addEventListener("notification:new", handleNotificationNew);
      es.addEventListener("notification:unread", handleNotificationUnread);
      es.addEventListener("error", handleError);
    }

    // Task #222 — Socket.IO em paralelo ao SSE. Mesmos nomes de evento,
    // mesmo payload. Dedup acontece downstream: ConversasPage já checa
    // `prev.some((m) => m.id === message.id)` antes de adicionar. Quando
    // ambos transportes estão saudáveis, o socket geralmente chega
    // primeiro (UDP-like) e o SSE vira no-op. Se o socket cair, SSE
    // mantém a entrega.
    const socket = getSocket();
    const onSocketConnect = () => {
      if (!mountedRef.current) return;
      socketConnectedRef.current = true;
      recomputeConnected();
      const now = Date.now();
      if (now - lastConnectedFireAt < 2_000) return;
      lastConnectedFireAt = now;
      void refresh();
      broadcast({ type: "connected", payload: {} });
    };
    const onSocketDisconnect = () => {
      socketConnectedRef.current = false;
      recomputeConnected();
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

    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("message:new", onSocketMessageNew);
    socket.on("message:read", onSocketMessageRead);
    socket.on("unread:changed", onSocketUnreadChanged);
    socket.on("typing", onSocketTyping);
    socket.on("listening", onSocketListening);
    socket.on("message:reaction", onSocketReaction);
    if (socket.connected) onSocketConnect();

    // Fallback poll: only fires when the realtime channel is down.
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
      // Desconecta o socket no logout/desmontagem do provider. Logado
      // de novo, getSocket() cria nova instância.
      disconnectSocket();
      streamConnectedRef.current = false;
      setStreamConnected(false);
    };
  }, [user, refresh, broadcast]);

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
