/**
 * RAYO - YouTube Playlist Modal
 * Modal para visualizar playlists do YouTube com lista de vídeos
 */

import { X, Play, Clock, List, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { YouTubePlaylist, YouTubeVideo } from './YouTubeTypes';
import { Badge } from '../ui/badge';

interface YouTubePlaylistModalProps {
  playlist: YouTubePlaylist | null;
  videos: YouTubeVideo[];
  isOpen: boolean;
  onClose: () => void;
  onVideoClick: (video: YouTubeVideo) => void;
  loading?: boolean;
}

export function YouTubePlaylistModal({ 
  playlist, 
  videos,
  isOpen, 
  onClose,
  onVideoClick,
  loading = false
}: YouTubePlaylistModalProps) {
  if (!playlist) return null;

  const formatDuration = (durationInSeconds: number) => {
    // Converte segundos para formato legível (MM:SS ou H:MM:SS)
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M visualizações`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K visualizações`;
    }
    return `${count} visualizações`;
  };

  const formatPublishedDate = (date: string) => {
    const publishDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - publishDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header com thumbnail da playlist */}
        <div className="relative h-48 lg:h-64 bg-gradient-to-b from-primary/20 to-background overflow-hidden">
          <img 
            src={playlist.thumbnail.high}
            alt={playlist.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-background" />
          
          {/* Info da playlist */}
          <div className="relative h-full flex flex-col justify-end p-6 pb-4">
            <div className="flex items-start gap-4 mb-4">
              {/* Thumbnail pequena */}
              <div className="hidden sm:block flex-shrink-0 w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden shadow-xl border-2 border-white/20">
                <img 
                  src={playlist.thumbnail.high}
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Texto */}
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">
                  <List className="w-3 h-3 mr-1" />
                  Playlist
                </Badge>
                <DialogTitle className="text-2xl lg:text-3xl mb-2 text-white">
                  {playlist.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/80 line-clamp-2 mb-2 [&]:text-white/80">
                  {playlist.description || `Playlist com ${playlist.itemCount} vídeos do canal ${playlist.channelTitle}`}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span className="font-medium text-white/90">{playlist.channelTitle}</span>
                  <span>•</span>
                  <span>{playlist.itemCount} vídeos</span>
                  {videos.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatViewCount(videos.reduce((acc, v) => acc + v.viewCount, 0))}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botão fechar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Lista de vídeos */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-16rem)] lg:max-h-[calc(90vh-18rem)]">
          <div className="p-6 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Vídeos da Playlist</h3>
              {videos.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 p-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-muted rounded animate-pulse" />
                    <div className="flex-shrink-0 w-40 h-24 bg-muted rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <List className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Nenhum vídeo encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Esta playlist está vazia ou os vídeos não puderam ser carregados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://www.youtube.com/playlist?list=${playlist.id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver no YouTube
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    onClick={() => {
                      onVideoClick(video);
                      onClose();
                    }}
                    className="group flex gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/20"
                  >
                    {/* Número */}
                    <div className="flex-shrink-0 w-6 text-center text-sm text-muted-foreground group-hover:text-primary font-medium">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-40 h-24 rounded-md overflow-hidden bg-muted">
                      <img
                        src={video.thumbnail.medium}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="white" />
                      </div>

                      {/* Duration */}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {formatDuration(video.duration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-200">
                        {video.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{video.channelTitle}</span>
                        <span>•</span>
                        <span>{formatViewCount(video.viewCount)}</span>
                        <span>•</span>
                        <span>{formatPublishedDate(video.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão ver no YouTube */}
            {videos.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`https://www.youtube.com/playlist?list=${playlist.id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver playlist completa no YouTube
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
