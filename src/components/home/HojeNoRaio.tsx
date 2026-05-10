// "Hoje no RAYO" — daily editorial nudge (Task #43, restilizado na #57).
// Renderiza o card editorial principal (.rh-hoje-main do mock RAYO Home).
// O aside com tiles brand é renderizado pelo HomePage como sibling.
//
// Backend (/api/home/today) retorna 1 item determinístico por
// (user, day, segment). Usuário pode marcar como feito (+15 XP, bump
// streak) ou pular o dia (skip local em localStorage).
import { useCallback, useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
import { CheckCircle2, ExternalLink, SkipForward } from "lucide-react";
import { api } from "../../lib/api";
import { enhancedToast } from "../EnhancedToast";

interface TodayItem {
  id: number;
  kind: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  durationSeconds: number | null;
  hook: string | null;
  ctaLabel: string;
  ctaTarget: string | null;
  segments: string[];
  completedAt: string | null;
}

interface CompleteResp {
  alreadyCompleted: boolean;
  xpAwarded: number;
  currentStreak?: number;
  leveledUp?: boolean;
  newLevel?: number;
}

interface Props {
  refreshKey?: number;
  onCompleted?: () => void;
  userId?: number | string | null;
  /** Notifica o pai se há (ou não) item visível, pra colapsar a section
   *  inteira (incluindo aside) quando vazio/skipped. */
  onVisibilityChange?: (visible: boolean) => void;
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function skipKey(userId?: number | string | null): string {
  // Task #163 — chave migrada pro namespace `rayo_*` no rebrand
  // RAIO→RAYO. storageMigration.ts copia o valor legado no boot.
  return `rayo_today_skipped_date:${userId ?? "anon"}`;
}
function readSkipped(userId?: number | string | null): boolean {
  try { return localStorage.getItem(skipKey(userId)) === todayStr(); }
  catch { return false; }
}

export function HojeNoRaio({ refreshKey = 0, onCompleted, userId, onVisibilityChange }: Props) {
  const [item, setItem] = useState<TodayItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [skipped, setSkipped] = useState<boolean>(() => readSkipped(userId));
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ item: TodayItem | null }>("/api/home/today");
      setItem(res.success && res.data ? res.data.item : null);
    } catch { setItem(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => { setSkipped(readSkipped(userId)); }, [refreshKey, userId]);
  useEffect(() => {
    // Loading conta como "visível" pra evitar flash do colapso da section.
    onVisibilityChange?.(loading || (!!item && !skipped));
  }, [loading, item, skipped, onVisibilityChange]);
  useEffect(() => () => {
    if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
  }, []);

  if (loading) {
    return (
      <div className="rh-hoje-main" style={{ minHeight: 280, opacity: 0.6 }} aria-hidden>
        <div className="rh-hoje-main-eyebrow">Carregando…</div>
      </div>
    );
  }

  if (!item || skipped) return null;

  const isDone = !!item.completedAt;
  const minutes = item.durationSeconds
    ? Math.max(1, Math.round(item.durationSeconds / 60))
    : null;

  const handleOpen = () => {
    if (!item.ctaTarget) return;
    if ("vibrate" in navigator) navigator.vibrate(15);
    window.open(item.ctaTarget, "_blank", "noopener,noreferrer");
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    if ("vibrate" in navigator) navigator.vibrate(30);
    try {
      const res = await api.post<CompleteResp>(
        "/api/home/today/complete",
        { itemId: item.id },
      );
      if (!res.success || !res.data) {
        if (res.error?.code === "INVALID_TODAY_ITEM") { await load(); return; }
        enhancedToast.error({
          title: "Não foi possível concluir",
          description: res.error?.message || "Tente novamente em instantes.",
        });
        return;
      }
      const data = res.data;
      if (!data.alreadyCompleted && data.xpAwarded > 0) {
        setShowConfetti(true);
        if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = window.setTimeout(() => setShowConfetti(false), 1600);
        enhancedToast.achievement({
          title: `+${data.xpAwarded} XP!`,
          description: data.currentStreak
            ? `Sequência de ${data.currentStreak} dia${data.currentStreak === 1 ? "" : "s"}.`
            : "Hoje no RAYO completo.",
          haptic: true,
        });
      } else {
        enhancedToast.info({ title: "Você já completou o Hoje no RAYO" });
      }
      setItem({ ...item, completedAt: new Date().toISOString() });
      onCompleted?.();
    } finally { setCompleting(false); }
  };

  const handleSkip = () => {
    try { localStorage.setItem(skipKey(userId), todayStr()); } catch { /* private mode */ }
    setSkipped(true);
  };

  const meta = (
    <div className="rh-hoje-main-meta">
      {item.subtitle && <span>{item.subtitle}</span>}
      {item.subtitle && minutes !== null && <span className="rh-hoje-meta-divider" />}
      {minutes !== null && <span>Leitura · {minutes} min</span>}
      <span className="rh-hoje-meta-divider" />
      <span className="rh-hoje-xp">+15 XP</span>
    </div>
  );

  return (
    <div className={`rh-hoje-main${item.coverUrl ? " has-cover" : ""}`}>
      {showConfetti && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 360}
          height={typeof window !== "undefined" ? window.innerHeight : 640}
          numberOfPieces={120}
          recycle={false}
          gravity={0.35}
          tweenDuration={1500}
          style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}
        />
      )}
      {item.coverUrl && (
        <img src={item.coverUrl} alt="" className="rh-hoje-cover" loading="lazy" />
      )}
      <div className="rh-hoje-main-eyebrow">
        {isDone ? "Concluído hoje" : "Ao vivo · em destaque"}
      </div>
      <h3 className="rh-hoje-main-title">
        {item.hook || item.title}
      </h3>
      {meta}
      <div className="rh-hoje-actions">
        {isDone ? (
          <button type="button" className="rh-hoje-btn done" disabled>
            <CheckCircle2 className="w-4 h-4" /> Feito hoje
          </button>
        ) : (
          <>
            <button
              type="button"
              className="rh-hoje-btn"
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completing ? "Marcando…" : "Marcar como feito"}
            </button>
            {item.ctaTarget && (
              <button type="button" className="rh-hoje-btn ghost" onClick={handleOpen}>
                <ExternalLink className="w-4 h-4" /> {item.ctaLabel}
              </button>
            )}
            <button
              type="button"
              className="rh-hoje-btn skip"
              onClick={handleSkip}
              aria-label="Pular hoje"
            >
              <SkipForward className="w-4 h-4" /> Pular hoje
            </button>
          </>
        )}
      </div>
    </div>
  );
}
