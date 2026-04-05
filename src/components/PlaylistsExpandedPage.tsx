import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, X, Clock, Heart, BookOpen, Users, MessageCircle, Video, Music, GraduationCap, Headphones, Baby, Mic, Camera, Play, Pause, Volume2, Volume1, VolumeX, Shuffle, Repeat, MoreHorizontal, Star, TrendingUp, Award, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { useApp } from "./AppContext";

interface PlaylistsExpandedPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistsExpandedPage({ isOpen, onClose }: PlaylistsExpandedPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { userData } = useApp();

  // Categorias de playlists funcionais
  const playlistCategories = [
    { id: "all", name: "Todas", icon: "🎵", color: "from-slate-100 to-slate-200" },
    { id: "trending", name: "Em alta", icon: "🔥", color: "from-red-100 to-orange-200" },
    { id: "communication", name: "Comunicação", icon: "💬", color: "from-blue-100 to-blue-200" },
    { id: "intimacy", name: "Intimidade", icon: "❤️", color: "from-rose-100 to-pink-200" },
    { id: "conflicts", name: "Resolução", icon: "⚖️", color: "from-yellow-100 to-amber-200" },
    { id: "parenting", name: "Filhos", icon: "👶", color: "from-green-100 to-emerald-200" },
    { id: "spirituality", name: "Fé", icon: "🙏", color: "from-purple-100 to-violet-200" },
    { id: "finances", name: "Finanças", icon: "💰", color: "from-emerald-100 to-teal-200" }
  ];

  // Playlists funcionais expandidas com foco visual
  const functionalPlaylists = {
    trending: [
      {
        id: "1",
        title: "Comunicação Não-Violenta no Relacionamento",
        duration: "2h 15min",
        episodes: 12,
        category: "communication",
        isPremium: false,
        rating: 4.9,
        plays: 15420,
        image: "https://images.unsplash.com/photo-1556858310-a0bbdbb87272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBpbnRpbWF0ZSUyMGNvbnZlcnNhdGlvbiUyMHBlYWNlZnVsfGVufDF8fHx8MTc1OTc4NTkxOHww&ixlib=rb-4.1.0&q=80&w=1080",
        overlayText: "Transforme conflitos em conexão",
        badgeText: "12 episódios",
        isNew: false
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
        badgeText: "8 episódios • PRO",
        isNew: true
      }
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
        badgeText: "6 episódios",
        isNew: false
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
        badgeText: "10 episódios • PRO",
        isNew: false
      }
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
        badgeText: "5 episódios",
        isNew: false
      }
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
        badgeText: "14 episódios • PRO",
        isNew: true
      }
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
        badgeText: "18 episódios • PRO",
        isNew: false
      }
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
        badgeText: "9 episódios",
        isNew: false
      }
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
        badgeText: "16 episódios • PRO",
        isNew: true
      }
    ]
  };

  // Obter todas as playlists
  const getAllPlaylists = () => {
    return Object.values(functionalPlaylists).flat();
  };

  // Filtrar playlists
  const getFilteredPlaylists = () => {
    let playlists = selectedCategory === "all" ? getAllPlaylists() : functionalPlaylists[selectedCategory as keyof typeof functionalPlaylists] || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      playlists = playlists.filter(playlist => 
        playlist.title.toLowerCase().includes(query) ||
        playlist.overlayText.toLowerCase().includes(query)
      );
    }
    
    return playlists;
  };

  const filteredPlaylists = getFilteredPlaylists();

  // Focar no input quando abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  const handlePlayPause = (playlistId: string) => {
    if (currentPlayingId === playlistId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlayingId(playlistId);
      setIsPlaying(true);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar playlists funcionais..."
              className="pl-10 pr-10 bg-muted/50 border-none"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {playlistCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0 text-xs"
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">
              {playlistCategories.find(c => c.id === selectedCategory)?.icon || "🎵"}
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {selectedCategory === "all" ? "Playlists Funcionais" : playlistCategories.find(c => c.id === selectedCategory)?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''} • Conteúdo transformador para sua jornada
              </p>
            </div>
          </div>
          
          {selectedCategory !== "all" && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
              <p className="text-sm text-muted-foreground">
                ✨ Explore conteúdos cuidadosamente selecionados para fortalecer relacionamentos e transformar vidas
              </p>
            </div>
          )}
        </div>

        {/* Playlists Visual Grid */}
        <div className="grid gap-4 md:gap-6">
          {filteredPlaylists.map((playlist) => (
            <div key={playlist.id} className="group cursor-pointer">
              {/* Main Image Card */}
              <div className="relative w-full h-48 md:h-56 lg:h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={playlist.image}
                  alt={playlist.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Dark overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10"></div>
                
                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
                  {/* Top badges */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {playlist.isNew && (
                      <Badge className="bg-green-500 text-white text-xs font-semibold px-2 py-1 shadow-lg">
                        NOVO
                      </Badge>
                    )}
                    {playlist.isPremium && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-semibold px-2 py-1 shadow-lg">
                        PRO
                      </Badge>
                    )}
                  </div>

                  {/* Play button */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-90 transition-all duration-300 scale-0 group-hover:scale-100">
                    <Button
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(playlist.id);
                      }}
                      className="h-14 w-14 rounded-full bg-white/90 hover:bg-white text-black hover:text-black p-0 shadow-xl backdrop-blur-sm hover:scale-110 transition-all duration-200"
                    >
                      {currentPlayingId === playlist.id && isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Bottom content */}
                  <div className="space-y-2">
                    {/* Badge with episode count */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs backdrop-blur-sm border-white/30">
                        {playlist.badgeText}
                      </Badge>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1 text-white/90">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{playlist.rating}</span>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-white font-semibold text-lg md:text-xl leading-tight line-clamp-2">
                      {playlist.title}
                    </h3>
                    
                    {/* Subtitle */}
                    <p className="text-white/90 text-sm md:text-base line-clamp-2 leading-relaxed">
                      {playlist.overlayText}
                    </p>

                    {/* Duration and plays */}
                    <div className="flex items-center gap-3 text-white/70 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {playlist.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatNumber(playlist.plays)} plays
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary/20 via-transparent to-transparent"></div>
              </div>

              {/* Optional small title below for better readability */}
              <div className="mt-3 px-1">
                <h4 className="font-medium text-sm text-muted-foreground line-clamp-1">
                  {playlist.title}
                </h4>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPlaylists.length === 0 && (
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
              <Music className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Nenhuma playlist encontrada</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                Tente ajustar sua busca ou explorar outras categorias para descobrir conteúdos incríveis
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4"
            >
              Ver todas as playlists
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}