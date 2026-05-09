import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface UserSubscription {
  id: number;
  trail_id: number;
  trail_slug: string;
  trail_title: string;
  status: string;
  interval: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function TrilhaSucessoPage() {
  const [slug, setSlug] = useState<string | null>(null);
  // Task #140 — pollar /api/billing/subscriptions por alguns segundos pra
  // refletir o status real (trialing vs active) — o webhook normalmente chega
  // em segundos. Não bloqueia a UI; mostramos a mensagem genérica enquanto
  // não chega.
  const [sub, setSub] = useState<UserSubscription | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("slug");
    setSlug(s);

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;
    async function poll() {
      if (cancelled) return;
      attempts += 1;
      const r = await api.get<{ subscriptions: UserSubscription[] }>("/api/billing/subscriptions");
      if (!cancelled && r.success && r.data) {
        const match = s
          ? r.data.subscriptions.find((x) => x.trail_slug === s)
          : r.data.subscriptions[0];
        if (match) {
          setSub(match);
          return;
        }
      }
      if (!cancelled && attempts < maxAttempts) {
        setTimeout(poll, 1500);
      }
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const isTrial = sub?.status === "trialing";
  const trialEnd = isTrial ? formatDate(sub?.current_period_end ?? null) : null;

  return (
    <div className="ra-page min-h-screen pb-24 lg:pb-8 flex items-center justify-center px-4">
      <div
        className="rounded-2xl border p-8 max-w-md w-full text-center"
        style={{ borderColor: "var(--rayo-mist-300)", background: "white" }}
      >
        <div
          className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--rayo-terra-50)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ color: "var(--rayo-terra-600)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-xl mb-2" style={{ color: "var(--rayo-ink-900)" }}>
          {isTrial ? "Seu período grátis começou!" : "Assinatura confirmada!"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--rayo-ink-500)" }}>
          {isTrial
            ? trialEnd
              ? `Você tem acesso completo até ${trialEnd}. Só vamos cobrar depois dessa data — cancele quando quiser pelo painel de assinatura.`
              : "Você tem acesso completo durante o período grátis. Cancele quando quiser pelo painel de assinatura, sem cobrança."
            : "Em alguns segundos sua trilha estará liberada. Recebemos a confirmação direto do Stripe e estamos sincronizando seu acesso."}
        </p>
        <div className="flex flex-col gap-2">
          {slug ? (
            <a
              href={`/trilhas/${slug}`}
              className="rounded-xl py-3 text-sm"
              style={{ background: "var(--rayo-terra-500)", color: "white" }}
            >
              Voltar para a trilha
            </a>
          ) : (
            <a
              href="/trilhas"
              className="rounded-xl py-3 text-sm"
              style={{ background: "var(--rayo-terra-500)", color: "white" }}
            >
              Ver minhas trilhas
            </a>
          )}
          <a href="/" className="text-sm underline text-muted-foreground py-2">
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
