/**
 * RAYO - Página de Favoritos
 * Lista de vídeos favoritados pelo usuário
 */

import { useState } from 'react';
import { ArrowLeft, Heart, Play, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useYouTubeData } from '../hooks/useYouTubeData';
import { useVideoProgress } from '../hooks/useVideoProgress';
import { YouTubeVideo } from './YouTubeTypes';
import { YouTubePlayerWithPlaylist } from './YouTubePlayerWithPlaylist';

interface FavoritosPageProps {
  onBack: () => void;
}

/**
 * Formata duração em segundos para MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formata data relativa
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  return `Há ${Math.floor(diffDays / 365)} ano${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}

export function FavoritosPage({ onBack }: FavoritosPageProps) {
  const { data: youtubeData, loading } = useYouTubeData();
  const { favoriteVideos, toggleFavorite } = useVideoProgress();
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  // Filtra vídeos favoritos
  const favoriteVideosList = youtubeData?.videos.filter(video => 
    favoriteVideos.includes(video.id)
  ) || [];

  const handleRemoveFavorite = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    toggleFavorite(videoId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Favoritos</h1>
                  <p className="text-sm text-muted-foreground">
                    {favoriteVideosList.length} {favoriteVideosList.length === 1 ? 'vídeo' : 'vídeos'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-48 h-28 bg-muted rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : favoriteVideosList.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhum vídeo favoritado</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Adicione vídeos aos seus favoritos para acessá-los rapidamente aqui
            </p>
            <Button onClick={onBack}>
              Explorar vídeos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteVideosList.map((video) => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="group flex gap-4 items-start p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative w-48 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={video.thumbnail.medium}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-all duration-300">
                      <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{video.channelTitle}</span>
                    <span>•</span>
                    <span>{formatRelativeDate(video.publishedAt)}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleRemoveFavorite(e, video.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player */}
      {selectedVideo && (
        <YouTubePlayerWithPlaylist
          video={selectedVideo}
          playlistVideos={favoriteVideosList}
          onClose={() => setSelectedVideo(null)}
          onVideoChange={(newVideo) => setSelectedVideo(newVideo)}
          autoplay={true}
        />
      )}
    </div>
  );
}
