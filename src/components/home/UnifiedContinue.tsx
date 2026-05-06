import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { useApp } from "../AppContext";
import { useVideoProgress } from "../hooks/useVideoProgress";
import { useYouTubeData } from "../hooks/useYouTubeData";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Play, BookOpen, Headphones, Film, Sparkles } from "lucide-react";
import { api } from "../../lib/api";

// Task #44 — "Continue de onde parou" unificado.
// Funde cursos em progresso, conteúdos CMS recentes (do
// /api/home/continue) e vídeos do YouTube em andamento (localStorage,
// via useVideoProgress) em uma única lista, ordenada por mais recente.
// Filtros por chip ("Todos" / "Vídeos" / "Cursos" / "Áudios") são
// aplicados puramente no cliente — o backend devolve tudo o que sabe.

type Filter = "todos" | "videos" | "cursos" | "audios";

interface ServerItem {
  id: string;
  kind: "curso" | "audio" | "video" | "reels";
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  progress: number;
  lastAccessedAt: string;
  ctaTarget: string | null;
  courseId?: number;
  contentItemId?: number;
}

interface MergedItem {
  id: string;
  kind: "curso" | "audio" | "video" | "reels" | "youtube";
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  progress: number;
  lastAccessedAt: string;
  onClick: () => void;
}

interface Props {
  onOpenAcademia: () => void;
  onOpenHoje?: () => void;
}

export function UnifiedContinue({ onOpenAcademia, onOpenHoje }: Props) {
  const { user } = useAuth();
  const { setCurrentCourseId, setIsInCourseDetail } = useApp();
  const { getInProgressVideos } = useVideoProgress();
  const { data: youtubeData } = useYouTubeData();
  const [serverItems, setServerItems] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await api.get<{ items: ServerItem[] }>("/api/home/continue");
      if (cancelled) return;
      if (res.success && res.data) {
        setServerItems(res.data.items);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const items: MergedItem[] = useMemo(() => {
    const fromServer: MergedItem[] = serverItems.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      subtitle: s.subtitle,
      thumbnail: s.thumbnail,
      progress: s.progress,
      lastAccessedAt: s.lastAccessedAt,
      onClick: () => {
        if (s.kind === "curso" && s.courseId) {
          setCurrentCourseId(s.courseId);
          setIsInCourseDetail(true);
          onOpenAcademia();
          return;
        }
        if (s.ctaTarget) {
          window.open(s.ctaTarget, "_blank", "noopener,noreferrer");
        }
      },
    }));

    const ytProgress = getInProgressVideos();
    const ytById = new Map(
      (youtubeData?.videos ?? []).map((v) => [v.id, v] as const),
    );
    const fromYouTube: MergedItem[] = ytProgress
      .map((p) => {
        const v = ytById.get(p.videoId);
        if (!v) return null;
        return {
          id: `yt-${p.videoId}`,
          kind: "youtube" as const,
          title: v.title,
          subtitle: v.channelTitle ?? null,
          thumbnail: v.thumbnail,
          progress: Math.round(p.progress),
          lastAccessedAt: p.lastWatched,
          onClick: () => {
            window.open(
              `https://www.youtube.com/watch?v=${p.videoId}`,
              "_blank",
              "noopener,noreferrer",
            );
          },
        };
      })
      .filter((x): x is MergedItem => x !== null);

    const merged = [...fromServer, ...fromYouTube];
    merged.sort(
      (a, b) =>
        new Date(b.lastAccessedAt).getTime() -
        new Date(a.lastAccessedAt).getTime(),
    );
    return merged;
  }, [
    serverItems,
    getInProgressVideos,
    youtubeData,
    setCurrentCourseId,
    setIsInCourseDetail,
    onOpenAcademia,
  ]);

  const filtered = useMemo(() => {
    if (filter === "todos") return items;
    if (filter === "cursos") return items.filter((i) => i.kind === "curso");
    if (filter === "audios") return items.filter((i) => i.kind === "audio");
    return items.filter(
      (i) => i.kind === "video" || i.kind === "reels" || i.kind === "youtube",
    );
  }, [items, filter]);

  if (loading) return null;

  // Estado vazio: ainda mostramos o título + chips, mas trocamos o
  // carrossel por um CTA em vez de esconder a rail inteira — esse é o
  // "ponto de entrada universal" da Home.
  if (items.length === 0) {
    return (
      <div key="continue" className="px-4 mb-6">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">
            Continue de onde parou
          </h2>
        </header>
        <Card className="p-6 text-center border-dashed">
          <Sparkles
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: "var(--raio-accent-primary)" }}
          />
          <p className="text-sm mb-1 font-medium">Comece pelo que importa hoje</p>
          <p className="text-xs text-muted-foreground mb-4">
            Toque em um conteúdo para que ele apareça aqui amanhã.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {onOpenHoje && (
              <Button size="sm" variant="outline" onClick={onOpenHoje}>
                Ver Hoje no RAIO
              </Button>
            )}
            <Button size="sm" onClick={onOpenAcademia}>
              Explorar Academia
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div key="continue" className="px-4 mb-6">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-semibold">
          Continue de onde parou
        </h2>
      </header>

      <div
        className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Filtrar continue"
      >
        {(
          [
            { id: "todos", label: "Todos" },
            { id: "videos", label: "Vídeos" },
            { id: "cursos", label: "Cursos" },
            { id: "audios", label: "Áudios" },
          ] as Array<{ id: Filter; label: string }>
        ).map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(chip.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors"
              style={{
                background: active
                  ? "var(--raio-accent-primary)"
                  : "var(--raio-bg-tertiary)",
                color: active
                  ? "var(--raio-text-inverse)"
                  : "var(--raio-text-secondary)",
                border: "1px solid var(--raio-border-default)",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhum item nessa categoria ainda.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2" style={{ width: "max-content" }}>
            {filtered.map((item) => (
              <ContinueCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContinueCard({ item }: { item: MergedItem }) {
  const Icon = kindIcon(item.kind);
  return (
    <Card
      className="w-60 shrink-0 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={item.onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.onClick();
        }
      }}
      aria-label={`Continuar: ${item.title}`}
    >
      <div className="relative h-32 overflow-hidden bg-muted">
        {item.thumbnail ? (
          <ImageWithFallback
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
          <div
            className="h-full bg-primary rounded-r-full"
            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
          />
        </div>
        <Badge className="absolute top-2 left-2 bg-black/70 text-white text-[10px] flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {kindLabel(item.kind)}
        </Badge>
        {item.progress < 100 && (
          <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[10px]">
            {item.progress}%
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-1 mb-1">{item.title}</h3>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {item.subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function kindIcon(kind: MergedItem["kind"]) {
  if (kind === "curso") return BookOpen;
  if (kind === "audio") return Headphones;
  if (kind === "reels") return Film;
  return Play;
}

function kindLabel(kind: MergedItem["kind"]): string {
  if (kind === "curso") return "Curso";
  if (kind === "audio") return "Áudio";
  if (kind === "reels") return "Reels";
  if (kind === "youtube") return "YouTube";
  return "Vídeo";
}
