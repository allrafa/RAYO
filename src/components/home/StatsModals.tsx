import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Flame, Trophy, Zap, CheckCircle2, Lock } from "lucide-react";
import { api } from "../../lib/api";

// Task #44 — Modais que abrem ao tocar nos 3 stats da Home.
//   • Sequência → calendário de hábitos (últimos 30 dias)
//   • Nível    → badges/conquistas
//   • XP semanal → histórico (últimas 6 semanas + top motivos)

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Streak calendar ─────────────────────────────────────────────────
interface StreakResp {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  days: Array<{ date: string; active: boolean }>;
}

export function StreakCalendarModal({ open, onOpenChange }: ModalProps) {
  const [data, setData] = useState<StreakResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await api.get<StreakResp>("/api/home/streak-calendar");
      if (cancelled) return;
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame
              className="w-5 h-5"
              style={{ color: "var(--rayo-ochre-500)" }}
            />
            Sua sequência
          </DialogTitle>
          <DialogDescription>
            Cada dia com pelo menos uma ação no RAYO conta para sua sequência.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <p className="text-sm text-muted-foreground py-4">Carregando…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">{data.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Dias seguidos</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">{data.longestStreak}</p>
                <p className="text-xs text-muted-foreground">Maior sequência</p>
              </Card>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Últimos {data.days.length} dias
              </p>
              <div className="grid grid-cols-10 gap-1.5">
                {data.days.map((d) => (
                  <div
                    key={d.date}
                    title={d.date}
                    className="aspect-square rounded-md"
                    style={{
                      background: d.active
                        ? "var(--rayo-ochre-500)"
                        : "var(--rayo-sand-300)",
                      border: "1px solid var(--rayo-sand-300)",
                      opacity: d.active ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Badges modal ────────────────────────────────────────────────────
interface BadgeRow {
  id: number;
  name: string;
  title: string;
  description: string;
  icon: string;
  tier: string;
  earned: boolean;
  earnedAt: string | null;
}

export function BadgesModal({ open, onOpenChange }: ModalProps) {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await api.get<{ badges: BadgeRow[] }>(
        "/api/gamification/badges",
      );
      if (cancelled) return;
      if (res.success && res.data) setBadges(res.data.badges);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy
              className="w-5 h-5"
              style={{ color: "var(--rayo-ochre-700)" }}
            />
            Suas conquistas
          </DialogTitle>
          <DialogDescription>
            {badges.length > 0
              ? `${earnedCount} de ${badges.length} conquistas desbloqueadas.`
              : "Avance no RAYO para desbloquear conquistas."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Carregando…</p>
        ) : badges.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Ainda não há conquistas configuradas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => (
              <Card
                key={b.id}
                className="p-3 text-center"
                style={{ opacity: b.earned ? 1 : 0.55 }}
              >
                <div className="text-3xl mb-1">{b.icon || "🏅"}</div>
                <p className="text-sm font-medium line-clamp-1">{b.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[28px]">
                  {b.description}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1 text-[11px]">
                  {b.earned ? (
                    <>
                      <CheckCircle2
                        className="w-3 h-3"
                        style={{ color: "var(--rayo-sage-500)" }}
                      />
                      <span style={{ color: "var(--rayo-sage-500)" }}>
                        Desbloqueada
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Bloqueada</span>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── XP history modal ────────────────────────────────────────────────
interface XPHistResp {
  weeks: Array<{ weekStart: string; total: number }>;
  topReasons: Array<{ reason: string; total: number }>;
}

const REASON_LABELS: Record<string, string> = {
  watch_lesson: "Aulas assistidas",
  complete_exercise: "Exercícios",
  complete_course: "Cursos concluídos",
  get_certificate: "Certificados",
  create_post: "Posts criados",
  create_comment: "Comentários",
  receive_like: "Curtidas recebidas",
  helpful_comment: "Comentário útil",
  community_interact: "Interações na comunidade",
  daily_mission: "Missões diárias",
  weekly_mission: "Missões semanais",
  streak_day: "Sequência diária",
  streak_week: "Sequência semanal",
  daily_login: "Login diário",
  today_complete: "Hoje no RAYO",
};

export function XPHistoryModal({ open, onOpenChange }: ModalProps) {
  const [data, setData] = useState<XPHistResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await api.get<XPHistResp>("/api/home/xp-history?weeks=6");
      if (cancelled) return;
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const max = Math.max(1, ...(data?.weeks.map((w) => w.total) ?? [1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap
              className="w-5 h-5"
              style={{ color: "var(--rayo-terra-500)" }}
            />
            Seu XP
          </DialogTitle>
          <DialogDescription>
            Veja como seu engajamento evolui semana a semana.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <p className="text-sm text-muted-foreground py-4">Carregando…</p>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Últimas 6 semanas
              </p>
              {data.weeks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Sem XP registrado ainda. Comece pelo "Hoje no RAYO".
                </p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {data.weeks.map((w) => (
                    <div
                      key={w.weekStart}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${w.weekStart}: ${w.total} XP`}
                    >
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: `${(w.total / max) * 100}%`,
                          minHeight: w.total > 0 ? "4px" : "2px",
                          background:
                            "linear-gradient(180deg, var(--rayo-terra-500), var(--rayo-terra-700))",
                          opacity: w.total > 0 ? 1 : 0.3,
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {formatWeek(w.weekStart)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.topReasons.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  De onde vem seu XP
                </p>
                <div className="space-y-1.5">
                  {data.topReasons.map((r) => (
                    <div
                      key={r.reason}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{REASON_LABELS[r.reason] ?? r.reason}</span>
                      <Badge variant="secondary">+{r.total} XP</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatWeek(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}`;
  } catch {
    return iso.slice(5);
  }
}
