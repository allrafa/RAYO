import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { enhancedToast } from "../EnhancedToast";
import { celebrateFromCompletion } from "../../lib/celebrate";
import { useCommunitySocket } from "../../lib/community/useCommunitySocket";

// Momento RAYO (DIFERENCIAL_PLAN.md D3) — às 21h, o Brasil ora junto.
//
// Fora da janela: faixa compacta com o compromisso e o countdown.
// Na janela (21h00–21h10 SP): a sala ao vivo — versículo, contador de
// presença em tempo real, améns flutuando na tela de todos e o selo de
// presença (+5 XP, 1x/dia). Mecânica de compromisso síncrono: todo dia,
// no mesmo horário, a comunidade inteira aparece junta.

interface MomentoState {
  open: boolean;
  secondsToOpen: number;
  secondsToClose: number;
  date: string;
  attendedToday: boolean;
  verse: { ref: string; text: string };
}

interface AttendResp {
  attended: boolean;
  alreadyAttended: boolean;
  xpAwarded: number;
  leveledUp?: boolean;
  newLevel?: number;
  currentStreak?: number;
}

function fmtCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.ceil((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  return `${Math.max(1, m)}min`;
}

export function MomentoRayo() {
  const [state, setState] = useState<MomentoState | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<number[]>([]);
  const floatSeq = useRef(0);
  const community = useCommunitySocket();

  const load = useCallback(async () => {
    const r = await api.get<MomentoState>("/api/momento");
    if (r.success && r.data) {
      setState(r.data);
      setFetchedAt(Date.now());
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Relógio local de 20s — move o countdown e detecta a virada da
  // janela (refetch quando o tempo previsto expira).
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = Math.floor((now - fetchedAt) / 1000);
  const secondsToOpen = state ? Math.max(0, state.secondsToOpen - elapsed) : 0;
  const secondsToClose = state ? Math.max(0, state.secondsToClose - elapsed) : 0;
  const live = !!state && (state.open ? secondsToClose > 0 : secondsToOpen === 0 && elapsed < 3600);

  // Virada de janela: quando o previsto expira, re-sincroniza com o servidor.
  useEffect(() => {
    if (!state) return;
    if ((state.open && secondsToClose === 0) || (!state.open && secondsToOpen === 0)) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // Sala ao vivo: join/leave + eventos de contagem e améns.
  useEffect(() => {
    if (!live) return;
    community.joinMomento();
    const offCount = community.on("momento:count", (e) => setCount(e.count));
    const offAmen = community.on("momento:amen", () => {
      const id = ++floatSeq.current;
      setFloats((prev) => [...prev.slice(-24), id]);
      window.setTimeout(() => {
        setFloats((prev) => prev.filter((x) => x !== id));
      }, 1600);
    });
    return () => {
      offCount();
      offAmen();
      community.leaveMomento();
    };
  }, [live, community]);

  if (!state) return null;

  // ── Faixa de compromisso (fora da janela) ─────────────────────────
  if (!live) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
        style={{
          background: "linear-gradient(135deg, var(--rayo-ink-900) 0%, var(--rayo-forest-900) 100%)",
          color: "var(--rayo-sand-50)",
        }}
        aria-label={`Momento RAYO hoje às 21h — começa em ${fmtCountdown(secondsToOpen)}`}
      >
        <span className="text-xl" aria-hidden="true">🕯️</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px]" style={{ fontWeight: 700 }}>
            Momento RAYO · hoje às 21h
          </span>
          <span className="block text-[12px]" style={{ opacity: 0.8 }}>
            O Brasil ora junto — 3 minutos, todos ao mesmo tempo
          </span>
        </span>
        <span
          className="text-[12px] rounded-full px-2.5 py-1 shrink-0"
          style={{ background: "rgba(255,255,255,0.12)", fontWeight: 700 }}
        >
          {secondsToOpen > 0 ? `em ${fmtCountdown(secondsToOpen)}` : "abrindo…"}
        </span>
      </button>
    );
  }

  // ── Sala ao vivo ──────────────────────────────────────────────────
  const others = Math.max(0, count - 1);

  const handleAmen = () => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    community.emitMomentoAmen();
  };

  const handleAttend = async () => {
    if (busy || state.attendedToday) return;
    setBusy(true);
    if ("vibrate" in navigator) navigator.vibrate([20, 40, 20]);
    setState((s) => (s ? { ...s, attendedToday: true } : s));
    try {
      const r = await api.post<AttendResp>("/api/momento/attend", {});
      if (r.success && r.data && r.data.xpAwarded > 0) {
        enhancedToast.success({ title: `Presença marcada 🕯️ +${r.data.xpAwarded} XP`, haptic: true });
        celebrateFromCompletion(r.data);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-5"
      aria-label="Momento RAYO ao vivo"
      style={{
        background: "linear-gradient(160deg, var(--rayo-ink-900) 0%, var(--rayo-forest-900) 70%)",
        color: "var(--rayo-sand-50)",
      }}
    >
      {/* Améns flutuando — broadcast da sala inteira. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {floats.map((id) => (
          <span
            key={id}
            className="absolute text-xl"
            style={{
              left: `${8 + ((id * 37) % 84)}%`,
              bottom: "-8%",
              animation: "rayo-momento-float 1.5s ease-out forwards",
            }}
          >
            🙏
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" aria-hidden="true">🕯️</span>
        <span className="text-[11px] tracking-[0.18em] uppercase" style={{ fontWeight: 700, color: "var(--rayo-gold-400)" }}>
          Momento RAYO · ao vivo
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px]" style={{ fontWeight: 600 }}>
          <span
            aria-hidden="true"
            className="inline-block rounded-full"
            style={{ width: 7, height: 7, background: "#4ade80", boxShadow: "0 0 6px #4ade80" }}
          />
          {count > 1 ? `Você e mais ${others} orando agora` : count === 1 ? "Você está aqui" : "Conectando…"}
        </span>
      </div>

      <blockquote className="text-[17px] leading-relaxed mb-1 max-w-2xl" style={{ fontWeight: 500 }}>
        “{state.verse.text}”
      </blockquote>
      <div className="text-[12px] mb-4" style={{ opacity: 0.75 }}>{state.verse.ref}</div>

      <p className="text-[13px] mb-4 max-w-2xl" style={{ opacity: 0.9 }}>
        Ore pela sua casa, pela sua comunidade e por quem está orando com você agora.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleAmen}
          className="rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
          style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)", color: "var(--rayo-sand-50)", fontWeight: 700 }}
        >
          🙏 Amém
        </button>
        <button
          type="button"
          onClick={handleAttend}
          disabled={busy || state.attendedToday}
          aria-pressed={state.attendedToday}
          className="rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
          style={{
            background: state.attendedToday ? "var(--rayo-sand-50)" : "var(--rayo-gold-500)",
            color: "var(--rayo-ink-900)",
            fontWeight: 700,
          }}
        >
          {state.attendedToday ? "Presença marcada ✓" : "🕯️ Estou aqui (+5 XP)"}
        </button>
      </div>

      <style>{`
        @keyframes rayo-momento-float {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          12%  { opacity: 1; }
          100% { transform: translateY(-140px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
