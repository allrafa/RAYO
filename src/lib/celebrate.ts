// Celebração global de marcos (ENGAGEMENT_PLAN.md E3).
//
// Pub/sub minúsculo: qualquer handler de conclusão (Hoje no RAYO, aula,
// missão, amém) chama `celebrateFromCompletion(resp)` com a resposta do
// servidor; se ela carrega um level-up ou um marco de sequência (7/30/90
// dias), o <CelebrationOverlay/> montado no App mostra confetti + mensagem.
//
// Marcos de streak são deduplicados por dia via localStorage — várias
// conclusões no mesmo dia com streak=7 celebram uma vez só, mas quem
// perde a chama e reconquista os 7 dias meses depois celebra de novo.

export interface Celebration {
  kind: "levelup" | "streak" | "paired" | "couple_streak" | "testemunho";
  value: number;
}

type Listener = (c: Celebration) => void;

const listeners = new Set<Listener>();

export function onCelebration(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function celebrate(c: Celebration): void {
  for (const l of listeners) l(c);
}

export const STREAK_MILESTONES = [7, 30, 90];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function streakKey(milestone: number): string {
  return `rayo_streak_celebrated:${milestone}`;
}

function streakAlreadyCelebratedToday(milestone: number): boolean {
  try { return localStorage.getItem(streakKey(milestone)) === todayStr(); }
  catch { return false; }
}

function markStreakCelebrated(milestone: number): void {
  try { localStorage.setItem(streakKey(milestone), todayStr()); }
  catch { /* private mode */ }
}

export interface CompletionLike {
  leveledUp?: boolean;
  newLevel?: number;
  currentStreak?: number;
}

/** Dispara a celebração certa a partir de qualquer resposta de conclusão.
 *  Level-up tem prioridade sobre marco de streak (nunca empilha duas). */
export function celebrateFromCompletion(d?: CompletionLike | null): void {
  if (!d) return;
  if (d.leveledUp && typeof d.newLevel === "number") {
    celebrate({ kind: "levelup", value: d.newLevel });
    return;
  }
  const s = d.currentStreak ?? 0;
  if (STREAK_MILESTONES.includes(s) && !streakAlreadyCelebratedToday(s)) {
    markStreakCelebrated(s);
    celebrate({ kind: "streak", value: s });
  }
}
