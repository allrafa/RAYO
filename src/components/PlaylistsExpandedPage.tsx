import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Play, Pause, Music, Loader2 } from "lucide-react";
import { useApp } from "./AppContext";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { enhancedToast } from "./EnhancedToast";
import { api } from "../lib/api";

// Shape returned by /api/content?kind=audio (CMS público).
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

interface PlaylistsExpandedPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLACEHOLDER_COVER =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function isRecent(iso: string | null): boolean {
  if (!iso) return false;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return days >= 0 && days <= 14;
}

export function PlaylistsExpandedPage({ isOpen, onClose }: PlaylistsExpandedPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [items, setItems] = useState<CmsAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { userData: _userData } = useApp();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  // Carrega áudios reais publicados no CMS (kind=audio). Sem fallback
  // pra mocks: se vier vazio, mostramos empty state honesto pro produtor
  // saber que precisa cadastrar conteúdo.
  useEffect(() => {
    if (!isOpen) return;
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
        setLoadError(res.error?.message ?? "Não foi possível carregar as playlists.");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Categorias derivadas dos `interests` reais dos itens. Mantém "Todas"
  // como primeira opção.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      for (const i of it.interests ?? []) {
        if (i.trim()) set.add(i.trim());
      }
    }
    const ordered = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [{ id: "all", name: "Todas" }, ...ordered.map((id) => ({ id, name: id }))];
  }, [items]);

  const filteredPlaylists = useMemo(() => {
    let list = items;
    if (selectedCategory !== "all") {
      list = list.filter((p) => (p.interests ?? []).includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.short_description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, selectedCategory, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  const handlePlayPause = (playlist: CmsAudio) => {
    const audioUrl = playlist.media_url ?? playlist.external_url ?? null;
    if (!audioUrl) {
      enhancedToast.info("Faixa sem mídia. Atualize o conteúdo no CMS.");
      return;
    }
    playTrack({
      id: `playlist-${playlist.id}`,
      title: playlist.title,
      subtitle: playlist.interests?.[0] ?? "Áudio",
      audioUrl,
      coverUrl: playlist.cover_url ?? undefined,
    });
  };

  if (!isOpen) return null;

  const activeCategoryName =
    categories.find((c) => c.id === selectedCategory)?.name || "Todas";

  return (
    <div className="rh-pl-page" role="dialog" aria-modal="true" aria-label="Playlists Funcionais">
      <div className="rh-pl-head">
        <p className="rh-pl-eyebrow">Coleções · Áudio</p>
        <div className="rh-pl-title-row">
          <h1 className="rh-pl-title">
            Playlists <span className="rh-pl-title-light">para você</span>
          </h1>
          <button type="button" className="rh-pl-action" onClick={onClose}>
            Fechar →
          </button>
        </div>

        <div className="rh-pl-search-wrap">
          <Search className="rh-pl-search-icon w-4 h-4" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar playlists funcionais…"
            className="rh-pl-search"
            aria-label="Buscar playlists"
          />
          {searchQuery && (
            <button
              type="button"
              className="rh-pl-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="rh-pl-cat-row" role="tablist" aria-label="Categorias">
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`rh-pl-cat ${isActive ? "active" : ""}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="rh-pl-body">
        <p className="rh-pl-meta">
          {activeCategoryName} · {filteredPlaylists.length} áudio
          {filteredPlaylists.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="rh-pl-empty">
            <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
            <p className="rh-pl-empty-sub">Carregando áudios…</p>
          </div>
        ) : filteredPlaylists.length > 0 ? (
          <div className="rh-pl-grid">
            {filteredPlaylists.map((playlist) => {
              const isCurrent = currentTrack?.id === `playlist-${playlist.id}` && isPlaying;
              const cover = playlist.cover_url ?? PLACEHOLDER_COVER;
              const overlay = playlist.short_description ?? "";
              return (
                <button
                  key={playlist.id}
                  type="button"
                  className="rh-pl-card"
                  onClick={() => handlePlayPause(playlist)}
                  aria-label={`${isCurrent ? "Pausar" : "Reproduzir"} áudio ${playlist.title}`}
                >
                  <div className="rh-pl-cover">
                    <img src={cover} alt="" loading="lazy" />

                    {isRecent(playlist.published_at) && (
                      <span className="rh-pl-new" aria-label="Novo" />
                    )}
                    {playlist.is_premium && <span className="rh-pl-pro">PRO</span>}

                    {playlist.duration_seconds ? (
                      <span className="rh-pl-tag">
                        {formatDuration(playlist.duration_seconds)}
                      </span>
                    ) : null}

                    <span
                      className="rh-pl-play"
                      role="presentation"
                      aria-hidden="true"
                    >
                      {isCurrent ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" style={{ marginLeft: 2 }} />
                      )}
                    </span>
                  </div>

                  <div className="rh-pl-foot">
                    <h3 className="rh-pl-foot-title">{playlist.title}</h3>
                    <p className="rh-pl-foot-meta">
                      {overlay && <span>{overlay}</span>}
                      {overlay && playlist.view_count > 0 && <span>·</span>}
                      {playlist.view_count > 0 && (
                        <span>{formatPlays(playlist.view_count)} plays</span>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rh-pl-empty">
            <div className="rh-pl-empty-icon">
              <Music className="w-7 h-7" />
            </div>
            <h3 className="rh-pl-empty-title">
              {loadError
                ? "Não foi possível carregar as playlists"
                : items.length === 0
                  ? "Ainda não há áudios publicados"
                  : "Nenhum áudio encontrado"}
            </h3>
            <p className="rh-pl-empty-sub">
              {loadError
                ? loadError
                : items.length === 0
                  ? "Produtores podem cadastrar áudios em Admin → CMS → novo conteúdo (tipo Áudio)."
                  : "Tente ajustar sua busca ou explorar outras categorias."}
            </p>
            {items.length > 0 && (
              <button
                type="button"
                className="rh-pl-empty-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Ver todos os áudios
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
