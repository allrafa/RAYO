/**
 * RAYO - YouTube Video Card
 * Card de vídeo com thumbnail, título, duração e progresso
 */

import { Play, Clock, Heart } from 'lucide-react';
import { YouTubeVideo } from './YouTubeTypes';
import { useVideoProgress } from '../hooks/useVideoProgress';

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  onClick: (video: YouTubeVideo) => void;
  showProgress?: boolean;
}

/**
 * Formata segundos para MM:SS ou HH:MM:SS
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
 * Formata data relativa (há 2 dias, há 1 semana, etc)
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

export function YouTubeVideoCard({ video, onClick, showProgress = false }: YouTubeVideoCardProps) {
  const { getProgress, isFavorite, toggleFavorite } = useVideoProgress();
  const progress = getProgress(video.id);
  const favorite = isFavorite(video.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(video.id);
  };

  return (
    <div 
      onClick={() => onClick(video)}
      className="group cursor-pointer flex-shrink-0 w-[280px] lg:w-[320px]"
    >
      {/* Thumbnail com overlay */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
        <img 
          src={video.thumbnail.medium}
          alt={video.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay escuro no hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Duração do vídeo */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(video.duration)}
        </div>
        
        {/* Barra de progresso (se já assistiu) */}
        {showProgress && progress && progress.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        )}

        {/* Badge de favorito */}
        {favorite && (
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
        )}
      </div>
      
      {/* Info do vídeo */}
      <div className="px-1">
        <h3 className="line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-200">
          {video.title}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{video.channelTitle}</span>
          <span>•</span>
          <span>{formatRelativeDate(video.publishedAt)}</span>
        </div>

        {/* Informações adicionais no hover */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleFavoriteClick}
            className="flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-current text-red-500' : ''}`} />
            {favorite ? 'Favoritado' : 'Favoritar'}
          </button>
        </div>
      </div>
    </div>
  );
}
