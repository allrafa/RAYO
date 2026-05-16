import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "./AppContext";
import { useUnreadMessages, type MessageStreamEvent, type NotificationPayload } from "./hooks/useUnreadMessages";

interface NotificationBellProps {
  onTabChange: (tab: string) => void;
}

interface NotificationsListResponse {
  notifications: NotificationPayload[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

const POLL_FALLBACK_MS = 60_000;

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR");
}

export function NotificationBell({ onTabChange }: NotificationBellProps) {
  const { subscribe, streamConnected } = useUnreadMessages();
  // Task #102 — abrir TurmaShell direto ao clicar numa notificação
  // (`class_post`/`class_interest`). O efeito `rayo-pending-turma` em
  // App.tsx só roda no mount, então quando o sino é clicado durante a
  // sessão temos que setar o curso atual via AppContext na hora.
  const app = useApp();
  // Task #179 — usado pra navegar pra `/conversas/:id` quando o sino é
  // clicado (rota persistente; substitui o stash em sessionStorage).
  const bellNavigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const streamConnectedRef = useRef(false);

  useEffect(() => {
    streamConnectedRef.current = streamConnected;
  }, [streamConnected]);

  const refreshCount = useCallback(async () => {
    const res = await api.get<{ unread: number }>("/api/notifications/unread-count");
    if (res.success && res.data) setUnread(res.data.unread);
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const res = await api.get<NotificationsListResponse>("/api/notifications?limit=10");
    if (res.success && res.data) {
      setItems(res.data.notifications);
      setUnread(res.data.unread);
    }
    setLoading(false);
  }, []);

  // Initial unread fetch + slow fallback poll for when the socket is down.
  useEffect(() => {
    void refreshCount();
    const interval = window.setInterval(() => {
      if (streamConnectedRef.current) return;
      if (document.visibilityState !== "visible") return;
      void refreshCount();
    }, POLL_FALLBACK_MS);
    return () => window.clearInterval(interval);
  }, [refreshCount]);

  // Real-time wiring via the shared Socket.IO `/dm` broadcast.
  useEffect(() => {
    return subscribe((event: MessageStreamEvent) => {
      if (event.type === "notification:new") {
        setItems((prev) => {
          if (prev.some((n) => n.id === event.payload.id)) return prev;
          return [event.payload, ...prev].slice(0, 10);
        });
        setUnread((c) => c + 1);
        return;
      }
      if (event.type === "notification:unread") {
        setUnread(event.payload.unread);
        return;
      }
      if (event.type === "connected") {
        void refreshCount();
      }
    });
  }, [subscribe, refreshCount]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void refreshList();
  };

  const navigateToLink = (link: string | null, kind: string) => {
    // Honor the server-provided `link` first so future notification kinds
    // route correctly without UI changes. Today the messages service emits
    // `/conversas/:id`; we park the target id in sessionStorage (same
    // contract used by App.tsx for /conversas/:id deep links and by
    // PerfilPage for /u/:id) and switch tabs so ConversasPage opens
    // directly on the right thread.
    if (link) {
      const convMatch = link.match(/^\/conversas\/(\d+)\/?$/);
      if (convMatch) {
        // Task #179 — `/conversas/:id` é rota persistente. Navega
        // direto pra URL canônica via react-router (useLocation no
        // ConversasPage reage e abre a conversa). pushState manual
        // NÃO dispara re-render do useLocation — precisa ser navigate.
        bellNavigate(`/conversas/${convMatch[1]}`);
        return;
      }
      const profileMatch = link.match(/^\/u\/(\d+)\/?$/);
      if (profileMatch) {
        try {
          sessionStorage.setItem("rayo-pending-profile", profileMatch[1]);
        } catch {
          /* ignore */
        }
        onTabChange("perfil");
        return;
      }
      // Task #102 — `/turmas/:classId` (interest) ou
      // `/turmas/:classId/post/:postId` (novo post na turma). Em ambos
      // os casos, abre o TurmaShell e, quando há postId, sinaliza para
      // o TurmaCommunityTab destacar o post alvo após carregar a lista.
      const turmaMatch = link.match(/^\/turmas\/(\d+)(?:\/post\/(\d+))?\/?$/);
      if (turmaMatch) {
        const turmaId = Number(turmaMatch[1]);
        // rayo-pending-post é consumido pelo TurmaCommunityTab no
        // mount/load para rolar até o post alvo e destacar.
        if (turmaMatch[2]) {
          try {
            sessionStorage.setItem("rayo-pending-post", turmaMatch[2]);
          } catch {
            /* ignore */
          }
        }
        // Set síncrono via AppContext para abrir o TurmaShell na hora,
        // sem depender do useEffect de mount em App.tsx. Quando o
        // AppContext não existir por qualquer motivo, deixa o stash
        // `rayo-pending-turma` como fallback para o useEffect de mount.
        if (Number.isFinite(turmaId) && turmaId > 0) {
          app.setCurrentCourseId(turmaId);
          app.setIsInCourseDetail(true);
          // Quando o usuário JÁ está dentro da mesma turma, nem
          // setCurrentCourseId nem o stash disparam novo render do
          // useEffect[turmaId] em TurmaShell. Esse evento é o canal
          // independente que força a troca pra aba Comunidade e o
          // highlight do post alvo no TurmaCommunityTab.
          if (turmaMatch[2]) {
            const postId = Number(turmaMatch[2]);
            if (Number.isFinite(postId) && postId > 0) {
              window.dispatchEvent(
                new CustomEvent("rayo:open-turma-post", {
                  detail: { turmaId, postId },
                }),
              );
            }
          }
          // Limpa qualquer stash antigo para não reabrir essa turma
          // num próximo mount/refresh fora do contexto da notificação.
          try {
            sessionStorage.removeItem("rayo-pending-turma");
          } catch {
            /* ignore */
          }
        } else {
          try {
            sessionStorage.setItem("rayo-pending-turma", turmaMatch[1]);
          } catch {
            /* ignore */
          }
        }
        onTabChange("academia");
        return;
      }
    }
    // Fallback by kind for entries without a link.
    if (kind === "message") onTabChange("conversas");
    if (kind === "class_post" || kind === "class_interest") onTabChange("academia");
  };

  const handleClick = async (n: NotificationPayload) => {
    if (!n.read_at) {
      // Optimistic update.
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)));
      setUnread((c) => Math.max(0, c - 1));
      void api.post(`/api/notifications/${n.id}/read`);
    }
    setOpen(false);
    navigateToLink(n.link, n.kind);
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((p) => (p.read_at ? p : { ...p, read_at: new Date().toISOString() })));
    setUnread(0);
    void api.post("/api/notifications/read-all");
  };

  return (
    <div className="rn-notif-wrap" ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="rn-icon-btn"
        onClick={handleToggle}
        aria-label={unread > 0 ? `Notificações (${unread} não lidas)` : "Notificações"}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="rn-icon-btn-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            background: "var(--rayo-sand-50, #fff)",
            color: "var(--rayo-forest-900, #0f172a)",
            border: "1px solid var(--rayo-sand-300, #e5e7eb)",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--rayo-sand-200, #f1f5f9)",
            }}
          >
            <strong style={{ fontSize: 14 }}>Notificações</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--rayo-terra-600, #b45309)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Marcar todas
              </button>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, opacity: 0.7 }}>
                Nada por aqui ainda.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleClick(n)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    border: 0,
                    borderBottom: "1px solid var(--rayo-sand-200, #f1f5f9)",
                    background: n.read_at ? "transparent" : "var(--rayo-sand-100, #f8fafc)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read_at ? 500 : 700 }}>{n.title}</span>
                    <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>{formatRelative(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>{n.body}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
