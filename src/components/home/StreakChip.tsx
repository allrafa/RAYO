import { useState } from "react";
import { StreakCalendarModal } from "./StatsModals";

// Chama de sequência (ENGAGEMENT_PLAN.md E2) — o streak sempre à vista no
// topo da Home. Tocar abre o calendário de constância que já existia
// (StatsModals) mas ficava escondido.

export function StreakChip({ streak }: { streak: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(10);
          setOpen(true);
        }}
        aria-label={`Sequência de ${streak} ${streak === 1 ? "dia" : "dias"} — ver calendário`}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-transform active:scale-95"
        style={{
          background: streak > 0 ? "var(--rayo-terra-100)" : "var(--rayo-sand-100)",
          color: streak > 0 ? "var(--rayo-terra-700)" : "var(--rayo-ink-500)",
          border: `1px solid ${streak > 0 ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">🔥</span>
        {streak} {streak === 1 ? "dia" : "dias"}
      </button>
      <StreakCalendarModal open={open} onOpenChange={setOpen} />
    </>
  );
}
