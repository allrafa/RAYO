import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, MoreVertical, ThumbsUp, ThumbsDown, Share, Download, Plus, Eye, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface VideoPageProps {
  videoId: string;
  onBack: () => void;
}

// Mock de dados de vídeos para demonstração
const mockVideos = [
  {
    id: "1",
    title: "Como Transformar Seu Casamento em 30 Dias - Episódio Completo",
    description: "Descubra as 5 estratégias fundamentais que salvaram mais de 10.000 casamentos. Jessica e Rafa Raio compartilham insights exclusivos baseados em 15 anos de experiência.",
    duration: "45:32",
    views: "127K",
    uploadDate: "3 dias atrás",
    thumbnail: "https://images.unsplash.com/photo-1522621032211-ac0031dfbddc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBjb3VuY2lsaW5nfGVufDF8fHx8MTc1OTY0NTI4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    channel: "RAIO Academy",
    subscribers: "2.3M",
    likes: "15K",
    category: "Relacionamentos"
  },
  {
    id: "2", 
    title: "5 Sinais de que Seu Relacionamento Precisa de Ajuda URGENTE",
    description: "Identifique os sinais de alerta antes que seja tarde demais. Este vídeo pode salvar seu relacionamento.",
    duration: "23:15",
    views: "89K",
    uploadDate: "1 semana atrás",
    thumbnail: "https://images.unsplash.com/photo-1601573264251-9c8015828db2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjB0aGVyYXB5JTIwc2Vzc2lvbnxlbnwxfHx8fDE3NTk2NDU1Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    channel: "RAIO Academy",
    subscribers: "2.3M", 
    likes: "8.2K",
    category: "Relacionamentos"
  },
  {
    id: "3",
    title: "Como Educar Filhos com Disciplina Positiva - Método RAIO",
    description: "Aprenda a educar seus filhos sem gritos, castigos ou chantagens. Método testado por mais de 50.000 famílias.",
    duration: "38:47",
    views: "156K",
    uploadDate: "2 semanas atrás", 
    thumbnail: "https://images.unsplash.com/photo-1551498800-17cbc39c85bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjByZWFkaW5nJTIwdG9nZXRoZXJ8ZW58MXx8fHwxNzU5NjQ0Mjk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    channel: "RAIO Academy",
    subscribers: "2.3M",
    likes: "22K", 
    category: "Parentalidade"
  },
  {
    id: "4",
    title: "Finanças do Casal: Como Organizar o Dinheiro sem Brigas",
    description: "O método definitivo para casais organizarem as finanças em harmonia. Inclui planilha gratuita.",
    duration: "52:18",
    views: "203K", 
    uploadDate: "3 semanas atrás",
    thumbnail: "https://images.unsplash.com/photo-1758686254415-9348b5b5df01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjBmaW5hbmNpYWwlMjBwbGFubmluZ3xlbnwxfHx8fDE3NTk2NDU1NDB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    channel: "RAIO Academy", 
    subscribers: "2.3M",
    likes: "31K",
    category: "Finanças"
  },
  {
    id: "5",
    title: "Intimidade no Casamento: Reconectando Corpo e Alma",
    description: "Como reavivar a intimidade no casamento de forma saudável e respeitosa. Conteúdo exclusivo para casais.",
    duration: "29:33",
    views: "94K",
    uploadDate: "1 mês atrás",
    thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBpbnRpbWF0ZXxlbnwxfHx8fDE3NTk2NDUzMDB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    channel: "RAIO Academy",
    subscribers: "2.3M", 
    likes: "12K",
    category: "Intimidade"
  }
];

export function VideoPage({ videoId, onBack }: VideoPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(mockVideos[0]);

  // Buscar vídeo por ID
  useEffect(() => {
    const video = mockVideos.find(v => v.id === videoId) || mockVideos[0];
    setCurrentVideo(video);
  }, [videoId]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleVideoClick = (video: typeof mockVideos[0]) => {
    setCurrentVideo(video);
    setIsPlaying(false);
    enhancedToast.success(`Carregando: ${video.title}`);
  };

  const relatedVideos = mockVideos.filter(v => v.id !== currentVideo.id);

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
      {/* Header com botão voltar */}
      <div 
        className="sticky top-0 z-50 backdrop-blur-sm px-4 py-3"
        style={{ 
          background: 'var(--raio-bg-primary)',
          opacity: 0.95,
          borderBottom: '1px solid var(--raio-border-default)'
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            style={{ color: 'var(--raio-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 
            className="text-lg truncate flex-1" 
            style={{ 
              fontWeight: 600,
              color: 'var(--raio-text-primary)' 
            }}
          >
            {currentVideo.title}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Player de Vídeo Principal */}
        <div className="w-full">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
            {/* Thumbnail do vídeo */}
            <ImageWithFallback
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay de controles */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black shadow-xl"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" fill="currentColor" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" fill="currentColor" />
                  )}
                </Button>
              </div>

              {/* Controles inferiores */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-black/80 text-white">
                    {currentVideo.duration}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do vídeo */}
          <div className="mt-4 space-y-4">
            <div>
              <h1 
                className="text-xl leading-tight mb-2" 
                style={{ 
                  fontWeight: 700,
                  color: 'var(--raio-text-primary)' 
                }}
              >
                {currentVideo.title}
              </h1>
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div 
                  className="flex items-center gap-4 text-sm"
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{currentVideo.views} visualizações</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{currentVideo.uploadDate}</span>
                  </div>
                </div>

                {/* Ações do vídeo */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    {currentVideo.likes}
                  </Button>
                  <Button variant="outline" size="sm">
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Canal e descrição */}
            <Card
              style={{
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)'
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)'
                    }}
                  >
                    <span className="text-white text-sm" style={{ fontWeight: 700 }}>R</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 
                          style={{ 
                            fontWeight: 600,
                            color: 'var(--raio-text-primary)' 
                          }}
                        >
                          {currentVideo.channel}
                        </h3>
                        <p 
                          className="text-sm" 
                          style={{ color: 'var(--raio-text-tertiary)' }}
                        >
                          {currentVideo.subscribers} inscritos
                        </p>
                      </div>
                      <Button 
                        className="transition-all"
                        style={{
                          background: 'var(--raio-accent-primary)',
                          color: '#FFFFFF',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--raio-accent-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--raio-accent-primary)';
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Inscrever-se
                      </Button>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm leading-relaxed">
                        {showDescription 
                          ? currentVideo.description 
                          : `${currentVideo.description.slice(0, 150)}...`
                        }
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 px-0 h-auto font-semibold text-foreground hover:bg-transparent"
                        onClick={() => setShowDescription(!showDescription)}
                      >
                        {showDescription ? "Mostrar menos" : "Mostrar mais"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de vídeos relacionados */}
        <div className="space-y-4">
          <h2 
            className="text-lg" 
            style={{ 
              fontWeight: 600,
              color: 'var(--raio-text-primary)' 
            }}
          >
            Vídeos relacionados
          </h2>
          
          <div className="space-y-4">
            {relatedVideos.map((video) => (
              <Card 
                key={video.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleVideoClick(video)}
                style={{
                  background: 'var(--raio-bg-secondary)',
                  borderColor: 'var(--raio-border-default)'
                }}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                      <Badge variant="secondary" className="absolute bottom-1 right-1 text-xs bg-black/80 text-white">
                        {video.duration}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-sm leading-tight line-clamp-2 mb-1" 
                        style={{ 
                          fontWeight: 600,
                          color: 'var(--raio-text-primary)' 
                        }}
                      >
                        {video.title}
                      </h3>
                      <p 
                        className="text-xs mb-2" 
                        style={{ color: 'var(--raio-text-tertiary)' }}
                      >
                        {video.channel}
                      </p>
                      <div 
                        className="flex items-center gap-2 text-xs"
                        style={{ color: 'var(--raio-text-tertiary)' }}
                      >
                        <span>{video.views} visualizações</span>
                        <span>•</span>
                        <span>{video.uploadDate}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="mt-2 text-xs"
                        style={{
                          borderColor: 'var(--raio-border-default)',
                          color: 'var(--raio-text-secondary)',
                        }}
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
      </div>
    </div>
  );
}