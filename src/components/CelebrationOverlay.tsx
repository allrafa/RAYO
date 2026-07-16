import { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
import { onCelebration, type Celebration } from "../lib/celebrate";

// Overlay global de celebração (ENGAGEMENT_PLAN.md E3) — level-up e marcos
// de sequência (7/30/90 dias) viram um momento: confetti (react-confetti,
// mesmo lib que o Hoje no RAYO já usa), mensagem central e haptics. Fecha
// sozinho em ~5s ou com um toque em qualquer lugar.

// Paleta RAYO em hex (globals.css) — react-confetti pinta em canvas,
// onde var() não existe.
const CONFETTI_COLORS = [
  "#fbbf24", // gold-400
  "#f59e0b", // gold-500
  "#C8553D", // terra-500
  "#1E6A52", // forest-500
  "#6D9773", // sage-500
  "#D4A24C", // ochre-500
];

function messageFor(c: Celebration): { emoji: string; title: string; subtitle: string } {
  if (c.kind === "paired") {
    return {
      emoji: "🤍",
      title: "Aliança firmada!",
      subtitle: "Vocês agora caminham juntos no RAYO. Que Deus guarde essa jornada a dois.",
    };
  }
  if (c.kind === "testemunho") {
    return {
      emoji: "🙌",
      title: "Deus respondeu!",
      subtitle: "Guardem esse testemunho no coração — e contem pra alguém o que Ele fez.",
    };
  }
  if (c.kind === "couple_streak") {
    if (c.value >= 90) {
      return {
        emoji: "🔥🔥",
        title: "90 dias de chama a dois!",
        subtitle: "Três meses caminhando juntos com Deus, todos os dias. Que aliança!",
      };
    }
    if (c.value >= 30) {
      return {
        emoji: "🔥🔥",
        title: "Um mês de chama do casal!",
        subtitle: "30 dias em que os dois estiveram presentes. Constância a dois transforma.",
      };
    }
    return {
      emoji: "🔥🔥",
      title: "7 dias de chama a dois!",
      subtitle: "Uma semana inteira juntos na presença. Não deixem a chama apagar.",
    };
  }
  if (c.kind === "levelup") {
    return {
      emoji: "🌟",
      title: `Nível ${c.value} alcançado!`,
      subtitle: "Cada passo de constância te aproxima de quem Deus te chamou pra ser.",
    };
  }
  if (c.value >= 90) {
    return {
      emoji: "👑",
      title: "90 dias de constância!",
      subtitle: "Três meses caminhando com Deus todos os dias. Que testemunho!",
    };
  }
  if (c.value >= 30) {
    return {
      emoji: "🔥",
      title: "30 dias de chama acesa!",
      subtitle: "Um mês inteiro de constância. Sua família colhe o que você planta.",
    };
  }
  return {
    emoji: "🔥",
    title: "7 dias de sequência!",
    subtitle: "Uma semana inteira com Deus. Constância transforma.",
  };
}

export function CelebrationOverlay() {
  const [current, setCurrent] = useState<Celebration | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return onCelebration((c) => {
      setCurrent(c);
      if ("vibrate" in navigator) navigator.vibrate([30, 60, 30, 60, 90]);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCurrent(null), 5200);
    });
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  if (!current) return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const msg = messageFor(current);
  const dismiss = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setCurrent(null);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "rgba(20, 28, 24, 0.45)", backdropFilter: "blur(2px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={msg.title}
      onClick={dismiss}
    >
      {!reducedMotion && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 360}
          height={typeof window !== "undefined" ? window.innerHeight : 640}
          numberOfPieces={current.kind === "levelup" ? 220 : 180}
          colors={CONFETTI_COLORS}
          recycle={false}
          gravity={0.3}
          tweenDuration={2000}
          style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
        />
      )}

      <div
        className="relative mx-6 max-w-sm rounded-3xl px-7 py-8 text-center shadow-2xl"
        style={{
          background: "var(--rayo-sand-50)",
          color: "var(--rayo-ink-900)",
          animation: "rayo-celebration-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3" aria-hidden="true">{msg.emoji}</div>
        <div className="text-xl mb-2" style={{ fontWeight: 800 }}>{msg.title}</div>
        <p className="text-sm mb-6" style={{ color: "var(--rayo-ink-700)", lineHeight: 1.55 }}>
          {msg.subtitle}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-6 py-2.5 text-sm transition-transform active:scale-95"
          style={{
            background: "var(--rayo-forest-700)",
            color: "var(--rayo-sand-50)",
            fontWeight: 700,
          }}
        >
          Amém, seguimos! 🙌
        </button>
      </div>

      <style>{`
        @keyframes rayo-celebration-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
