import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Play, Pause, Heart, Shuffle, MoreHorizontal, Clock, Eye, Loader2, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { enhancedToast } from "./EnhancedToast";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { api } from "../lib/api";

interface MusicPageProps {
  onBack: () => void;
}

interface CmsAudio {
  id: number;
  title: string;
  short_description: string | null;
  cover_url: string | null;
  duration_seconds: number | null;
  is_premium: boolean;
  view_count: number;
  published_at: string | null;
  interests: string[];
  media_url: string | null;
  external_url: string | null;
}

interface AudioGroup {
  id: string;
  name: string;
  items: CmsAudio[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function MusicPage({ onBack }: MusicPageProps) {
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [items, setItems] = useState<CmsAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Carrega áudios reais publicados no CMS (kind=audio).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const res = await api.get<{ items: CmsAudio[] }>("/api/content?kind=audio&limit=50");
      if (cancelled) return;
      if (res.success && res.data) {
        setItems(res.data.items ?? []);
      } else {
        setItems([]);
        setLoadError(res.error?.message ?? "Não foi possível carregar a biblioteca de áudios.");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Agrupa por primeiro `interest` do item; itens sem interest caem em "Geral".
  const groups: AudioGroup[] = useMemo(() => {
    const map = new Map<string, CmsAudio[]>();
    for (const it of items) {
      const key = (it.interests ?? [])[0]?.trim() || "Geral";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([name, list]) => ({ id: name, name, items: list }));
  }, [items]);

  const handlePlay = (audio: CmsAudio) => {
    const audioUrl = audio.media_url ?? audio.external_url ?? null;
    if (!audioUrl) {
      enhancedToast.info("Faixa sem mídia. Atualize o conteúdo no CMS.");
      return;
    }
    playTrack({
      id: `music-${audio.id}`,
      title: audio.title,
      subtitle: audio.interests?.[0] ?? "Áudio",
      audioUrl,
      coverUrl: audio.cover_url ?? undefined,
    });
  };

  const handleShuffle = () => {
    if (items.length === 0) {
      enhancedToast.info("Nenhum áudio publicado para tocar.");
      return;
    }
    const playable = items.filter((it) => it.media_url || it.external_url);
    if (playable.length === 0) {
      enhancedToast.info("Nenhum áudio com mídia disponível.");
      return;
    }
    const pick = playable[Math.floor(Math.random() * playable.length)];
    handlePlay(pick);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rayo-forest-50 to-rayo-lime-50">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Biblioteca de Áudios</h1>
                <p className="text-sm text-muted-foreground">
                  Conteúdo em áudio publicado pela equipe RAYO
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShuffle} disabled={loading || items.length === 0}>
              <Shuffle className="w-4 h-4 mr-2" />
              Aleatório
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rayo-forest-600 to-rayo-lime-600 p-8 text-white">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Áudio que transforma</h2>
            <p className="text-white/90 mb-4 max-w-md">
              Toque qualquer faixa abaixo — o player flutuante segue com você por toda a navegação.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="absolute bottom-0 right-8 w-24 h-24 bg-white/5 rounded-full"></div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Carregando áudios…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Music className="w-10 h-10 mb-3" />
            <h3 className="font-semibold mb-2 text-foreground">
              {loadError ? "Não foi possível carregar a biblioteca" : "Ainda não há áudios publicados"}
            </h3>
            <p className="text-sm max-w-md">
              {loadError
                ? loadError
                : "Produtores podem cadastrar áudios em Admin → CMS → novo conteúdo (tipo Áudio)."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-rayo-forest-500 to-rayo-lime-500 flex items-center justify-center text-white">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.items.length} áudio{group.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-2" style={{ width: "max-content" }}>
                  {group.items.map((audio) => {
                    const trackId = `music-${audio.id}`;
                    const active = currentTrack?.id === trackId && isPlaying;
                    return (
                      <Card
                        key={audio.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${active ? "Pausar" : "Reproduzir"} ${audio.title}`}
                        className="w-64 hover:shadow-lg transition-all duration-300 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rayo-terra-500"
                        onClick={() => handlePlay(audio)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handlePlay(audio);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                {audio.title}
                              </h4>
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDuration(audio.duration_seconds)}
                                </span>
                                {audio.view_count > 0 && (
                                  <span className="flex items-center">
                                    <Eye className="w-3 h-3 mr-1" />
                                    {formatPlays(audio.view_count)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Favoritar (em breve)"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Heart className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Mais opções (em breve)"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            {audio.is_premium ? (
                              <Badge variant="secondary" className="text-xs">PRO</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Áudio</Badge>
                            )}
                            <Button
                              size="sm"
                              aria-label={(active ? "Pausar " : "Reproduzir ") + audio.title}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlay(audio);
                              }}
                              className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"
                            >
                              {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
