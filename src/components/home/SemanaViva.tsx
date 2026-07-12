import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../../lib/api";
import { StreakCalendarModal } from "./StatsModals";

// Semana viva (ENGAGEMENT_PLAN.md E4) — linha seg→dom no topo da Home com
// os dias ativos preenchidos. O mesmo padrão visual que apps de hábito
// usam: ver a semana quase completa cria o impulso de não quebrar a
// corrente. Tocar abre o calendário completo de constância.

interface CalendarResp {
  currentStreak: number;
  days: Array<{ date: string; active: boolean }>;
}

interface WeekDay {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg → dom

// Monta a semana seg→dom ancorada no ÚLTIMO dia devolvido pelo servidor
// (o "hoje" dele) — evita divergência de fuso entre cliente e servidor.
function buildWeek(days: CalendarResp["days"]): WeekDay[] {
  if (days.length === 0) return [];
  const activeByDate = new Map(days.map((d) => [d.date, d.active]));
  const todayISO = days[days.length - 1].date;
  const today = new Date(`${todayISO}T12:00:00Z`); // meio-dia UTC: sem off-by-one
  const weekday = today.getUTCDay(); // 0=dom … 6=sáb
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((weekday + 6) % 7));

  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      date: iso,
      label,
      active: activeByDate.get(iso) ?? false,
      isToday: iso === todayISO,
      isFuture: iso > todayISO,
    };
  });
}

export function SemanaViva({ refreshKey = 0 }: { refreshKey?: number | string }) {
  const [week, setWeek] = useState<WeekDay[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.get<CalendarResp>("/api/home/streak-calendar?days=7");
      if (!cancelled && r.success && r.data) setWeek(buildWeek(r.data.days));
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (week.length === 0) return null;

  const activeCount = week.filter((d) => d.active).length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(10);
          setOpen(true);
        }}
        aria-label={`Sua semana: ${activeCount} de 7 dias ativos — ver calendário`}
        className="w-full rounded-2xl px-4 py-3 transition-transform active:scale-[0.99]"
        style={{
          background: "var(--rayo-sand-50)",
          border: "1px solid var(--rayo-sand-300)",
        }}
      >
        {/* No desktop, 7 pontos esticados por 1200px ficam esparsos —
            limita a régua e centraliza; no mobile o cap não morde. */}
        <div className="flex items-center justify-between gap-2 mx-auto" style={{ maxWidth: 520 }}>
          {week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
              <span
                className="text-[10px] uppercase tracking-wide"
                style={{
                  color: d.isToday ? "var(--rayo-forest-700)" : "var(--rayo-ink-700)",
                  fontWeight: d.isToday ? 800 : 600,
                  opacity: d.isFuture ? 0.45 : 0.8,
                }}
              >
                {d.label}
              </span>
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 26,
                  height: 26,
                  background: d.active ? "var(--rayo-forest-700)" : "transparent",
                  border: d.active
                    ? "2px solid var(--rayo-forest-700)"
                    : d.isToday
                      ? "2px dashed var(--rayo-forest-500)"
                      : "2px solid var(--rayo-sand-300)",
                  opacity: d.isFuture ? 0.5 : 1,
                }}
              >
                {d.active && <Check className="w-3.5 h-3.5" style={{ color: "var(--rayo-sand-50)" }} strokeWidth={3} />}
              </span>
            </div>
          ))}
        </div>
      </button>
      <StreakCalendarModal open={open} onOpenChange={setOpen} />
    </>
  );
}
