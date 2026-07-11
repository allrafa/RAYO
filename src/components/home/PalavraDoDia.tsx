import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { api } from "../../lib/api";
import { NativeShare } from "../NativeShare";
import { enhancedToast } from "../EnhancedToast";
import { celebrateFromCompletion } from "../../lib/celebrate";

// Palavra do dia (ENGAGEMENT_PLAN.md E1) — a âncora espiritual diária da
// Home. Versículo global determinístico (mesmo pra todo mundo, o que dá
// sentido ao contador comunitário), "Amém 🙏" de 1 toque com +5 XP e
// burst de emojis, e compartilhar nativo.

interface Verse {
  ref: string;
  text: string;
  theme: string;
  amens: number;
  amened: boolean;
}

interface AmenResp {
  amened: boolean;
  alreadyAmened: boolean;
  amens: number;
  xpAwarded: number;
  leveledUp?: boolean;
  newLevel?: number;
  currentStreak?: number;
}

export function PalavraDoDia({ onEngaged }: { onEngaged?: () => void } = {}) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [busy, setBusy] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const burstSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.get<{ verse: Verse }>("/api/home/verse");
      if (!cancelled && r.success && r.data) setVerse(r.data.verse);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!verse) return null;

  const handleAmen = async () => {
    if (busy || verse.amened) return;
    setBusy(true);
    if ("vibrate" in navigator) navigator.vibrate([15, 30, 15]);
    // Burst de 🙏 subindo do botão (remove sozinho ao fim da animação).
    const ids = Array.from({ length: 5 }, () => ++burstSeq.current);
    setBursts((prev) => [...prev, ...ids]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !ids.includes(b)));
    }, 1300);
    // Otimista: marca e incrementa já.
    setVerse((v) => (v ? { ...v, amened: true, amens: v.amens + 1 } : v));
    try {
      const r = await api.post<AmenResp>("/api/home/verse/amen", {});
      if (r.success && r.data) {
        setVerse((v) => (v ? { ...v, amened: true, amens: r.data!.amens } : v));
        if (r.data.xpAwarded > 0) {
          enhancedToast.success({ title: `Amém! +${r.data.xpAwarded} XP`, haptic: true });
          // O amém mantém a chama: avisa o pai pra recarregar dashboard
          // (chip de streak + semana viva acendem na hora).
          onEngaged?.();
        }
        // ENGAGEMENT_PLAN.md E3 — level-up ou marco de streak vira festa.
        celebrateFromCompletion(r.data);
      }
    } finally {
      setBusy(false);
    }
  };

  const othersToday = Math.max(0, verse.amens - (verse.amened ? 1 : 0));

  // Sem wrapper de section — o HomePage agrupa este card com o chip de
  // streak e a semana viva numa única section "Hoje com Deus".
  return (
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
        aria-label="Palavra do dia"
        style={{
          background: "linear-gradient(135deg, var(--rayo-forest-900) 0%, var(--rayo-forest-700) 100%)",
          color: "var(--rayo-sand-50)",
        }}
      >
        <div
          className="text-[11px] tracking-[0.18em] uppercase mb-3"
          style={{ opacity: 0.75, fontWeight: 600 }}
        >
          Palavra do dia · {verse.theme}
        </div>
        <blockquote
          className="text-[19px] sm:text-[22px] leading-relaxed mb-2"
          style={{ fontWeight: 500 }}
        >
          “{verse.text}”
        </blockquote>
        <div className="text-sm mb-5" style={{ opacity: 0.8 }}>
          {verse.ref}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button
              type="button"
              onClick={handleAmen}
              disabled={busy || verse.amened}
              aria-pressed={verse.amened}
              className="rounded-full px-4 py-2 text-sm transition-transform active:scale-95"
              style={{
                background: verse.amened ? "var(--rayo-sand-50)" : "rgba(255,255,255,0.14)",
                color: verse.amened ? "var(--rayo-forest-900)" : "var(--rayo-sand-50)",
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              🙏 {verse.amened ? "Amém!" : "Amém"}
            </button>
            {/* Burst de emojis 🙏 subindo — puro CSS inline keyframes. */}
            {bursts.map((id, i) => (
              <span
                key={id}
                aria-hidden="true"
                className="pointer-events-none absolute text-lg"
                style={{
                  left: `${10 + ((id + i * 7) % 60)}%`,
                  bottom: "70%",
                  animation: "rayo-amen-float 1.2s ease-out forwards",
                }}
              >
                🙏
              </span>
            ))}
          </div>

          <span className="text-[13px]" style={{ opacity: 0.85 }}>
            {verse.amened
              ? othersToday > 0
                ? `Você e mais ${othersToday} ${othersToday === 1 ? "pessoa disse" : "pessoas disseram"} amém hoje`
                : "Você abriu os améns de hoje 🙌"
              : verse.amens > 0
                ? `${verse.amens} ${verse.amens === 1 ? "pessoa já disse" : "pessoas já disseram"} amém hoje`
                : "Seja o primeiro a dizer amém hoje"}
          </span>

          <div className="ml-auto">
            <NativeShare
              data={{
                title: "Palavra do dia — RAYO",
                text: `“${verse.text}” — ${verse.ref}`,
                url: typeof window !== "undefined" ? window.location.origin : "",
              }}
              variant="custom"
            >
              <button
                type="button"
                aria-label="Compartilhar a palavra do dia"
                className="rounded-full p-2 transition-transform active:scale-95"
                style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)" }}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </NativeShare>
          </div>
        </div>

        <style>{`
          @keyframes rayo-amen-float {
            0%   { transform: translateY(0) scale(0.7); opacity: 0; }
            15%  { opacity: 1; }
            100% { transform: translateY(-72px) scale(1.25); opacity: 0; }
          }
        `}</style>
      </div>
  );
}
