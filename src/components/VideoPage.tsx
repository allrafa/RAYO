import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, MoreVertical, ThumbsUp, ThumbsDown, Share, Download, Plus, Eye, Clock, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { enhancedToast } from "./EnhancedToast";
import { api } from "../lib/api";

interface VideoPageProps {
  videoId: string;
  onBack: () => void;
}

// Shape returned by /api/content?kind=video — the public CMS feed.
interface CmsVideo {
  id: number;
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
}

interface VideoVM {
  id: string;
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
    title: v.title,
    description: v.long_description ?? v.short_description ?? "",
    duration: formatDuration(v.duration_seconds),
    views: formatViews(v.view_count),
    uploadDate: relativeDate(v.published_at),
    thumbnail: v.cover_url ?? "",
    channel: "RAYO Academy",
    subscribers: "2.3M",
    likes: "—",
    category: v.interests?.[0] ?? "Geral",
  };
}

export function VideoPage({ videoId, onBack }: VideoPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [videos, setVideos] = useState<VideoVM[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoVM | null>(null);
  const [loading, setLoading] = useState(true);

  // Load video catalogue from the CMS public API. Falls back to a clear empty
  // state when the catalogue is empty or the request fails (no silent mocks).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.get<{ items: CmsVideo[] }>("/api/content?kind=video&limit=50");
      if (cancelled) return;
      if (res.data) {
        const mapped = res.data.items.map(mapVideo);
        setVideos(mapped);
        setCurrentVideo(mapped.find((v) => v.id === videoId) ?? mapped[0] ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [videoId]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleVideoClick = (video: VideoVM) => {
    setCurrentVideo(video);
    setIsPlaying(false);
    enhancedToast.success(`Carregando: ${video.title}`);
  };

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
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
            <ImageWithFallback
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black shadow-xl"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <Badge variant="secondary" className="bg-black/80 text-white">{currentVideo.duration}</Badge>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>

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

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2"><ThumbsUp className="w-4 h-4" />{currentVideo.likes}</Button>
                  <Button variant="outline" size="sm"><ThumbsDown className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm"><Share className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm"><MoreVertical className="w-4 h-4" /></Button>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>{currentVideo.channel}</h3>
                        <p className="text-sm" style={{ color: 'var(--rayo-ink-400)' }}>{currentVideo.subscribers} inscritos</p>
                      </div>
                      <Button className="transition-all" style={{ background: 'var(--rayo-terra-500)', color: '#FFFFFF' }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Inscrever-se
                      </Button>
                    </div>

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
