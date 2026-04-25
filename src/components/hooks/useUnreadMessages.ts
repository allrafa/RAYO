import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../AuthContext";

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

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
    // Only poll when authenticated. Avoids 401 noise and unnecessary
    // traffic before login / after logout.
    if (!user) {
      setCount(0);
      setLoaded(false);
      return;
    }

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
  }, [user, refresh]);

  return createElement(UnreadMessagesContext.Provider, { value: { count, loaded, refresh } }, children);
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    return { count: 0, loaded: false, refresh: async () => {} };
  }
  return ctx;
}
