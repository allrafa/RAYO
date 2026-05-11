import { useState, useEffect, useRef } from "react";
import { Search, X, Play, Pause, Music, Star } from "lucide-react";
import { useApp } from "./AppContext";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { enhancedToast } from "./EnhancedToast";

interface PlaylistsExpandedPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistsExpandedPage({ isOpen, onClose }: PlaylistsExpandedPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { userData: _userData } = useApp();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  // Categorias (sem emojis grandes / gradients pastéis — DS v2.0).
  const playlistCategories = [
    { id: "all", name: "Todas" },
    { id: "trending", name: "Em alta" },
    { id: "communication", name: "Comunicação" },
    { id: "intimacy", name: "Intimidade" },
    { id: "conflicts", name: "Resolução" },
    { id: "parenting", name: "Filhos" },
    { id: "spirituality", name: "Fé" },
    { id: "finances", name: "Finanças" },
  ];

  // Dados mockados — substituição por API é fora de escopo desta task.
  const functionalPlaylists = {
    trending: [
      {
        id: "1",
        // Sample MP3 público (SoundHelix, royalty-free) só pra QA — substituir
        // por mídia real quando os dados migrarem pro CMS (`content_items` kind audio).
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" as string | null,
        title: "Comunicação Não-Violenta no Relacionamento",
        duration: "2h 15min",
        episodes: 12,
        category: "communication",
        isPremium: false,
        rating: 4.9,
        plays: 15420,
        image: "https://images.unsplash.com/photo-1556858310-a0bbdbb87272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBpbnRpbWF0ZSUyMGNvbnZlcnNhdGlvbiUyMHBlYWNlZnVsfGVufDF8fHx8MTc1OTc4NTkxOHww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Transforme conflitos em conexão",
        isNew: false,
      },
      {
        id: "2",
        title: "Reavivando a Intimidade Perdida",
        duration: "1h 45min",
        episodes: 8,
        category: "intimacy",
        isPremium: true,
        rating: 4.8,
        plays: 12890,
        image: "https://images.unsplash.com/photo-1755884684493-16b21f4adf96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyb21hbnRpYyUyMGNvdXBsZSUyMGNvbm5lY3Rpb24lMjBsb3ZlfGVufDF8fHx8MTc1OTc4NTkyMnww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Reconecte-se em um nível mais profundo",
        isNew: true,
      },
    ],
    communication: [
      {
        id: "3",
        title: "Escuta Ativa: A Arte de Ouvir de Verdade",
        duration: "1h 30min",
        episodes: 6,
        category: "communication",
        isPremium: false,
        rating: 4.7,
        plays: 8750,
        image: "https://images.unsplash.com/photo-1604313477128-4e121c72c5ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXN0ZW5pbmclMjBhY3RpdmUlMjBjb21tdW5pY2F0aW9uJTIwdGhlcmFweXxlbnwxfHx8fDE3NTk3ODU5MjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Melhore sua capacidade de ouvir",
        isNew: false,
      },
      {
        id: "4",
        title: "Expressando Necessidades Sem Atacar",
        duration: "2h 00min",
        episodes: 10,
        category: "communication",
        isPremium: true,
        rating: 4.9,
        plays: 11200,
        image: "https://images.unsplash.com/photo-1556858310-a0bbdbb87272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBpbnRpbWF0ZSUyMGNvbnZlcnNhdGlvbiUyMHBlYWNlZnVsfGVufDF8fHx8MTc1OTc4NTkxOHww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Comunique-se sem ferir",
        isNew: false,
      },
    ],
    intimacy: [
      {
        id: "5",
        title: "5 Linguagens do Amor na Prática",
        duration: "1h 20min",
        episodes: 5,
        category: "intimacy",
        isPremium: false,
        rating: 4.8,
        plays: 18650,
        image: "https://images.unsplash.com/photo-1758874089525-3a9bb15a125b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxsb3ZlJTIwbGFuZ3VhZ2VzJTIwY291cGxlJTIwdG91Y2h8ZW58MXx8fHwxNzU5Nzg1OTM2fDA&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Descubra como amar melhor",
        isNew: false,
      },
    ],
    conflicts: [
      {
        id: "6",
        title: "Resolvendo Conflitos com Sabedoria",
        duration: "2h 30min",
        episodes: 14,
        category: "conflicts",
        isPremium: true,
        rating: 4.9,
        plays: 9850,
        image: "https://images.unsplash.com/photo-1746128820947-b7dae1bab3f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjb3VwbGUlMjBjb25mbGljdCUyMHJlc29sdXRpb24lMjBwZWFjZWZ1bHxlbnwxfHx8fDE3NTk3ODU5Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Transforme brigas em crescimento",
        isNew: true,
      },
    ],
    parenting: [
      {
        id: "7",
        title: "Educação Positiva: Criando com Amor",
        duration: "3h 15min",
        episodes: 18,
        category: "parenting",
        isPremium: true,
        rating: 4.9,
        plays: 14200,
        image: "https://images.unsplash.com/photo-1628676348963-f88c671333f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxoYXBweSUyMGZhbWlseSUyMHBhcmVudGluZyUyMGNoaWxkcmVufGVufDF8fHx8MTc1OTc4NTkyOXww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Eduque sem gritar nem castigar",
        isNew: false,
      },
    ],
    spirituality: [
      {
        id: "8",
        title: "Oração em Família: Fortalecendo Vínculos",
        duration: "1h 50min",
        episodes: 9,
        category: "spirituality",
        isPremium: false,
        rating: 4.7,
        plays: 7350,
        image: "https://images.unsplash.com/photo-1606898058619-45956523572f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxwcmF5ZXIlMjBzcGlyaXR1YWwlMjBmYW1pbHklMjBwZWFjZWZ1bHxlbnwxfHx8fDE3NTk3ODU5MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Una sua família através da fé",
        isNew: false,
      },
    ],
    finances: [
      {
        id: "9",
        title: "Finanças do Casal: Prosperidade Juntos",
        duration: "2h 40min",
        episodes: 16,
        category: "finances",
        isPremium: true,
        rating: 4.8,
        plays: 10750,
        image: "https://images.unsplash.com/photo-1624953901694-f78005396ed1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjb3VwbGUlMjBmaW5hbmNlJTIwcGxhbm5pbmclMjBwcm9zcGVyaXR5fGVufDF8fHx8MTc1OTc4NTkzNHww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Construam riqueza em harmonia",
        isNew: true,
      },
    ],
  };

  const getAllPlaylists = () => Object.values(functionalPlaylists).flat();

  const getFilteredPlaylists = () => {
    let playlists =
      selectedCategory === "all"
        ? getAllPlaylists()
        : functionalPlaylists[selectedCategory as keyof typeof functionalPlaylists] || [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      playlists = playlists.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.overlayText.toLowerCase().includes(query),
      );
    }

    return playlists;
  };

  const filteredPlaylists = getFilteredPlaylists();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  // Task #172 — player real via AudioPlayerContext (mini-player global).
  // Cards mock não têm audio_url ainda; o card seed "1" recebeu uma
  // amostra pública pra QA conseguir validar end-to-end. Cards sem URL
  // mostram "Em breve" honesto.
  const handlePlayPause = (playlist: { id: string; title: string; image: string; audio_url?: string | null }) => {
    if (!playlist.audio_url) {
      enhancedToast.info("Em breve");
      return;
    }
    playTrack({
      id: `playlist-${playlist.id}`,
      title: playlist.title,
      subtitle: "Playlist funcional",
      audioUrl: playlist.audio_url,
      coverUrl: playlist.image,
    });
  };

  if (!isOpen) return null;

  const activeCategoryName =
    playlistCategories.find((c) => c.id === selectedCategory)?.name || "Todas";

  return (
    <div className="rh-pl-page" role="dialog" aria-modal="true" aria-label="Playlists Funcionais">
      {/* Header */}
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

      {/* Category pills */}
      <div className="rh-pl-cat-row" role="tablist" aria-label="Categorias">
        {playlistCategories.map((category) => {
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

      {/* Body */}
      <div className="rh-pl-body">
        <p className="rh-pl-meta">
          {activeCategoryName} · {filteredPlaylists.length} playlist
          {filteredPlaylists.length !== 1 ? "s" : ""}
        </p>

        {filteredPlaylists.length > 0 ? (
          <div className="rh-pl-grid">
            {filteredPlaylists.map((playlist) => {
              const isCurrent = currentTrack?.id === `playlist-${playlist.id}` && isPlaying;
              return (
                <button
                  key={playlist.id}
                  type="button"
                  className="rh-pl-card"
                  onClick={() => handlePlayPause(playlist as { id: string; title: string; image: string; audio_url?: string | null })}
                  aria-label={`${isCurrent ? "Pausar" : "Tocar"} playlist ${playlist.title}`}
                >
                  <div className="rh-pl-cover">
                    <img src={playlist.image} alt="" loading="lazy" />

                    {playlist.isNew && <span className="rh-pl-new" aria-label="Nova" />}
                    {playlist.isPremium && <span className="rh-pl-pro">PRO</span>}

                    <span className="rh-pl-tag">
                      {playlist.episodes} episódios
                    </span>

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
                      <Star className="star w-3 h-3" aria-hidden="true" fill="currentColor" />
                      <span>{playlist.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span>{playlist.duration}</span>
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
            <h3 className="rh-pl-empty-title">Nenhuma playlist encontrada</h3>
            <p className="rh-pl-empty-sub">
              Tente ajustar sua busca ou explorar outras categorias para descobrir conteúdos.
            </p>
            <button
              type="button"
              className="rh-pl-empty-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Ver todas as playlists
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
