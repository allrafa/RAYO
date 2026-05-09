import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface SubscriptionRow {
  id: number;
  trail_id: number;
  trail_title: string;
  trail_slug: string;
  status: string;
  interval: "month" | "year" | string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  unpaid: "Não paga",
};

// Task #130 — Lista as assinaturas Stripe do usuário e abre o portal de
// gerenciamento (Stripe Customer Portal) onde ele pode trocar plano,
// atualizar cartão ou cancelar. Renderizada no PerfilPage.
export function MinhasAssinaturasCard() {
  const [subs, setSubs] = useState<SubscriptionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await api.get<{ subscriptions: SubscriptionRow[] }>(
        "/api/billing/subscriptions",
      );
      if (r.success && r.data) setSubs(r.data.subscriptions);
      else setErr(r.error?.message || "Não foi possível carregar suas assinaturas");
      setLoading(false);
    })();
  }, []);

  async function openPortal() {
    setOpening(true);
    const r = await api.post<{ url: string }>("/api/billing/portal");
    setOpening(false);
    if (r.success && r.data?.url) {
      window.location.href = r.data.url;
    } else {
      setErr(r.error?.message || "Não foi possível abrir o painel de assinatura");
    }
  }

  if (loading) return null;
  if (err && !subs) {
    return (
      <div
        className="rounded-2xl border p-4 mb-4"
        style={{ borderColor: "var(--rayo-ink-100)", background: "var(--rayo-sand-50)" }}
      >
        <p className="text-sm text-destructive">{err}</p>
      </div>
    );
  }
  if (!subs || subs.length === 0) {
    return (
      <div
        className="rounded-2xl border p-4 mb-4"
        style={{ borderColor: "var(--rayo-ink-100)", background: "var(--rayo-sand-50)" }}
      >
        <h3 className="text-sm mb-1" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
          Minhas assinaturas
        </h3>
        <p className="text-sm mb-3" style={{ color: "var(--rayo-ink-500)" }}>
          Você ainda não assinou nenhuma trilha paga.
        </p>
        <a
          href="/trilhas"
          className="inline-block rounded-xl px-4 py-2 text-sm"
          style={{ background: "var(--rayo-terra-500)", color: "white" }}
        >
          Ver trilhas RAYO
        </a>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4 mb-4"
      style={{ borderColor: "var(--rayo-ink-100)", background: "var(--rayo-sand-50)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
          Minhas assinaturas
        </h3>
        <button
          type="button"
          onClick={() => void openPortal()}
          disabled={opening}
          className="text-xs underline"
          style={{ color: "var(--rayo-terra-700)", opacity: opening ? 0.6 : 1 }}
        >
          {opening ? "Abrindo…" : "Gerenciar"}
        </button>
      </div>
      <ul className="space-y-2">
        {subs.map((s) => {
          const periodEnd = s.current_period_end
            ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
            : null;
          return (
            <li
              key={s.id}
              className="rounded-lg p-3"
              style={{ background: "white", border: "1px solid var(--rayo-ink-100)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <a
                  href={`/trilhas/${s.trail_slug}`}
                  className="text-sm"
                  style={{ color: "var(--rayo-ink-900)" }}
                >
                  {s.trail_title}
                </a>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background:
                      s.status === "active" || s.status === "trialing"
                        ? "var(--rayo-terra-50)"
                        : "var(--rayo-mist-200)",
                    color: "var(--rayo-ink-700)",
                  }}
                >
                  {STATUS_LABEL[s.status] || s.status}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--rayo-ink-400)" }}>
                {s.interval === "year" ? "Anual" : "Mensal"}
                {periodEnd && (s.cancel_at_period_end
                  ? ` · termina em ${periodEnd}`
                  : ` · próxima cobrança em ${periodEnd}`)}
              </p>
            </li>
          );
        })}
      </ul>
      {err && <p className="text-xs text-destructive mt-2">{err}</p>}
    </div>
  );
}
