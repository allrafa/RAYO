// "Hoje no RAIO" — daily nudge block (Task #43).
// Sits between the stats grid and the rails on HomePage. Backend
// (/api/home/today) returns a deterministic single item per
// (user, day, segment); the user can mark it done (+15 XP, streak bump)
// or "Pular hoje" to dismiss the block locally for the rest of the day.
import { useCallback, useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { CheckCircle2, Clock, SkipForward } from "lucide-react";
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
  // Increment to force a reload (used by PullToRefresh on HomePage).
  refreshKey?: number;
  // Notify parent so dashboard stats (streak/XP) can be refetched after
  // a successful completion.
  onCompleted?: () => void;
}

const SKIP_KEY = "raio_today_skipped_date";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readSkipped(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === todayStr();
  } catch {
    return false;
  }
}

export function HojeNoRaio({ refreshKey = 0, onCompleted }: Props) {
  const [item, setItem] = useState<TodayItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [skipped, setSkipped] = useState<boolean>(() => readSkipped());
  // Lightweight confetti burst on the first successful completion of
  // the day. Auto-clears after 1.6s so the canvas doesn't linger.
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ item: TodayItem | null }>("/api/home/today");
      setItem(res.success && res.data ? res.data.item : null);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Re-check skip flag on refresh — covers crossing midnight while the
  // tab was open, after which yesterday's skip should no longer apply.
  useEffect(() => {
    setSkipped(readSkipped());
  }, [refreshKey]);

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 mb-6">
        <div className="h-44 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!item || skipped) return null;

  const isDone = !!item.completedAt;
  const minutes = item.durationSeconds
    ? Math.max(1, Math.round(item.durationSeconds / 60))
    : null;

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    if ("vibrate" in navigator) navigator.vibrate(30);
    // Open the underlying asset (video/audio/external link) when the
    // producer configured one. Completion still has to be an explicit
    // action so the user can't accidentally claim XP just by tapping
    // "Marcar feito" before actually consuming the content.
    if (item.ctaTarget) {
      window.open(item.ctaTarget, "_blank", "noopener,noreferrer");
    }
    try {
      const res = await api.post<CompleteResp>(
        "/api/home/today/complete",
        { itemId: item.id },
      );
      if (!res.success || !res.data) {
        // 409 INVALID_TODAY_ITEM happens when the client's cached item
        // is stale (e.g. tab crossed midnight). Refetch silently so the
        // user just sees today's real item.
        if (res.error?.code === "INVALID_TODAY_ITEM") {
          await load();
          return;
        }
        enhancedToast.error({
          title: "Não foi possível concluir",
          description: res.error?.message || "Tente novamente em instantes.",
        });
        return;
      }
      const data = res.data;
      if (!data.alreadyCompleted && data.xpAwarded > 0) {
        setShowConfetti(true);
        if (confettiTimeoutRef.current) {
          window.clearTimeout(confettiTimeoutRef.current);
        }
        confettiTimeoutRef.current = window.setTimeout(() => {
          setShowConfetti(false);
        }, 1600);
        enhancedToast.achievement({
          title: `+${data.xpAwarded} XP!`,
          description: data.currentStreak
            ? `Sequência de ${data.currentStreak} dia${data.currentStreak === 1 ? "" : "s"}.`
            : "Hoje no RAIO completo.",
          haptic: true,
        });
      } else {
        enhancedToast.info({
          title: "Você já completou o Hoje no RAIO",
        });
      }
      setItem({ ...item, completedAt: new Date().toISOString() });
      onCompleted?.();
    } finally {
      setCompleting(false);
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(SKIP_KEY, todayStr());
    } catch {
      // localStorage may be unavailable (private mode); fall back to
      // session-only skip.
    }
    setSkipped(true);
  };

  return (
    <div className="px-4 mb-6">
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
      <Card className="overflow-hidden border-[var(--raio-border-default)]">
        <div className="relative">
          {item.coverUrl ? (
            <div className="relative h-32 sm:h-36 overflow-hidden">
              <ImageWithFallback
                src={item.coverUrl}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
          ) : (
            <div
              className="h-24"
              style={{
                background:
                  "linear-gradient(135deg, var(--raio-gold-500), var(--raio-coral-500))",
              }}
            />
          )}
          <div className="absolute top-3 left-3">
            <Badge className="bg-black/60 text-white border-0 text-[10px] uppercase tracking-wider">
              Hoje no RAIO
            </Badge>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-display font-semibold text-base leading-snug line-clamp-2">
              {item.title}
            </h3>
            {(item.hook || item.subtitle) && (
              <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">
                {item.hook || item.subtitle}
              </p>
            )}
            {minutes !== null && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{minutes} min</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDone ? (
              <Button
                disabled
                variant="ghost"
                className="flex-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Feito hoje
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1 rounded-full bg-raio-gold-500 hover:bg-raio-gold-600 text-black font-medium"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  {completing ? "Marcando..." : item.ctaLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground"
                  onClick={handleSkip}
                >
                  <SkipForward className="w-4 h-4 mr-1" /> Pular hoje
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
