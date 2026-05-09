import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface TrailMini {
  id: number;
  slug: string;
  title: string;
  monthly_price_cents: number;
}

// Task #130 — Renderiza um aviso/CTA quando o backend devolveu 402
// TRAIL_PAYMENT_REQUIRED. Busca a trilha pra mostrar título/preço e
// linka pro detalhe (onde o checkout acontece). Pode ser usado inline
// dentro de turmas ou como bloqueador full-page.
export function TrailPaywall({
  trailId,
  variant = "card",
}: {
  trailId: number;
  variant?: "card" | "block";
}) {
  const [trail, setTrail] = useState<TrailMini | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await api.get<{ trails: TrailMini[] }>(`/api/trails`);
      if (r.success && r.data) {
        setTrail(r.data.trails.find((t) => t.id === trailId) || null);
      }
    })();
  }, [trailId]);

  const cls = variant === "block"
    ? "rounded-2xl border p-8 text-center"
    : "rounded-2xl border p-5";

  return (
    <div
      className={cls}
      style={{ borderColor: "var(--rayo-terra-300)", background: "var(--rayo-terra-50)" }}
    >
      <p className="text-sm mb-2" style={{ color: "var(--rayo-ink-700)" }}>
        Esta turma faz parte de uma trilha paga.
      </p>
      {trail && (
        <p className="text-base mb-3" style={{ color: "var(--rayo-ink-900)" }}>
          {trail.title} · a partir de{" "}
          {(trail.monthly_price_cents / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          /mês
        </p>
      )}
      <a
        href={trail ? `/trilhas/${trail.slug}` : "/trilhas"}
        className="inline-block rounded-xl px-4 py-2.5 text-sm"
        style={{ background: "var(--rayo-terra-500)", color: "white" }}
      >
        Ver planos da trilha
      </a>
    </div>
  );
}
