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
  trial_days: number;
  trial_eligible: boolean;
  courses: Array<{ id: number; title: string; thumbnail: string | null; subtitle: string | null }>;
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

const FAQ_ITEMS = (trialDays: number) => [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. No plano mensal você cancela a qualquer momento e mantém o acesso até o fim do período já pago. Sem multa, sem letra miúda.",
  },
  {
    q: "Por quanto tempo tenho acesso?",
    a: "Enquanto a assinatura estiver ativa, todo o conteúdo da trilha fica liberado — você avança no seu ritmo.",
  },
  {
    q: "Funciona para quem tem pouco tempo?",
    a: "Sim. As aulas são curtas e você avança no ritmo que conseguir — sem prazo para concluir.",
  },
  {
    q: "E se eu não gostar?",
    a: trialDays > 0
      ? `Você começa com ${trialDays} dias grátis. Se não for para você, é só cancelar antes do fim do período — sem cobrança.`
      : "Você pode cancelar a assinatura a qualquer momento pelo painel, sem burocracia.",
  },
];

export function TrilhaDetailPage({ slug }: { slug: string }) {
  // Detecta sessão via /api/auth/me (sem depender de AuthProvider — esta
  // página roda na PublicShell pra que visitantes anônimos vejam o pricing).
  const [hasSession, setHasSession] = useState(false);
  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [interval, setIntervalState] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    void (async () => {
      const [trailR, meR] = await Promise.all([
        api.get<{ trail: TrailDetail }>(`/api/trails/${encodeURIComponent(slug)}`),
        api.get<{ user: { id: number } | null }>("/api/auth/me"),
      ]);
      if (trailR.success && trailR.data) {
        const t = trailR.data.trail;
        setTrail(t);
        // Default no plano anual quando existir (espelha o mockup); cai pra
        // mensal se a trilha só tiver preço mensal — evita mandar um interval
        // inválido pro checkout do Stripe.
        setIntervalState(t.yearly_price_cents > 0 ? "year" : "month");
      } else {
        setErr(trailR.error?.message || "Trilha não encontrada");
      }
      setHasSession(!!(meR.success && meR.data?.user));
      setLoading(false);
    })();
  }, [slug]);

  async function handleSubscribe() {
    if (!trail) return;
    if (!hasSession) {
      // Manda pra login com retorno pra esta página.
      window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const priceCents = interval === "year" ? trail.yearly_price_cents : trail.monthly_price_cents;
    if (priceCents <= 0) {
      setErr("Plano indisponível para esta trilha. Escolha outro plano.");
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

  async function handleManage() {
    const r = await api.post<{ url: string }>("/api/billing/portal");
    if (r.success && r.data?.url) window.location.href = r.data.url;
  }

  if (loading) {
    return (
      <div className="ct-page">
        <div className="ct-loading">Carregando…</div>
      </div>
    );
  }
  if (!trail) {
    return (
      <div className="ct-page">
        <div className="ct-loading">{err || "Trilha não encontrada"}</div>
      </div>
    );
  }

  const monthly = trail.monthly_price_cents;
  const yearly = trail.yearly_price_cents;
  const yearlyEquivalentMonthly = yearly > 0 ? yearly / 12 : 0;
  // Desconto vem só do backend (preços reais): economia anual vs 12× mensal.
  const discountPct = monthly > 0 && yearly > 0
    ? Math.round((1 - yearly / (monthly * 12)) * 100)
    : 0;
  const annualSavingsCents = monthly > 0 && yearly > 0 ? monthly * 12 - yearly : 0;

  const phaseLabel = STAGE_LABEL[trail.life_stage] || trail.life_stage;
  const courseCount = trail.courses.length;
  const trialActive = trail.trial_days > 0 && trail.trial_eligible;
  const totalLabel = interval === "year"
    ? `${formatBRL(yearly)}/ano`
    : `${formatBRL(monthly)}/mês`;
  // Data exata da 1ª cobrança (hoje + dias de trial) — mostrada antes de
  // pagar pra eliminar o medo de "cobrança escondida" (UX_PLAN.md J3).
  const firstChargeDate = new Date(Date.now() + trail.trial_days * 24 * 60 * 60 * 1000)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const faqItems = FAQ_ITEMS(trail.trial_days);

  return (
    <div className="ct-page">
      {/* TOPBAR */}
      <div className="ct-topbar">
        <a href="/trilhas" className="ct-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Trilhas
        </a>
        <div className="ct-crumb">
          <span className="ct-crumb-eyebrow">Trilha · {phaseLabel}</span>
          <span className="ct-crumb-title">{trail.title}</span>
        </div>
        <div className="ct-brand-mini">
          <div className="ct-brand-mark">
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="6" fill="var(--rayo-sand-50)" />
              <g stroke="var(--rayo-sand-50)" strokeWidth="1.8" strokeLinecap="round">
                <line x1="18" y1="2" x2="18" y2="7" /><line x1="18" y1="29" x2="18" y2="34" />
                <line x1="2" y1="18" x2="7" y2="18" /><line x1="29" y1="18" x2="34" y2="18" />
                <line x1="6.5" y1="6.5" x2="10" y2="10" /><line x1="26" y1="26" x2="29.5" y2="29.5" />
                <line x1="6.5" y1="29.5" x2="10" y2="26" /><line x1="26" y1="10" x2="29.5" y2="6.5" />
              </g>
            </svg>
          </div>
          <span className="ct-brand-name">RAYO</span>
        </div>
      </div>

      <div className="ct-wrap">
        {/* ===== LEFT ===== */}
        <div className="ct-info">
          {/* Hero */}
          <section className="ct-thero">
            {trail.hero_url && <img src={trail.hero_url} alt="" className="ct-thero-img" />}
            <div className="ct-thero-top">
              <span className="ct-thero-phase"><span className="ct-dot" /> Trilha · {phaseLabel}</span>
            </div>
            <div className="ct-thero-eyebrow">Jornada completa · guiada de ponta a ponta</div>
            <h1 className="ct-thero-title">{trail.title}</h1>
            {trail.description && <p className="ct-thero-sub">{trail.description}</p>}
          </section>

          {/* Quick facts */}
          <div className="ct-facts">
            <div className="ct-fact">
              <div className="ct-fact-icon">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 6l7-3 7 3-7 3-7-3z m3 3.5V12c0 1 2 2 4 2s4-1 4-2V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </div>
              <div className="ct-fact-num">{courseCount}</div>
              <div className="ct-fact-lbl">{courseCount === 1 ? "Turma na trilha" : "Turmas na trilha"}</div>
            </div>
            <div className="ct-fact">
              <div className="ct-fact-icon">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 4h12v10H3z M3 4l6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </div>
              <div className="ct-fact-num" style={{ fontSize: 18 }}>Comunidade</div>
              <div className="ct-fact-lbl">Exclusiva da trilha</div>
            </div>
            <div className="ct-fact">
              <div className="ct-fact-icon">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 5.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="ct-fact-num" style={{ fontSize: 18 }}>No seu ritmo</div>
              <div className="ct-fact-lbl">Sem prazo para concluir</div>
            </div>
            <div className="ct-fact">
              <div className="ct-fact-icon">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2 3 4v4c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </div>
              <div className="ct-fact-num">{trail.trial_days > 0 ? `${trail.trial_days}` : "7"}</div>
              <div className="ct-fact-lbl">{trail.trial_days > 0 ? "Dias grátis" : "Dias de garantia"}</div>
            </div>
          </div>

          {/* O que está incluído */}
          <section className="ct-block">
            <div>
              <div className="ct-block-eyebrow">O que está incluído</div>
              <h2 className="ct-block-title">Tudo que <span className="ct-light">vem junto</span></h2>
            </div>
            <div className="ct-gains">
              {[
                <><b>{courseCount === 1 ? "1 turma completa" : `${courseCount} turmas completas`}</b> liberadas desde o primeiro dia, no seu ritmo</>,
                <><b>Material de apoio</b> e exercícios práticos de cada turma</>,
                <><b>Comunidade exclusiva</b> da trilha, com mediação</>,
                <><b>Acompanhamento de progresso</b> aula a aula</>,
                <><b>Novos conteúdos</b> da trilha sem custo extra</>,
              ].map((txt, i) => (
                <div className="ct-gain" key={i}>
                  <span className="ct-gain-check">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="var(--rayo-sand-50)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="ct-gain-txt">{txt}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Módulos = turmas reais */}
          {courseCount > 0 && (
            <section className="ct-block">
              <div>
                <div className="ct-block-eyebrow">As turmas desta trilha</div>
                <h2 className="ct-block-title">O caminho <span className="ct-light">completo</span></h2>
              </div>
              <div className="ct-modules">
                {trail.courses.map((c, i) => (
                  <div className="ct-module" key={c.id}>
                    <span className="ct-module-num">{String(i + 1).padStart(2, "0")}</span>
                    <div className="ct-module-body">
                      <div className="ct-module-title">{c.title}</div>
                      {c.subtitle && <div className="ct-module-meta">{c.subtitle}</div>}
                    </div>
                    <span className="ct-module-type">Turma</span>
                    {trail.user_has_access && (
                      <a href={`/turmas/${c.id}`} className="ct-module-link">Abrir</a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="ct-block">
            <div>
              <div className="ct-block-eyebrow">Antes de decidir</div>
              <h2 className="ct-block-title">Dúvidas <span className="ct-light">comuns</span></h2>
            </div>
            <div className="ct-faq">
              {faqItems.map((item, i) => (
                <div className={`ct-faq-item${openFaq === i ? " ct-open" : ""}`} key={i}>
                  <button
                    type="button"
                    aria-expanded={openFaq === i}
                    className="ct-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    {item.q}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                  <div className="ct-faq-a">
                    <div className="ct-faq-a-inner">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ===== RIGHT — CHECKOUT ===== */}
        <aside className="ct-buy">
          <div className="ct-buy-card">
            <div className="ct-buy-head">
              <div className="ct-buy-eyebrow">Você está assinando</div>
              <div className="ct-buy-trilha">{trail.title}</div>
              <div className="ct-buy-incl">
                {courseCount > 0 && `${courseCount} ${courseCount === 1 ? "turma" : "turmas"} · `}
                comunidade exclusiva + conselheiro IA
              </div>
            </div>

            {trail.user_has_access ? (
              <div className="ct-owned">
                <p className="ct-owned-msg">
                  Você já tem assinatura ativa nesta trilha. As turmas acima estão liberadas.
                </p>
                <button type="button" className="ct-owned-btn" onClick={handleManage}>
                  Gerenciar assinatura
                </button>
              </div>
            ) : (
              <>
                {trialActive && (
                  <div className="ct-trial-banner">
                    Comece com {trail.trial_days} dias grátis · cancele quando quiser
                  </div>
                )}

                <div className="ct-plans">
                  {yearly > 0 && (
                    <button
                      type="button"
                      aria-pressed={interval === "year"}
                      className={`ct-plan${interval === "year" ? " ct-active" : ""}`}
                      onClick={() => setIntervalState("year")}
                    >
                      <div className="ct-plan-top">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="ct-plan-radio" />
                          <span className="ct-plan-name">Anual</span>
                        </div>
                        {discountPct > 0 && <span className="ct-plan-tag">Economize {discountPct}%</span>}
                      </div>
                      <div className="ct-plan-price">
                        <span className="ct-val">{formatBRL(yearlyEquivalentMonthly)}</span>
                        <span className="ct-per">/mês · cobrado anual</span>
                      </div>
                      <div className="ct-plan-note">
                        {annualSavingsCents > 0 && <b>Economize {formatBRL(annualSavingsCents)} </b>}
                        {formatBRL(yearly)}/ano
                      </div>
                    </button>
                  )}

                  {monthly > 0 && (
                    <button
                      type="button"
                      aria-pressed={interval === "month"}
                      className={`ct-plan${interval === "month" ? " ct-active" : ""}`}
                      onClick={() => setIntervalState("month")}
                    >
                      <div className="ct-plan-top">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="ct-plan-radio" />
                          <span className="ct-plan-name">Mensal</span>
                        </div>
                      </div>
                      <div className="ct-plan-price">
                        <span className="ct-val">{formatBRL(monthly)}</span>
                        <span className="ct-per">/mês</span>
                      </div>
                      <div className="ct-plan-note">Flexível · cancele quando quiser</div>
                    </button>
                  )}
                </div>

                <div className="ct-buy-foot">
                  <div className="ct-buy-total">
                    <span className="ct-buy-total-lbl">{trialActive ? "Depois do período grátis" : "Total hoje"}</span>
                    <span className="ct-buy-total-val">{totalLabel}</span>
                  </div>
                  {/* UX_PLAN.md J3 — transparência ANTES de pagar: data exata da
                      1ª cobrança e recorrência explícita, sem letra miúda. */}
                  <p className="ct-buy-secure" style={{ marginTop: 4 }}>
                    {trialActive
                      ? `1ª cobrança em ${firstChargeDate} · renova ${interval === "year" ? "todo ano" : "todo mês"} · cancele quando quiser`
                      : `Renova automaticamente ${interval === "year" ? "todo ano" : "todo mês"} · cancele quando quiser`}
                  </p>
                  <button
                    type="button"
                    className="ct-buy-cta"
                    onClick={handleSubscribe}
                    disabled={busy}
                  >
                    {busy
                      ? "Abrindo checkout…"
                      : !hasSession
                        ? "Entrar para assinar"
                        : trialActive
                          ? `Começar ${trail.trial_days} dias grátis`
                          : "Assinar e começar agora"}
                    {!busy && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <div className="ct-buy-secure">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2 3 4v4c0 3 2 5 5 6 3-1 5-3 5-6V4L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="m6 8 1.5 1.5L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Pagamento seguro via Stripe
                  </div>
                  {err && <p className="ct-buy-err">{err}</p>}
                </div>
              </>
            )}
          </div>

          <div className="ct-trust">
            <div className="ct-trust-row">
              <div className="ct-trust-icon">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2 3 4v4c0 3 2 5 5 6 3-1 5-3 5-6V4L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              </div>
              <div className="ct-trust-txt">
                <b>{trail.trial_days > 0 ? `${trail.trial_days} dias grátis.` : "Cancele quando quiser."}</b>{" "}
                {trail.trial_days > 0 ? "Sem compromisso." : "Sem multa, sem letra miúda."}
              </div>
            </div>
            <div className="ct-trust-row">
              <div className="ct-trust-icon">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2 7.5h12" stroke="currentColor" strokeWidth="1.4" /></svg>
              </div>
              <div className="ct-trust-txt"><b>Pagamento seguro.</b> Processado pela Stripe.</div>
            </div>
            <div className="ct-trust-row">
              <div className="ct-trust-icon">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </div>
              <div className="ct-trust-txt"><b>Acesso imediato.</b> Comece a primeira aula hoje.</div>
            </div>
            {/* UX_PLAN.md J3 — suporte humano no ponto da decisão de compra. */}
            {import.meta.env.VITE_SUPPORT_WHATSAPP_URL && (
              <a
                className="ct-trust-row"
                href={import.meta.env.VITE_SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="ct-trust-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 0 0-5.2 9L2 14l3.1-.8A6 6 0 1 0 8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                </div>
                <div className="ct-trust-txt"><b>Ficou com dúvida?</b> Chama a gente no WhatsApp.</div>
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
