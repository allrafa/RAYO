import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../lib/api";

const POLL_INTERVAL_MS = 20_000;

interface UnreadCountResponse {
  count: number;
}

interface UnreadMessagesContextValue {
  count: number;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null);

export function UnreadMessagesProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const res = await api.get<UnreadCountResponse>("/api/messages/unread-count");
    if (!mountedRef.current) return;
    if (res.success && res.data) {
      setCount(res.data.count);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    void refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  return createElement(UnreadMessagesContext.Provider, { value: { count, loaded, refresh } }, children);
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    return { count: 0, loaded: false, refresh: async () => {} };
  }
  return ctx;
}
