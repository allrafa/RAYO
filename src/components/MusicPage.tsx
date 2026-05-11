import { ArrowLeft, Play, Heart, Download, Shuffle, MoreHorizontal, Clock, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { enhancedToast } from "./EnhancedToast";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";


interface MusicPageProps {
  onBack: () => void;
}

// Dados das categorias de playlists funcionais
const musicCategories = [
  {
    id: 'focus',
    name: 'Foco & Concentração',
    description: 'Música instrumental para trabalho e estudos',
    color: 'from-blue-500 to-purple-600',
    icon: '🧠',
    playlists: [
      { name: 'Deep Work', tracks: 45, duration: '3h 12min', listeners: '2.3k', audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { name: 'Concentração Total', tracks: 38, duration: '2h 45min', listeners: '1.8k' },
      { name: 'Study Beats', tracks: 52, duration: '3h 38min', listeners: '3.1k' },
      { name: 'Produtividade Zen', tracks: 29, duration: '2h 15min', listeners: '1.5k' }
    ]
  },
  {
    id: 'baby',
    name: 'Bebê Dormir',
    description: 'Músicas suaves para ninar seu bebê',
    color: 'from-pink-400 to-rose-500',
    icon: '👶',
    playlists: [
      { name: 'Ninar Angelical', tracks: 25, duration: '1h 45min', listeners: '4.2k' },
      { name: 'Sonhos Doces', tracks: 30, duration: '2h 10min', listeners: '3.8k' },
      { name: 'Canções de Berço', tracks: 22, duration: '1h 32min', listeners: '2.9k' },
      { name: 'Paz Total Baby', tracks: 18, duration: '1h 20min', listeners: '2.1k' }
    ]
  },
  {
    id: 'couple',
    name: 'Momentos a Dois',
    description: 'Playlist para fortalecer a intimidade do casal',
    color: 'from-red-400 to-pink-500',
    icon: '💕',
    playlists: [
      { name: 'Romance Eterno', tracks: 35, duration: '2h 28min', listeners: '5.1k' },
      { name: 'Encontro Perfeito', tracks: 28, duration: '2h 05min', listeners: '3.7k' },
      { name: 'Amor Verdadeiro', tracks: 42, duration: '3h 15min', listeners: '4.5k' },
      { name: 'Intimidade & Conexão', tracks: 25, duration: '1h 55min', listeners: '2.8k' }
    ]
  },
  {
    id: 'worship',
    name: 'Adoração a Deus',
    description: 'Músicas para louvor e momento com Deus',
    color: 'from-yellow-400 to-orange-500',
    icon: '🙏',
    playlists: [
      { name: 'Presença de Deus', tracks: 40, duration: '3h 05min', listeners: '6.8k' },
      { name: 'Louvor Profundo', tracks: 33, duration: '2h 35min', listeners: '5.2k' },
      { name: 'Adoração Íntima', tracks: 28, duration: '2h 15min', listeners: '4.1k' },
      { name: 'Gratidão Eterna', tracks: 35, duration: '2h 48min', listeners: '3.9k' }
    ]
  },
  {
    id: 'relax',
    name: 'Relaxamento',
    description: 'Para momentos de paz e tranquilidade',
    color: 'from-green-400 to-teal-500',
    icon: '🧘‍♀️',
    playlists: [
      { name: 'Paz Interior', tracks: 32, duration: '2h 25min', listeners: '3.6k' },
      { name: 'Natureza Zen', tracks: 27, duration: '2h 08min', listeners: '2.8k' },
      { name: 'Meditação Guiada', tracks: 20, duration: '1h 45min', listeners: '2.2k' },
      { name: 'Serenidade Total', tracks: 38, duration: '2h 55min', listeners: '3.1k' }
    ]
  },
  {
    id: 'energy',
    name: 'Energia & Motivação',
    description: 'Para começar o dia com energia positiva',
    color: 'from-orange-400 to-red-500',
    icon: '⚡',
    playlists: [
      { name: 'Energia Matinal', tracks: 45, duration: '3h 20min', listeners: '4.7k' },
      { name: 'Motivação Total', tracks: 38, duration: '2h 42min', listeners: '3.9k' },
      { name: 'Conquista do Dia', tracks: 32, duration: '2h 18min', listeners: '3.2k' },
      { name: 'Força Interior', tracks: 40, duration: '2h 58min', listeners: '3.8k' }
    ]
  }
];

export function MusicPage({ onBack }: MusicPageProps) {
  const { playTrack } = useAudioPlayer();
  // Task #172 — player real via AudioPlayerContext. Mocks não têm
  // audio_url ainda; o seed "Deep Work" recebeu amostra pública pra QA.
  const handlePlayPlaylist = (
    categoryName: string,
    playlist: { name: string; audio_url?: string },
  ) => {
    if (!playlist.audio_url) {
      enhancedToast.info("Em breve");
      return;
    }
    playTrack({
      id: `music-${categoryName}-${playlist.name}`,
      title: playlist.name,
      subtitle: categoryName,
      audioUrl: playlist.audio_url,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rayo-forest-50 to-rayo-lime-50">
      {/* Header */}
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
                <h1 className="text-xl font-semibold">Playlists Funcionais</h1>
                <p className="text-sm text-muted-foreground">Música para cada momento da sua vida</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Shuffle className="w-4 h-4 mr-2" />
              Aleatório
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rayo-forest-600 to-rayo-lime-600 p-8 text-white">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Música que Transforma</h2>
            <p className="text-white/90 mb-4 max-w-md">
              Descubra playlists criadas especialmente para cada momento da sua jornada de transformação
            </p>
            <Button className="bg-white text-rayo-forest-600 hover:bg-white/90">
              <Play className="w-4 h-4 mr-2" />
              Explorar Agora
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="absolute bottom-0 right-8 w-24 h-24 bg-white/5 rounded-full"></div>
        </div>

        {/* Categories Grid */}
        {musicCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center text-white text-xl`}>
                  {category.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            </div>

            {/* Playlists Horizontal Scroll */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                {category.playlists.map((playlist, index) => (
                  <Card
                    key={index}
                    role="button"
                    tabIndex={0}
                    aria-label={`Reproduzir playlist ${playlist.name} de ${category.name}`}
                    className="w-64 hover:shadow-lg transition-all duration-300 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rayo-terra-500"
                    onClick={() => handlePlayPlaylist(category.name, playlist)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handlePlayPlaylist(category.name, playlist);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                            {playlist.name}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {playlist.duration}
                            </span>
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {playlist.listeners}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {playlist.tracks} faixas
                        </Badge>
                        <Button 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="bg-white rounded-xl p-6 border border-border">
          <div className="text-center space-y-4">
            <h3 className="font-semibold">Quer mais playlists personalizadas?</h3>
            <p className="text-sm text-muted-foreground">
              Converse com nossos conselheiros IA para receber recomendações musicais personalizadas
            </p>
            <Button className="w-full">
              <Heart className="w-4 h-4 mr-2" />
              Falar com Conselheiro
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}