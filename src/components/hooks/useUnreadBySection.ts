import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../AuthContext";
import { useUnreadMessages, type MessageStreamEvent } from "./useUnreadMessages";

// Task #129 — kinds que somam pro badge da seção Comunidade. Mantém em
// sync com `COMMUNITY_NOTIFICATION_KINDS` do servidor.
const COMMUNITY_KINDS = new Set(["class_post", "class_interest", "post_moderated"]);

interface UnreadBySection {
  messages: number;
  community: number;
}

interface UnreadBySectionResponse extends UnreadBySection {}

interface UnreadBySectionContextValue {
  messages: number;
  community: number;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const UnreadBySectionContext = createContext<UnreadBySectionContextValue | null>(null);

export function UnreadBySectionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // `useUnreadMessages` é a fonte ÚNICA de verdade do contador de DMs:
  // ele já escuta `unread:changed` via Socket.IO `/dm` e devolve o
  // número autoritativo. Aqui só mantemos `community` localmente — o
  // badge da nav usa `messagesFromHook` direto. Evita a race em que um
  // refresh() antigo respondia e sobrescrevia um valor mais novo do socket.
  const { subscribe, count: messagesFromHook } = useUnreadMessages();
  const [community, setCommunity] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const res = await api.get<UnreadBySectionResponse>("/api/notifications/unread-by-section");
    if (!mountedRef.current) return;
    if (res.success && res.data) {
      setCommunity(res.data.community);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      setCommunity(0);
      setLoaded(false);
      return;
    }

    void refresh();

    const unsub = subscribe((event: MessageStreamEvent) => {
      if (!mountedRef.current) return;
      if (event.type === "connected") {
        // Force resync no (re)connect — eventos perdidos enquanto o socket
        // estava caído não são repostos pelo servidor.
        void refresh();
        return;
      }
      if (event.type === "notification:new") {
        if (COMMUNITY_KINDS.has(event.payload.kind)) {
          setCommunity((c) => c + 1);
        }
        return;
      }
      if (event.type === "notification:unread") {
        // O total agregado mudou (ex.: marcar todas como lidas). Ressincroniza
        // pra obter o split por seção autoritativo do servidor.
        void refresh();
        return;
      }
    });

    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, [user, subscribe, refresh]);

  return createElement(
    UnreadBySectionContext.Provider,
    { value: { messages: messagesFromHook, community, loaded, refresh } },
    children,
  );
}

export function useUnreadBySection(): UnreadBySectionContextValue {
  const ctx = useContext(UnreadBySectionContext);
  if (!ctx) {
    return { messages: 0, community: 0, loaded: false, refresh: async () => {} };
  }
  return ctx;
}
