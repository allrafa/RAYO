import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Check, BookOpenText } from "lucide-react";
import { api } from "../../lib/api";
import { enhancedToast } from "../EnhancedToast";
import { celebrateFromCompletion } from "../../lib/celebrate";

// Devocional do casal (RITMO_PLAN.md F1) — o momento de qualidade diário
// a dois, dentro do cluster "Hoje com Deus". Renderiza só quando o
// usuário está pareado (a API responde paired:false e o card some).
//
// Colapsado: tema + título + estados dos dois. Expandido: versículo →
// reflexão → pergunta pra conversar → oração → "Fizemos juntos 🤍".

interface Devotional {
  theme: string;
  title: string;
  ref: string;
  verse: string;
  reflection: string[];
  question: string;
  prayer: string;
}

interface DevoState {
  paired: boolean;
  devotional?: Devotional;
  myDone?: boolean;
  partnerDone?: boolean;
  partnerName?: string;
}

interface CompleteResp {
  done: boolean;
  alreadyDone: boolean;
  bothDone: boolean;
  xpAwarded: number;
  leveledUp?: boolean;
  newLevel?: number;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

export function DevocionalCasal({ refreshKey = 0 }: { refreshKey?: number | string }) {
  const [state, setState] = useState<DevoState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get<DevoState>("/api/alianca/devocional");
    if (r.success && r.data) setState(r.data);
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (!state?.paired || !state.devotional) return null;

  const d = state.devotional;
  const nome = firstName(state.partnerName ?? "");
  const bothDone = state.myDone && state.partnerDone;

  const handleComplete = async () => {
    if (busy || state.myDone) return;
    setBusy(true);
    if ("vibrate" in navigator) navigator.vibrate([15, 30, 15]);
    setState((s) => (s ? { ...s, myDone: true } : s));
    try {
      const r = await api.post<CompleteResp>("/api/alianca/devocional/complete", {});
      if (r.success && r.data) {
        if (r.data.xpAwarded > 0) {
          enhancedToast.success({
            title: r.data.bothDone
              ? `Devocional a dois completo! +${r.data.xpAwarded} XP 🙌`
              : `Sua parte está feita 🤍 +${r.data.xpAwarded} XP`,
            haptic: true,
          });
        }
        setState((s) => (s ? { ...s, myDone: true, partnerDone: r.data!.bothDone || s.partnerDone } : s));
        celebrateFromCompletion(r.data);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
    >
      {/* Cabeçalho colapsável */}
      <button
        type="button"
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(10);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 38, height: 38, background: "var(--rayo-sage-100)" }}
          aria-hidden="true"
        >
          <BookOpenText className="w-5 h-5" style={{ color: "var(--rayo-forest-700)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] tracking-[0.14em] uppercase"
            style={{ color: "var(--rayo-forest-700)", fontWeight: 700 }}
          >
            Devocional do casal · {d.theme}
          </div>
          <div className="text-[15px] truncate" style={{ fontWeight: 700, color: "var(--rayo-ink-900)" }}>
            {d.title}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {bothDone ? (
            <span
              className="text-[11px] rounded-full px-2 py-0.5"
              style={{ background: "var(--rayo-forest-700)", color: "var(--rayo-sand-50)", fontWeight: 700 }}
            >
              Feito a dois ✓
            </span>
          ) : (
            <>
              <span
                aria-label={state.myDone ? "Sua parte feita" : "Sua parte pendente"}
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 18, height: 18,
                  background: state.myDone ? "var(--rayo-forest-700)" : "transparent",
                  border: state.myDone ? "none" : "2px solid var(--rayo-sand-300)",
                }}
              >
                {state.myDone && <Check className="w-3 h-3" style={{ color: "var(--rayo-sand-50)" }} strokeWidth={3} />}
              </span>
              <span
                aria-label={state.partnerDone ? `Parte de ${nome} feita` : `Parte de ${nome} pendente`}
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 18, height: 18,
                  background: state.partnerDone ? "var(--rayo-forest-700)" : "transparent",
                  border: state.partnerDone ? "none" : "2px solid var(--rayo-sand-300)",
                }}
              >
                {state.partnerDone && <Check className="w-3 h-3" style={{ color: "var(--rayo-sand-50)" }} strokeWidth={3} />}
              </span>
            </>
          )}
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: "var(--rayo-ink-700)", transform: open ? "rotate(180deg)" : "none" }}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Corpo expandido */}
      {open && (
        <div className="px-4 pb-4">
          <blockquote
            className="rounded-xl px-4 py-3 mb-3 text-[15px] leading-relaxed max-w-2xl"
            style={{
              background: "var(--rayo-forest-900)",
              color: "var(--rayo-sand-50)",
              fontWeight: 500,
            }}
          >
            “{d.verse}”
            <footer className="text-[12px] mt-1.5" style={{ opacity: 0.8 }}>{d.ref}</footer>
          </blockquote>

          {d.reflection.map((p, i) => (
            <p
              key={i}
              className="text-[14px] leading-relaxed mb-2.5 max-w-2xl"
              style={{ color: "var(--rayo-ink-900)" }}
            >
              {p}
            </p>
          ))}

          <div
            className="rounded-xl px-4 py-3 my-3 max-w-2xl"
            style={{ background: "var(--rayo-gold-100)", border: "1px solid var(--rayo-gold-300)" }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--rayo-ink-700)", fontWeight: 700 }}>
              Pra conversar hoje
            </div>
            <p className="text-[14px]" style={{ color: "var(--rayo-ink-900)", fontWeight: 600 }}>
              {d.question}
            </p>
          </div>

          <p className="text-[13px] italic mb-4 max-w-2xl" style={{ color: "var(--rayo-ink-700)" }}>
            {d.prayer}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleComplete}
              disabled={busy || state.myDone}
              aria-pressed={state.myDone}
              className="rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
              style={{
                background: state.myDone ? "var(--rayo-sand-100)" : "var(--rayo-forest-700)",
                color: state.myDone ? "var(--rayo-forest-700)" : "var(--rayo-sand-50)",
                border: state.myDone ? "1px solid var(--rayo-forest-500)" : "1px solid transparent",
                fontWeight: 700,
              }}
            >
              {state.myDone ? "✓ Sua parte está feita" : "Fizemos juntos 🤍"}
            </button>
            <span className="text-[12px]" style={{ color: "var(--rayo-ink-700)" }}>
              {bothDone
                ? "Ritual do dia completo 🙌"
                : state.partnerDone
                  ? `${nome} já fez — falta você`
                  : state.myDone
                    ? `Esperando ${nome} 🤍`
                    : "Vale +10 XP pra cada um"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
