/**
 * RAYO - YouTube Player com Lista de Playlist
 * Player estilo YouTube com lista de vídeos ao lado
 */

import { useEffect, useRef, useState } from 'react';
import { X, Heart, Share2, Play, List, ChevronRight, ChevronLeft } from 'lucide-react';
import { YouTubeVideo, YouTubePlaylist } from './YouTubeTypes';
import { useVideoProgress } from '../hooks/useVideoProgress';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface YouTubePlayerWithPlaylistProps {
  video: YouTubeVideo;
  playlist?: YouTubePlaylist;
  playlistVideos?: YouTubeVideo[];
  onClose: () => void;
  onVideoChange?: (video: YouTubeVideo) => void;
  autoplay?: boolean;
}

export function YouTubePlayerWithPlaylist({ 
  video, 
  playlist,
  playlistVideos = [],
  onClose, 
  onVideoChange,
  autoplay = true 
}: YouTubePlayerWithPlaylistProps) {
  const { updateProgress, isFavorite, toggleFavorite, trackView } = useVideoProgress();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [currentVideo, setCurrentVideo] = useState(video);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<number>();
  const startTimeRef = useRef(Date.now());
  const currentTimeRef = useRef(0);
  const favorite = isFavorite(currentVideo.id);

  // Atualizar vídeo quando prop mudar
  useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  // Scroll para o topo e prevenir scroll do body quando player abrir
  useEffect(() => {
    // Salvar posição atual do scroll
    const scrollY = window.scrollY;
    
    // Scroll para o topo imediatamente
    window.scrollTo(0, 0);
    
    // Prevenir scroll no body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    return () => {
      // Restaurar scroll quando fechar
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Simula tracking de progresso
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        currentTimeRef.current += 1;
        updateProgress(currentVideo.id, currentTimeRef.current, currentVideo.duration);
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentVideo.id, currentVideo.duration, updateProgress]);

  // Tracking de visualização ao fechar
  useEffect(() => {
    return () => {
      const watchTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const completion = (currentTimeRef.current / currentVideo.duration) * 100;
      if (watchTime > 5) {
        trackView(currentVideo.id, watchTime, completion);
      }
    };
  }, [currentVideo.id, currentVideo.duration, trackView]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;
    
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleFavoriteClick = () => {
    toggleFavorite(currentVideo.id);
  };

  const handleShare = async () => {
    const url = `https://youtube.com/watch?v=${currentVideo.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVideo.title,
          text: `Assista: ${currentVideo.title}`,
          url,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copiado!');
      } catch (err) {
        console.error('Erro ao copiar link:', err);
      }
    }
  };

  const handleVideoClick = (newVideo: YouTubeVideo) => {
    setCurrentVideo(newVideo);
    currentTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setIsPlaying(true);
    onVideoChange?.(newVideo);
  };

  const formatDuration = (durationInSeconds: number) => {
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

  const embedUrl = `https://www.youtube.com/embed/${currentVideo.id}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`;
  const hasPlaylist = playlistVideos.length > 0;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center overflow-hidden"
      style={{ margin: 0, padding: 0 }}
      onMouseMove={handleMouseMove}
    >
      {/* Container principal */}
      <div className="w-full h-full flex flex-col lg:flex-row max-w-[1800px] mx-auto p-0 lg:p-6 gap-0 lg:gap-4" style={{ maxHeight: '100vh' }}>
        
        {/* Área do Player - Desktop ajustável */}
        <div className={`flex-1 flex flex-col min-w-0 ${hasPlaylist && showPlaylist ? 'lg:max-w-[calc(100%-420px)]' : 'lg:max-w-full'}`}>
          {/* Header com controles - Mobile */}
          <div 
            className={`
              lg:hidden fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4
              transition-opacity duration-300
              ${showControls ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-base mb-1 line-clamp-2">
                  {currentVideo.title}
                </h2>
                <p className="text-white/70 text-sm">
                  {currentVideo.channelTitle}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFavoriteClick}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
                  aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart 
                    className={`w-5 h-5 ${favorite ? 'fill-current text-red-500' : 'text-white'}`}
                  />
                </button>
                
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
                  aria-label="Compartilhar"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Player */}
          <div className="flex-1 flex items-center justify-center p-0 lg:p-4">
            <div className="w-full aspect-video max-h-[calc(100vh-80px)] lg:max-h-full">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={currentVideo.title}
                className="w-full h-full lg:rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsPlaying(autoplay)}
              />
            </div>
          </div>

          {/* Header Desktop - Abaixo do player */}
          <div className="hidden lg:block bg-black/40 backdrop-blur-sm p-4 rounded-lg mt-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-xl mb-2">
                  {currentVideo.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <span>{currentVideo.channelTitle}</span>
                  <span>•</span>
                  <span>{formatViewCount(currentVideo.viewCount)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFavoriteClick}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                  aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart 
                    className={`w-5 h-5 ${favorite ? 'fill-current text-red-500' : 'text-white'}`}
                  />
                  <span className="text-white text-sm">{favorite ? 'Favoritado' : 'Favoritar'}</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                  aria-label="Compartilhar"
                >
                  <Share2 className="w-5 h-5 text-white" />
                  <span className="text-white text-sm">Compartilhar</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-white" />
                  <span className="text-white text-sm">Fechar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar com Lista de Playlist - Desktop Only */}
        {hasPlaylist && (
          <div className={`
            hidden lg:flex flex-col bg-black/60 backdrop-blur-md rounded-lg overflow-hidden
            transition-all duration-300 ease-in-out
            ${showPlaylist ? 'w-[400px]' : 'w-12'}
          `}>
            {/* Toggle Button */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/10"
              aria-label={showPlaylist ? 'Ocultar playlist' : 'Mostrar playlist'}
            >
              {showPlaylist ? (
                <>
                  <ChevronRight className="w-5 h-5 text-white" />
                </>
              ) : (
                <ChevronLeft className="w-5 h-5 text-white" />
              )}
            </button>

            {showPlaylist && (
              <>
                {/* Header da Playlist */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-start gap-2 mb-2">
                    <List className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold mb-1 line-clamp-2">
                        {playlist?.title || 'Playlist'}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {playlistVideos.length} vídeos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de Vídeos */}
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {playlistVideos.map((playlistVideo, index) => {
                      const isCurrentVideo = playlistVideo.id === currentVideo.id;
                      
                      return (
                        <div
                          key={playlistVideo.id}
                          onClick={() => handleVideoClick(playlistVideo)}
                          className={`
                            group flex gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 mb-2
                            ${isCurrentVideo 
                              ? 'bg-primary/20 border border-primary/40' 
                              : 'hover:bg-white/10 border border-transparent hover:border-white/20'
                            }
                          `}
                        >
                          {/* Número */}
                          <div className={`
                            flex-shrink-0 w-6 text-center text-sm font-medium mt-1
                            ${isCurrentVideo ? 'text-primary' : 'text-white/60 group-hover:text-white'}
                          `}>
                            {isCurrentVideo ? (
                              <div className="w-4 h-4 mx-auto">
                                <div className="w-full h-full border-2 border-primary rounded-sm flex items-center justify-center">
                                  <div className="w-2 h-2 bg-primary rounded-sm"></div>
                                </div>
                              </div>
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>

                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0 w-36 h-20 rounded-md overflow-hidden bg-black/40">
                            <img
                              src={playlistVideo.thumbnail.medium}
                              alt={playlistVideo.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            
                            {/* Play overlay */}
                            {!isCurrentVideo && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="white" />
                              </div>
                            )}

                            {/* Duration */}
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {formatDuration(playlistVideo.duration)}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`
                              text-sm line-clamp-2 mb-1 transition-colors duration-200
                              ${isCurrentVideo 
                                ? 'text-primary font-semibold' 
                                : 'text-white group-hover:text-primary'
                              }
                            `}>
                              {playlistVideo.title}
                            </h4>
                            <div className="flex flex-col gap-0.5 text-xs text-white/60">
                              <span className="line-clamp-1">{playlistVideo.channelTitle}</span>
                              <span>{formatViewCount(playlistVideo.viewCount)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </div>

      {/* Click fora para fechar - apenas em mobile */}
      <button
        onClick={onClose}
        className="lg:hidden absolute inset-0 -z-10"
        aria-label="Fechar player"
      />
    </div>
  );
}
