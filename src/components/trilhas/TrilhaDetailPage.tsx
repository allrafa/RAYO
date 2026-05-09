import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface TrailDetail {
  id: number;
  slug: string;
  title: string;
  life_stage: string;
  description: string | null;
  hero_url: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  user_has_access: boolean;
  courses: Array<{ id: number; title: string; thumbnail: string | null; subtitle: string | null }>;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TrilhaDetailPage({ slug }: { slug: string }) {
  // Detecta sessão via /api/auth/me (sem depender de AuthProvider — esta
  // página roda na PublicShell pra que visitantes anônimos vejam o pricing).
  const [hasSession, setHasSession] = useState(false);
  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [trailR, meR] = await Promise.all([
        api.get<{ trail: TrailDetail }>(`/api/trails/${encodeURIComponent(slug)}`),
        api.get<{ user: { id: number } | null }>("/api/auth/me"),
      ]);
      if (trailR.success && trailR.data) setTrail(trailR.data.trail);
      else setErr(trailR.error?.message || "Trilha não encontrada");
      setHasSession(!!(meR.success && meR.data?.user));
      setLoading(false);
    })();
  }, [slug]);

  async function handleSubscribe() {
    if (!hasSession) {
      // Manda pra login com retorno pra esta página.
      window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    const r = await api.post<{ url: string }>(
      `/api/trails/${encodeURIComponent(slug)}/checkout`,
      { interval },
    );
    setBusy(false);
    if (r.success && r.data?.url) {
      window.location.href = r.data.url;
    } else {
      setErr(r.error?.message || "Não foi possível iniciar o checkout");
    }
  }

  if (loading) return <p className="p-8 text-sm text-muted-foreground">Carregando…</p>;
  if (!trail) return <p className="p-8 text-sm text-destructive">{err || "Trilha não encontrada"}</p>;

  const monthly = trail.monthly_price_cents;
  const yearly = trail.yearly_price_cents;
  // Discount calculado: economia anual vs 12× mensal.
  const yearlyEquivalentMonthly = yearly > 0 ? yearly / 12 : 0;
  const discountPct = monthly > 0 && yearly > 0
    ? Math.round((1 - yearly / (monthly * 12)) * 100)
    : 0;

  return (
    <div className="ra-page min-h-screen pb-24 lg:pb-8">
      {trail.hero_url && (
        <div className="w-full h-56 lg:h-72 overflow-hidden">
          <img src={trail.hero_url} alt={trail.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-md lg:max-w-4xl px-4 lg:px-8 pt-6">
        <a href="/trilhas" className="text-sm underline text-muted-foreground mb-4 inline-block">
          ← Todas as trilhas
        </a>
        <h1 className="text-2xl lg:text-3xl mb-2" style={{ color: "var(--rayo-ink-900)" }}>
          {trail.title}
        </h1>
        {trail.description && (
          <p className="text-sm lg:text-base mb-6" style={{ color: "var(--rayo-ink-600)" }}>
            {trail.description}
          </p>
        )}

        {trail.user_has_access ? (
          <div
            className="rounded-2xl border p-5 mb-6"
            style={{ borderColor: "var(--rayo-mist-300)", background: "var(--rayo-mist-100)" }}
          >
            <p className="text-sm mb-2" style={{ color: "var(--rayo-ink-700)" }}>
              Você já tem assinatura ativa nesta trilha. As turmas abaixo estão liberadas.
            </p>
            <button
              type="button"
              onClick={async () => {
                const r = await api.post<{ url: string }>("/api/billing/portal");
                if (r.success && r.data?.url) window.location.href = r.data.url;
              }}
              className="text-sm underline"
              style={{ color: "var(--rayo-terra-700)" }}
            >
              Gerenciar assinatura
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border p-5 mb-6"
            style={{ borderColor: "var(--rayo-ink-100)", background: "white" }}
          >
            <div className="flex gap-3 mb-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={interval === "month"}
                onClick={() => setInterval("month")}
                className="flex-1 rounded-xl py-3 text-sm border"
                style={{
                  borderColor: interval === "month" ? "var(--rayo-terra-500)" : "var(--rayo-ink-100)",
                  background: interval === "month" ? "var(--rayo-terra-50)" : "white",
                  color: "var(--rayo-ink-900)",
                }}
              >
                <div>Mensal</div>
                <div className="text-lg" style={{ color: "var(--rayo-terra-700)" }}>{formatBRL(monthly)}</div>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={interval === "year"}
                onClick={() => setInterval("year")}
                className="flex-1 rounded-xl py-3 text-sm border"
                style={{
                  borderColor: interval === "year" ? "var(--rayo-terra-500)" : "var(--rayo-ink-100)",
                  background: interval === "year" ? "var(--rayo-terra-50)" : "white",
                  color: "var(--rayo-ink-900)",
                }}
              >
                <div>
                  Anual{" "}
                  {discountPct > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded ml-1"
                      style={{ background: "var(--rayo-terra-500)", color: "white" }}
                    >
                      -{discountPct}%
                    </span>
                  )}
                </div>
                <div className="text-lg" style={{ color: "var(--rayo-terra-700)" }}>
                  {formatBRL(yearlyEquivalentMonthly)}/mês
                </div>
                <div className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                  {formatBRL(yearly)} cobrados anualmente
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm"
              style={{ background: "var(--rayo-terra-500)", color: "white", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "Abrindo checkout…" : hasSession ? "Assinar agora" : "Entrar para assinar"}
            </button>
            <p className="text-xs mt-3 text-center" style={{ color: "var(--rayo-ink-400)" }}>
              Cancele quando quiser pelo painel de assinatura. Pagamento seguro via Stripe.
            </p>
            {err && <p className="text-sm text-destructive mt-3">{err}</p>}
          </div>
        )}

        <h2 className="text-lg mb-3" style={{ color: "var(--rayo-ink-900)" }}>
          Turmas incluídas
        </h2>
        {trail.courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma turma vinculada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {trail.courses.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{ borderColor: "var(--rayo-ink-100)", background: "white" }}
              >
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-lg"
                    style={{ background: "var(--rayo-mist-200)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--rayo-ink-900)" }}>{c.title}</p>
                  {c.subtitle && (
                    <p className="text-xs truncate" style={{ color: "var(--rayo-ink-400)" }}>{c.subtitle}</p>
                  )}
                </div>
                {trail.user_has_access && (
                  <a
                    href={`/turmas/${c.id}`}
                    className="text-xs underline"
                    style={{ color: "var(--rayo-terra-700)" }}
                  >
                    Abrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
