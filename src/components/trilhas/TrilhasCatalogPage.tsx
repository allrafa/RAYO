import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface TrailListItem {
  id: number;
  slug: string;
  title: string;
  life_stage: string;
  description: string | null;
  hero_url: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  course_count: number;
  user_has_access: boolean;
  trial_days: number;
  trial_eligible: boolean;
}

const STAGE_LABEL: Record<string, string> = {
  solteiro: "Solteiro",
  namoro: "Namoro",
  noivos: "Noivos",
  casados: "Casados",
  pais: "Pais",
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TrilhasCatalogPage() {
  const [trails, setTrails] = useState<TrailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await api.get<{ trails: TrailListItem[] }>("/api/trails");
      if (r.success && r.data) setTrails(r.data.trails);
      else setErr(r.error?.message || "Erro ao carregar trilhas");
      setLoading(false);
    })();
  }, []);

  return (
    <div className="ra-page min-h-screen pb-24 lg:pb-8">
      <div className="mx-auto max-w-md lg:max-w-6xl px-4 lg:px-8 pt-6">
        <header className="mb-6">
          <h1 className="text-2xl lg:text-3xl mb-2" style={{ color: "var(--rayo-ink-900)" }}>
            Trilhas RAYO
          </h1>
          <p className="text-sm" style={{ color: "var(--rayo-ink-500)" }}>
            Cinco trilhas, uma para cada momento de vida. Assine a sua e tenha acesso completo a turmas, comunidade e conteúdo curados.
          </p>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trails.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl overflow-hidden border bg-white shadow-sm flex flex-col"
              style={{ borderColor: "var(--rayo-ink-100)" }}
            >
              {t.hero_url ? (
                <img src={t.hero_url} alt={t.title} className="w-full h-40 object-cover" />
              ) : (
                <div
                  className="w-full h-40"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--rayo-terra-300), var(--rayo-terra-500))",
                  }}
                />
              )}
              <div className="p-4 flex-1 flex flex-col">
                <span
                  className="inline-block text-xs uppercase tracking-wider mb-2"
                  style={{ color: "var(--rayo-terra-600)" }}
                >
                  {STAGE_LABEL[t.life_stage] || t.life_stage}
                </span>
                <h2 className="text-lg mb-2" style={{ color: "var(--rayo-ink-900)" }}>
                  {t.title}
                </h2>
                {t.description && (
                  <p className="text-sm mb-3 line-clamp-3" style={{ color: "var(--rayo-ink-500)" }}>
                    {t.description}
                  </p>
                )}
                <div className="mt-auto">
                  {!t.user_has_access && t.trial_days > 0 && t.trial_eligible && (
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--rayo-terra-700)", fontWeight: 600 }}
                    >
                      {t.trial_days} dias grátis
                    </p>
                  )}
                  <p className="text-xs mb-2" style={{ color: "var(--rayo-ink-400)" }}>
                    {t.course_count} {t.course_count === 1 ? "turma" : "turmas"} ·{" "}
                    {!t.user_has_access && t.trial_days > 0 && t.trial_eligible ? "depois " : ""}
                    {formatBRL(t.monthly_price_cents)}/mês
                  </p>
                  <a
                    href={`/trilhas/${t.slug}`}
                    className="block text-center w-full rounded-xl py-2.5 text-sm"
                    style={{
                      background: t.user_has_access
                        ? "var(--rayo-mist-200)"
                        : "var(--rayo-terra-500)",
                      color: t.user_has_access ? "var(--rayo-ink-700)" : "white",
                    }}
                  >
                    {t.user_has_access ? "Acessar trilha" : "Ver detalhes"}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!loading && trails.length === 0 && !err && (
          <p className="text-sm text-muted-foreground mt-6">Nenhuma trilha disponível ainda.</p>
        )}
      </div>
    </div>
  );
}
