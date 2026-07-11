import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { ensurePushSubscription, isPushSupported } from "../lib/push";
import { enhancedToast } from "./EnhancedToast";

// Banner de ativação de notificações (UX_PLAN.md estrutural — push).
// Aparece na Home quando: navegador suporta, servidor tem push habilitado,
// permissão ainda é "default" e o usuário não dispensou antes. Um toque em
// "Ativar" pede a permissão (gesto do usuário) e inscreve o dispositivo.
// Quando a permissão já foi concedida, re-sincroniza em silêncio.

const DISMISS_KEY = "rayo:push-prompt-dismissed";

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }

    if (Notification.permission === "granted") {
      // Já autorizado: garante a subscription (troca de navegador/login).
      void ensurePushSubscription({ askPermission: false });
      return;
    }
    if (Notification.permission === "default" && !dismissed) {
      // Só mostra o banner se o servidor tiver push habilitado.
      void ensurePushSubscription({ askPermission: false }).then((r) => {
        if (r === "skipped") setVisible(true);
      });
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      const result = await ensurePushSubscription({ askPermission: true });
      if (result === "subscribed") {
        enhancedToast.success({ title: "Notificações ativadas!", haptic: true });
      }
      setVisible(false);
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div
      className="mx-4 mb-4 rounded-xl border p-3 flex items-center gap-3"
      style={{ borderColor: "var(--rayo-sand-300)", background: "var(--rayo-sand-50)" }}
      role="region"
      aria-label="Ativar notificações"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-500)" }}
      >
        <Bell className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ fontWeight: 600, color: "var(--rayo-ink-900)" }}>
          Fique por dentro
        </p>
        <p className="text-xs" style={{ color: "var(--rayo-ink-500)" }}>
          Saiba quando responderem você na comunidade.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="rounded-lg px-3 py-2 text-sm shrink-0"
        style={{ background: "var(--rayo-terra-500)", color: "white", fontWeight: 600 }}
      >
        {busy ? "..." : "Ativar"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar"
        className="p-1 shrink-0"
        style={{ color: "var(--rayo-ink-400)" }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
