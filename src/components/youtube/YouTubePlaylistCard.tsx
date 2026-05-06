/**
 * RAIO - YouTube Playlist Card
 * Card de playlist estilo Spotify
 */

import { PlayCircle, List } from 'lucide-react';
import { YouTubePlaylist } from './YouTubeTypes';

interface YouTubePlaylistCardProps {
  playlist: YouTubePlaylist;
  onClick: (playlist: YouTubePlaylist) => void;
}

export function YouTubePlaylistCard({ playlist, onClick }: YouTubePlaylistCardProps) {
  return (
    <div 
      onClick={() => onClick(playlist)}
      className="group cursor-pointer bg-card rounded-lg p-4 transition-all duration-300 hover:bg-accent/10 hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square rounded-md overflow-hidden bg-muted mb-4">
        <img 
          src={playlist.thumbnail.high}
          alt={playlist.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay permanente com leve escurecimento */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300" />
        
        {/* Play button - SEMPRE VISÍVEL */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/95 group-hover:bg-primary flex items-center justify-center shadow-xl transform transition-all duration-300 group-hover:scale-110">
            <PlayCircle className="w-7 h-7 lg:w-8 lg:h-8 text-primary group-hover:text-white transition-colors duration-300" fill="currentColor" />
          </div>
        </div>
        
        {/* Contador de vídeos */}
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
          <List className="w-3 h-3" />
          {playlist.itemCount} vídeos
        </div>
      </div>
      
      {/* Info da playlist */}
      <div>
        <h3 className="line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-200">
          {playlist.title}
        </h3>
        
        {playlist.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {playlist.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{playlist.channelTitle}</span>
        </div>
      </div>
    </div>
  );
}
