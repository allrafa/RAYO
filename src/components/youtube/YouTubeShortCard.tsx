/**
 * RAYO - YouTube Short Card
 * Card vertical para Shorts (formato 9:16)
 */

import { Play, Heart } from 'lucide-react';
import { YouTubeShort } from './YouTubeTypes';
import { useVideoProgress } from '../hooks/useVideoProgress';

interface YouTubeShortCardProps {
  short: YouTubeShort;
  onClick: (short: YouTubeShort) => void;
}

/**
 * Formata número de views (1.2K, 15K, 1.5M)
 */
function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

export function YouTubeShortCard({ short, onClick }: YouTubeShortCardProps) {
  const { isFavorite, toggleFavorite } = useVideoProgress();
  const favorite = isFavorite(short.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(short.id);
  };

  return (
    <div 
      onClick={() => onClick(short)}
      className="group cursor-pointer flex-shrink-0 w-[160px] lg:w-[180px]"
    >
      {/* Thumbnail vertical (9:16) */}
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted mb-2">
        <img 
          src={short.thumbnail.high}
          alt={short.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        
        {/* Badge "SHORTS" */}
        <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
          SHORTS
        </div>

        {/* Views count */}
        <div className="absolute bottom-2 left-2 text-white text-xs font-medium drop-shadow-lg">
          {formatViews(short.viewCount)} views
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <Heart 
            className={`w-4 h-4 ${favorite ? 'fill-current text-red-500' : 'text-white'}`}
          />
        </button>
      </div>
      
      {/* Título */}
      <div className="px-1">
        <h4 className="text-sm line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {short.title}
        </h4>
      </div>
    </div>
  );
}
