import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../AuthContext";

// Slow safety-net poll used only when the realtime stream is NOT connected
// (e.g. proxy stripped SSE, browser blocked it, or transient network drop).
const FALLBACK_POLL_INTERVAL_MS = 60_000;

interface UnreadCountResponse {
  count: number;
}

export type MessageStreamEvent =
  | { type: "message:new"; payload: MessageNewPayload }
  | { type: "message:read"; payload: MessageReadPayload }
  | { type: "unread:changed"; payload: UnreadChangedPayload }
  | { type: "typing"; payload: TypingPayload }
  | { type: "notification:new"; payload: NotificationPayload }
  | { type: "notification:unread"; payload: { unread: number } }
  | { type: "connected"; payload: Record<string, never> };

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
        streamConnectedRef.current = true;
        setStreamConnected(true);
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
      const handleError = () => {
        // EventSource will auto-reconnect with built-in backoff. We just
        // flip the flag so the fallback poll kicks in until we recover.
        streamConnectedRef.current = false;
        if (mountedRef.current) setStreamConnected(false);
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
      es.addEventListener("notification:new", handleNotificationNew);
      es.addEventListener("notification:unread", handleNotificationUnread);
      es.addEventListener("error", handleError);
    }

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
