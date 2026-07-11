import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Clock, Loader2 } from "lucide-react";
import { FavoriteButton } from "./FavoriteButton";
import { NativeShare } from "./NativeShare";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { enhancedToast } from "./EnhancedToast";
import { api } from "../lib/api";
import { RayoVideoPlayer } from "./RayoVideoPlayer";

interface VideoPageProps {
  videoId: string;
  onBack: () => void;
}

// Shape returned by /api/content?kind=video — the public CMS feed.
interface CmsVideo {
  id: number;
  kind?: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
  interests: string[];
  external_url: string | null;
  media_url: string | null;
  // Task #86 — Bunny Stream (campos derivados pelo backend).
  video_provider: string | null;
  video_status: string | null;
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
}

interface VideoVM {
  id: string;
  kind: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  uploadDate: string;
  thumbnail: string;
  channel: string;
  subscribers: string;
  likes: string;
  category: string;
  video_provider: string | null;
  video_status: string | null;
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
  external_url: string | null;
  cover_url: string | null;
  media_url: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function relativeDate(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "hoje";
  if (days < 7) return `${days} ${days === 1 ? "dia" : "dias"} atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semana(s) atrás`;
  if (days < 365) return `${Math.floor(days / 30)} mês(es) atrás`;
  return `${Math.floor(days / 365)} ano(s) atrás`;
}

function mapVideo(v: CmsVideo): VideoVM {
  return {
    id: String(v.id),
    kind: v.kind ?? "video",
    title: v.title,
    description: v.long_description ?? v.short_description ?? "",
    duration: formatDuration(v.duration_seconds),
    views: formatViews(v.view_count),
    uploadDate: relativeDate(v.published_at),
    thumbnail: v.video_thumbnail_url ?? v.cover_url ?? "",
    channel: "RAYO Academy",
    subscribers: "2.3M",
    likes: "—",
    category: v.interests?.[0] ?? "Geral",
    video_provider: v.video_provider,
    video_status: v.video_status,
    video_embed_url: v.video_embed_url,
    video_thumbnail_url: v.video_thumbnail_url,
    external_url: v.external_url,
    cover_url: v.cover_url,
    media_url: v.media_url,
  };
}

export function VideoPage({ videoId, onBack }: VideoPageProps) {
  const [showDescription, setShowDescription] = useState(false);
  const [videos, setVideos] = useState<VideoVM[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoVM | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the requested item by id (covers audio/reels/video kinds, not just
  // the video feed) plus a small list of related videos. Task #168 — antes
  // o componente buscava só `kind=video&limit=50` e descartava o id quando
  // o conteúdo era audio/reels, fazendo o player abrir o "primeiro vídeo
  // disponível" em vez do conteúdo solicitado.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [byId, listRes] = await Promise.all([
        api.get<{ item: CmsVideo }>(`/api/content/${encodeURIComponent(videoId)}`),
        api.get<{ items: CmsVideo[] }>("/api/content?kind=video&limit=20"),
      ]);
      if (cancelled) return;
      const mapped = listRes.data ? listRes.data.items.map(mapVideo) : [];
      setVideos(mapped);
      // Task #168 — só usamos o item solicitado (ou um match exato na
      // lista de relacionados). Não caímos pra `mapped[0]`: abrir um
      // vídeo aleatório quando o id pedido falha confunde o usuário
      // (ele clicou num conteúdo específico). Sem match → empty state.
      const target = byId.data?.item
        ? mapVideo(byId.data.item)
        : mapped.find((v) => v.id === videoId) ?? null;
      setCurrentVideo(target);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  const handleVideoClick = (video: VideoVM) => {
    setCurrentVideo(video);
    enhancedToast.success(`Carregando: ${video.title}`);
  };

  // Task #168 — Esc fecha o player.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--rayo-sand-100)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--rayo-ink-700)' }} />
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: 'var(--rayo-sand-100)' }}>
        <p style={{ color: 'var(--rayo-ink-700)' }}>Nenhum vídeo publicado ainda.</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const relatedVideos = videos.filter((v) => v.id !== currentVideo.id);

  return (
    <div className="min-h-screen" style={{ background: 'var(--rayo-sand-100)' }}>
      <div
        className="sticky top-0 z-50 backdrop-blur-sm px-4 py-3"
        style={{
          background: 'var(--rayo-sand-100)',
          opacity: 0.95,
          borderBottom: '1px solid var(--rayo-sand-300)'
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            style={{ color: 'var(--rayo-forest-900)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg truncate flex-1" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
            {currentVideo.title}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="w-full">
          <RayoVideoPlayer
            title={currentVideo.title}
            cover_url={currentVideo.cover_url}
            video_provider={currentVideo.video_provider}
            video_status={currentVideo.video_status}
            video_embed_url={currentVideo.video_embed_url}
            video_thumbnail_url={currentVideo.video_thumbnail_url}
            external_url={currentVideo.external_url}
            media_url={currentVideo.media_url}
            kind={currentVideo.kind}
          />

          <div className="mt-4 space-y-4">
            <div>
              <h1 className="text-xl leading-tight mb-2" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
                {currentVideo.title}
              </h1>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--rayo-ink-400)' }}>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{currentVideo.views} visualizações</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{currentVideo.uploadDate}</span>
                  </div>
                </div>

                {/* UX_PLAN.md J3 — ações REAIS no lugar dos botões decorativos
                    (like/dislike/share sem onClick confundiam). Salvar usa
                    favoritos; Compartilhar usa o share nativo do celular. */}
                <div className="flex items-center gap-2">
                  <FavoriteButton
                    id={Number(currentVideo.id)}
                    type="video"
                    variant="outline"
                    showLabel
                  />
                  <NativeShare
                    data={{
                      title: currentVideo.title,
                      text: `Assista "${currentVideo.title}" no RAYO`,
                      url: typeof window !== "undefined" ? window.location.href : "",
                    }}
                    variant="button"
                  />
                </div>
              </div>
            </div>

            <Card style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--rayo-terra-500) 0%, var(--rayo-terra-700) 100%)' }}
                  >
                    <span className="text-white text-sm" style={{ fontWeight: 700 }}>R</span>
                  </div>

                  <div className="flex-1">
                    {/* Sem "Inscrever-se"/"X inscritos" fake (UX_PLAN J3) —
                        aqui é conteúdo do RAYO, não um canal de YouTube. */}
                    <h3 style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>{currentVideo.channel}</h3>

                    <div className="mt-3">
                      <p className="text-sm leading-relaxed">
                        {showDescription ? currentVideo.description : `${currentVideo.description.slice(0, 150)}${currentVideo.description.length > 150 ? "..." : ""}`}
                      </p>
                      {currentVideo.description.length > 150 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 px-0 h-auto font-semibold text-foreground hover:bg-transparent"
                          onClick={() => setShowDescription(!showDescription)}
                        >
                          {showDescription ? "Mostrar menos" : "Mostrar mais"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedVideos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
              Vídeos relacionados
            </h2>

            <div className="space-y-4">
              {relatedVideos.map((video) => (
                <Card
                  key={video.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleVideoClick(video)}
                  style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        <Badge variant="secondary" className="absolute bottom-1 right-1 text-xs bg-black/80 text-white">
                          {video.duration}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm leading-tight line-clamp-2 mb-1" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
                          {video.title}
                        </h3>
                        <p className="text-xs mb-2" style={{ color: 'var(--rayo-ink-400)' }}>{video.channel}</p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
                          <span>{video.views} visualizações</span>
                          <span>•</span>
                          <span>{video.uploadDate}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="mt-2 text-xs"
                          style={{ borderColor: 'var(--rayo-sand-300)', color: 'var(--rayo-ink-700)' }}
                        >
                          {video.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
