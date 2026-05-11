/**
 * RAYO - YouTube Player
 * Player embutido com tracking de progresso
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Share2 } from 'lucide-react';
import { YouTubeVideo } from './YouTubeTypes';
import { useVideoProgress } from '../hooks/useVideoProgress';

// Task #168 — IDs mock (`mock-video-*`/`mock-short-*`) gerados por
// YouTubeService.getMockData() não existem no YouTube e fazem o iframe
// renderizar a tela de erro preta do próprio YouTube. Detectamos o
// padrão e mostramos um placeholder honesto em vez de tentar embedar.
function isMockVideoId(id: string): boolean {
  return /^mock-(video|short|playlist)-/i.test(id);
}

interface YouTubePlayerProps {
  video: YouTubeVideo;
  onClose: () => void;
  autoplay?: boolean;
}

export function YouTubePlayer({ video, onClose, autoplay = true }: YouTubePlayerProps) {
  const { updateProgress, isFavorite, toggleFavorite, trackView } = useVideoProgress();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<number>();
  const startTimeRef = useRef(Date.now());
  const currentTimeRef = useRef(0);
  const favorite = isFavorite(video.id);

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

  // Task #168 — Esc fecha o player.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Simula tracking de progresso
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        currentTimeRef.current += 1;
        updateProgress(video.id, currentTimeRef.current, video.duration);
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
  }, [isPlaying, video.id, video.duration, updateProgress]);

  // Tracking de visualização ao fechar
  useEffect(() => {
    return () => {
      const watchTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const completion = (currentTimeRef.current / video.duration) * 100;
      if (watchTime > 5) { // só rastreia se assistiu mais de 5 segundos
        trackView(video.id, watchTime, completion);
      }
    };
  }, [video.id, video.duration, trackView]);

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
    toggleFavorite(video.id);
  };

  const handleShare = async () => {
    const url = `https://youtube.com/watch?v=${video.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Assista: ${video.title}`,
          url,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      // Fallback: copiar link
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copiado!');
      } catch (err) {
        console.error('Erro ao copiar link:', err);
      }
    }
  };

  const isMock = isMockVideoId(video.id);
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`;

  // Task #168 — renderizado via portal pra escapar do `transform:
  // translateY(...)` do PullToRefresh, que cria containing block e
  // quebra `position: fixed` em descendentes (mesmo gotcha do
  // CommentsPanel listado em replit.md).
  const overlay = (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 overflow-hidden"
      style={{ margin: 0 }}
      onMouseMove={handleMouseMove}
    >
      {/* Header com controles */}
      <div 
        className={`
          fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 lg:p-6
          transition-opacity duration-300
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg lg:text-xl mb-1 line-clamp-2">
              {video.title}
            </h2>
            <p className="text-white/70 text-sm">
              {video.channelTitle}
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
      <div className="w-full max-w-6xl aspect-video relative z-10">
        {isMock ? (
          <div
            className="w-full h-full rounded-lg flex flex-col items-center justify-center text-center px-6 gap-3"
            style={{
              background: 'linear-gradient(135deg, var(--rayo-forest-900,#15302a) 0%, var(--rayo-ink-700,#3a2f24) 100%)',
              color: '#fff',
            }}
          >
            <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>Conteúdo em produção</p>
            <p style={{ opacity: 0.8, maxWidth: 480 }}>
              Este vídeo é uma prévia de catálogo e ainda não tem mídia
              publicada. Volte em breve.
            </p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={video.title}
            className="w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsPlaying(autoplay)}
          />
        )}
      </div>

      {/* Click fora para fechar */}
      <button
        onClick={onClose}
        className="absolute inset-0 -z-10"
        aria-label="Fechar player"
      />
    </div>
  );

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, document.body);
}
