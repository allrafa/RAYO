import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Share2, Check, ChevronDown, Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { NativeShare } from "../NativeShare";
import { enhancedToast } from "../EnhancedToast";
import { celebrate } from "../../lib/celebrate";

// Aliança (Modo Casal) — ALIANCA_PLAN.md §4. Card do cluster "Hoje com
// Deus" com 3 estados: sem vínculo (CTA), convite pendente (código +
// compartilhar) e pareado (chama do casal + orar pelo outro).
//
// Princípio: encorajamento, não vigilância — só atividade sim/não,
// chama, améns e orações. Nada de conteúdo ou tempo de tela.

interface AliancaState {
  status: "none" | "invited" | "paired";
  code?: string;
  expiresAt?: string;
  partner?: { id: number; name: string };
  coupleStreak?: number;
  partnerActiveToday?: boolean;
  prayedByMeToday?: boolean;
  prayedByPartnerToday?: boolean;
  amensToday?: { mine: boolean; partner: boolean };
}

// Disparado pelo App após redimir um convite (?convite=CODE) pra este
// card refazer o fetch sem depender de ordem de montagem.
export const ALIANCA_CHANGED_EVENT = "rayo:alianca-changed";

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

// DIFERENCIAL_PLAN.md D2 — Pedidos de oração & testemunhos.
interface PrayerRequest {
  id: number;
  text: string;
  status: "open" | "answered";
  createdByMe: boolean;
  answer_note: string | null;
  answered_at: string | null;
}

// Marcos da chama do casal (7/30/90) — celebra 1x/dia por marco.
const COUPLE_MILESTONES = [7, 30, 90];
function maybeCelebrateCoupleStreak(streak: number): void {
  if (!COUPLE_MILESTONES.includes(streak)) return;
  const key = `rayo_couple_streak_celebrated:${streak}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch { /* private mode */ }
  celebrate({ kind: "couple_streak", value: streak });
}

export function AliancaCard({ refreshKey = 0 }: { refreshKey?: number | string }) {
  const [state, setState] = useState<AliancaState | null>(null);
  const [busy, setBusy] = useState(false);
  // D2 — pedidos & testemunhos (fetch lazy ao expandir a seção).
  const [pedidosOpen, setPedidosOpen] = useState(false);
  const [pedidos, setPedidos] = useState<{ open: PrayerRequest[]; answered: PrayerRequest[] } | null>(null);
  const [novoPedido, setNovoPedido] = useState("");
  const [pedidoBusy, setPedidoBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get<AliancaState>("/api/alianca");
    if (r.success && r.data) {
      setState(r.data);
      if (r.data.status === "paired") {
        maybeCelebrateCoupleStreak(r.data.coupleStreak ?? 0);
      }
    }
  }, []);

  const loadPedidos = useCallback(async () => {
    const r = await api.get<{ open: PrayerRequest[]; answered: PrayerRequest[] }>("/api/alianca/pedidos");
    if (r.success && r.data) setPedidos(r.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const onChanged = () => { void load(); };
    window.addEventListener(ALIANCA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(ALIANCA_CHANGED_EVENT, onChanged);
  }, [load]);

  if (!state) return null;

  const cardStyle = {
    background: "var(--rayo-sand-50)",
    border: "1px solid var(--rayo-sand-300)",
  };

  // ── Estado 1: sem vínculo ─────────────────────────────────────────
  if (state.status === "none") {
    const handleInvite = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const r = await api.post<{ code: string; expiresAt: string }>("/api/alianca/invite", {});
        if (r.success && r.data) {
          setState({ status: "invited", code: r.data.code, expiresAt: r.data.expiresAt });
        } else {
          enhancedToast.error({ title: r.error?.message || "Não foi possível criar o convite" });
        }
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="rounded-2xl px-4 py-4" style={cardStyle}>
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 38, height: 38, background: "var(--rayo-terra-100)" }}
            aria-hidden="true"
          >
            <HeartHandshake className="w-5 h-5" style={{ color: "var(--rayo-terra-600)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px]" style={{ fontWeight: 700, color: "var(--rayo-ink-900)" }}>
              Caminhem juntos
            </div>
            <p className="text-[13px] mt-0.5 mb-3" style={{ color: "var(--rayo-ink-700)", lineHeight: 1.5 }}>
              Convide seu cônjuge: orem um pelo outro e mantenham a chama do casal acesa.
            </p>
            <button
              type="button"
              onClick={handleInvite}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
              style={{ background: "var(--rayo-forest-700)", color: "var(--rayo-sand-50)", fontWeight: 700 }}
            >
              Convidar meu cônjuge
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado 2: convite pendente ────────────────────────────────────
  if (state.status === "invited") {
    const link = `${window.location.origin}/?convite=${state.code}`;
    const handleRevoke = async () => {
      if (busy) return;
      setBusy(true);
      try {
        await api.post("/api/alianca/invite/revoke", {});
        setState({ status: "none" });
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="rounded-2xl px-4 py-4" style={cardStyle}>
        <div className="text-[11px] tracking-[0.14em] uppercase mb-2" style={{ color: "var(--rayo-terra-600)", fontWeight: 700 }}>
          Aliança · convite ativo
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="rounded-xl px-3 py-2 text-lg tracking-[0.2em]"
            style={{ background: "var(--rayo-sand-100)", border: "1px dashed var(--rayo-sand-300)", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--rayo-ink-900)" }}
            aria-label={`Código do convite: ${state.code}`}
          >
            {state.code}
          </div>
          <NativeShare
            data={{
              title: "Aliança RAYO",
              text: `Quero caminhar com você no RAYO 🤍 Toque no link pra aceitar meu convite:`,
              url: link,
            }}
            variant="custom"
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
              style={{ background: "var(--rayo-forest-700)", color: "var(--rayo-sand-50)", fontWeight: 700 }}
            >
              <Share2 className="w-4 h-4" /> Enviar pro seu amor
            </button>
          </NativeShare>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px]" style={{ color: "var(--rayo-ink-700)", opacity: 0.85 }}>
            Vale por 7 dias. Quem receber entra pelo link e a aliança se firma.
          </span>
          <button
            type="button"
            onClick={handleRevoke}
            className="text-[12px] underline underline-offset-2"
            style={{ color: "var(--rayo-ink-700)", opacity: 0.7 }}
          >
            Revogar
          </button>
        </div>
      </div>
    );
  }

  // ── Estado 3: pareado ─────────────────────────────────────────────
  const partner = state.partner!;
  const nome = firstName(partner.name);
  const bothAmen = state.amensToday?.mine && state.amensToday?.partner;

  const handlePray = async () => {
    if (busy || state.prayedByMeToday) return;
    setBusy(true);
    if ("vibrate" in navigator) navigator.vibrate([15, 30, 15]);
    setState((s) => (s ? { ...s, prayedByMeToday: true } : s));
    try {
      const r = await api.post<{ prayed: boolean; alreadyPrayedToday: boolean; xpAwarded: number }>(
        "/api/alianca/pray",
        {},
      );
      if (r.success && r.data && r.data.xpAwarded > 0) {
        enhancedToast.success({ title: `Você orou por ${nome} 🙏 +${r.data.xpAwarded} XP`, haptic: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnpair = async () => {
    const ok = window.confirm(
      `Desfazer a aliança com ${partner.name}? Vocês deixam de ver a chama e as orações um do outro.`,
    );
    if (!ok) return;
    await api.delete("/api/alianca");
    setState({ status: "none" });
  };

  // ── D2: pedidos & testemunhos ─────────────────────────────────────
  const togglePedidos = () => {
    const next = !pedidosOpen;
    setPedidosOpen(next);
    if (next && !pedidos) void loadPedidos();
  };

  const handleAddPedido = async () => {
    const text = novoPedido.trim();
    if (!text || pedidoBusy) return;
    setPedidoBusy(true);
    try {
      const r = await api.post<{ request: PrayerRequest }>("/api/alianca/pedidos", { text });
      if (r.success && r.data) {
        setNovoPedido("");
        setPedidos((p) => (p ? { ...p, open: [r.data!.request, ...p.open] } : p));
        enhancedToast.success({ title: "Pedido adicionado 🙏", haptic: true });
      } else {
        enhancedToast.error({ title: r.error?.message || "Não foi possível adicionar" });
      }
    } finally {
      setPedidoBusy(false);
    }
  };

  const handleResponder = async (req: PrayerRequest) => {
    if (pedidoBusy) return;
    setPedidoBusy(true);
    if ("vibrate" in navigator) navigator.vibrate([20, 40, 20]);
    try {
      const r = await api.post(`/api/alianca/pedidos/${req.id}/responder`, {});
      if (r.success) {
        celebrate({ kind: "testemunho", value: 0 });
        void loadPedidos();
      }
    } finally {
      setPedidoBusy(false);
    }
  };

  const handleRemoverPedido = async (req: PrayerRequest) => {
    if (!window.confirm("Remover este pedido?")) return;
    await api.delete(`/api/alianca/pedidos/${req.id}`);
    setPedidos((p) => (p ? { ...p, open: p.open.filter((x) => x.id !== req.id) } : p));
  };

  return (
    <div className="rounded-2xl px-4 py-4" style={cardStyle}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--rayo-terra-600)", fontWeight: 700 }}>
          Aliança 🤍 {nome}
        </div>
        <span
          className="inline-flex items-center gap-1 text-[12px]"
          style={{ color: "var(--rayo-ink-700)" }}
        >
          <span
            aria-hidden="true"
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              background: state.partnerActiveToday ? "var(--rayo-forest-500)" : "var(--rayo-sand-300)",
            }}
          />
          {state.partnerActiveToday ? `${nome} esteve aqui hoje` : `${nome} ainda não veio hoje`}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
          style={{
            background: (state.coupleStreak ?? 0) > 0 ? "var(--rayo-terra-100)" : "var(--rayo-sand-100)",
            color: (state.coupleStreak ?? 0) > 0 ? "var(--rayo-terra-700)" : "var(--rayo-ink-700)",
            border: `1px solid ${(state.coupleStreak ?? 0) > 0 ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
            fontWeight: 700,
          }}
          aria-label={`Chama do casal: ${state.coupleStreak ?? 0} dias juntos`}
        >
          🔥🔥 {state.coupleStreak ?? 0} {(state.coupleStreak ?? 0) === 1 ? "dia juntos" : "dias juntos"}
        </div>

        <button
          type="button"
          onClick={handlePray}
          disabled={busy || state.prayedByMeToday}
          aria-pressed={state.prayedByMeToday}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
          style={{
            background: state.prayedByMeToday ? "var(--rayo-sand-100)" : "var(--rayo-forest-700)",
            color: state.prayedByMeToday ? "var(--rayo-forest-700)" : "var(--rayo-sand-50)",
            border: state.prayedByMeToday ? "1px solid var(--rayo-forest-500)" : "1px solid transparent",
            fontWeight: 700,
          }}
        >
          {state.prayedByMeToday ? (
            <>
              <Check className="w-4 h-4" /> Você orou por {nome} hoje
            </>
          ) : (
            <>🙏 Orar por {nome}</>
          )}
        </button>
      </div>

      {(state.prayedByPartnerToday || bothAmen) && (
        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          {state.prayedByPartnerToday && (
            <span
              className="text-[12px] rounded-full px-2.5 py-1"
              style={{ background: "var(--rayo-sage-100)", color: "var(--rayo-forest-700)", fontWeight: 600 }}
            >
              {nome} orou por você hoje 🙏
            </span>
          )}
          {bothAmen && (
            <span
              className="text-[12px] rounded-full px-2.5 py-1"
              style={{ background: "var(--rayo-gold-100)", color: "var(--rayo-ink-900)", fontWeight: 600 }}
            >
              Vocês dois disseram amém hoje 🙌
            </span>
          )}
        </div>
      )}

      {/* D2 — Pedidos & testemunhos (expansível, fetch lazy). */}
      <div className="mt-3 pt-2.5" style={{ borderTop: "1px dashed var(--rayo-sand-300)" }}>
        <button
          type="button"
          onClick={togglePedidos}
          aria-expanded={pedidosOpen}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-[12px] uppercase tracking-[0.14em]" style={{ color: "var(--rayo-forest-700)", fontWeight: 700 }}>
            Pedidos & testemunhos 🙏
          </span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: "var(--rayo-ink-700)", transform: pedidosOpen ? "rotate(180deg)" : "none" }}
            aria-hidden="true"
          />
        </button>

        {pedidosOpen && (
          <div className="mt-2.5">
            {/* Adicionar pedido */}
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="text"
                value={novoPedido}
                onChange={(e) => setNovoPedido(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddPedido(); }}
                maxLength={280}
                placeholder="Pelo que vocês estão orando?"
                className="flex-1 rounded-full px-3.5 py-2 text-[13px] outline-none"
                style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)", color: "var(--rayo-ink-900)" }}
              />
              <button
                type="button"
                onClick={handleAddPedido}
                disabled={pedidoBusy || novoPedido.trim().length < 3}
                aria-label="Adicionar pedido de oração"
                className="rounded-full p-2 transition-transform active:scale-95"
                style={{ background: "var(--rayo-forest-700)", color: "var(--rayo-sand-50)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Pedidos abertos */}
            {pedidos === null ? (
              <p className="text-[12px]" style={{ color: "var(--rayo-ink-700)", opacity: 0.7 }}>Carregando…</p>
            ) : (
              <>
                {pedidos.open.length === 0 && pedidos.answered.length === 0 && (
                  <p className="text-[12px]" style={{ color: "var(--rayo-ink-700)", opacity: 0.8 }}>
                    Adicionem os pedidos de vocês — e quando Deus responder, marquem o testemunho 🙌
                  </p>
                )}
                <ul className="space-y-1.5">
                  {pedidos.open.map((req) => (
                    <li key={req.id} className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-[13px]">🙏</span>
                      <span className="flex-1 text-[13px]" style={{ color: "var(--rayo-ink-900)" }}>
                        {req.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResponder(req)}
                        disabled={pedidoBusy}
                        className="text-[11px] rounded-full px-2 py-1 shrink-0 transition-transform active:scale-95"
                        style={{ background: "var(--rayo-gold-100)", border: "1px solid var(--rayo-gold-300)", color: "var(--rayo-ink-900)", fontWeight: 700 }}
                      >
                        Deus respondeu 🙌
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoverPedido(req)}
                        aria-label="Remover pedido"
                        className="p-1 shrink-0"
                        style={{ color: "var(--rayo-ink-700)", opacity: 0.5 }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Testemunhos — a memória espiritual do casal */}
                {pedidos.answered.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--rayo-ink-700)", fontWeight: 700, opacity: 0.75 }}>
                      Testemunhos
                    </div>
                    <ul className="space-y-1">
                      {pedidos.answered.slice(0, 5).map((req) => (
                        <li key={req.id} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--rayo-forest-500)" }} strokeWidth={3} />
                          <span className="text-[12px]" style={{ color: "var(--rayo-ink-700)" }}>
                            {req.text}
                            {req.answer_note && (
                              <em style={{ opacity: 0.85 }}> — {req.answer_note}</em>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-2.5 text-right">
        <button
          type="button"
          onClick={handleUnpair}
          className="text-[11px] underline underline-offset-2"
          style={{ color: "var(--rayo-ink-700)", opacity: 0.55 }}
        >
          Desfazer aliança
        </button>
      </div>
    </div>
  );
}
