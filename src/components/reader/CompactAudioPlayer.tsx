// ============================================================================
// 📚 RAIO ECOSYSTEM - COMPACT AUDIO PLAYER
// Player minimalista fixo no bottom inspirado no Headway
// ============================================================================

import { Play, Pause, Settings, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { useBookReader } from './BookReaderContext';
import { useTheme } from '../ThemeProvider';
import { Book } from '../types/BookTypes';
import { useState } from 'react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger 
} from '../ui/sheet';
import { AudioPlayer } from './AudioPlayer';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface CompactAudioPlayerProps {
  book: Book;
}

export function CompactAudioPlayer({ book }: CompactAudioPlayerProps) {
  const { state, togglePlay, seek, transcript } = useBookReader();
  const { theme } = useTheme();
  const [showFullPlayer, setShowFullPlayer] = useState(false);

  // Formatar tempo (segundos → mm:ss)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = state.duration > 0 
    ? (state.currentTime / state.duration) * 100 
    : 0;

  // Pegar o título do segmento atual
  const currentSegment = transcript.find(seg => seg.id === state.currentSegmentId);
  const currentTitle = currentSegment?.text.split('.')[0] || book.title;

  return (
    <>
      {/* Compact Player - Fixo no Bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg"
        style={{ 
          background: theme === 'dark' 
            ? 'rgba(17, 24, 39, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          borderColor: 'var(--raio-border-default)',
        }}
      >
        {/* Progress Bar - Ultra fina no topo */}
        <div 
          className="h-1 w-full relative group cursor-pointer"
          style={{ background: 'var(--raio-bg-tertiary)' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            seek(percentage * state.duration);
          }}
        >
          {/* Progress fill */}
          <div 
            className="h-full transition-all duration-300 relative"
            style={{ 
              width: `${progressPercentage}%`,
              background: 'var(--raio-accent-primary)',
            }}
          >
            {/* Handle - aparece no hover */}
            <div 
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ 
                background: 'var(--raio-accent-primary)',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        </div>

        {/* Player Content */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Thumbnail */}
          <div 
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
            style={{ background: 'var(--raio-bg-tertiary)' }}
          >
            <ImageWithFallback
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 
              className="text-sm truncate"
              style={{ 
                fontWeight: 600,
                color: 'var(--raio-text-primary)' 
              }}
            >
              {currentTitle.length > 60 ? currentTitle.slice(0, 60) + '...' : currentTitle}
            </h3>
            <p 
              className="text-xs truncate"
              style={{ color: 'var(--raio-text-tertiary)' }}
            >
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <Sheet open={showFullPlayer} onOpenChange={setShowFullPlayer}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="bottom" 
                className="h-[80vh]"
                style={{ 
                  background: 'var(--raio-bg-secondary)',
                  borderColor: 'var(--raio-border-default)'
                }}
              >
                <SheetHeader>
                  <SheetTitle style={{ color: 'var(--raio-text-primary)' }}>
                    Controles de Áudio
                  </SheetTitle>
                  <SheetDescription style={{ color: 'var(--raio-text-tertiary)' }}>
                    Ajuste a velocidade, volume e navegação do áudio
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <AudioPlayer />
                </div>
              </SheetContent>
            </Sheet>

            {/* Play/Pause */}
            <Button
              size="icon"
              className="w-10 h-10 rounded-full flex-shrink-0"
              onClick={togglePlay}
              style={{
                background: 'var(--raio-accent-primary)',
                color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF'
              }}
            >
              {state.isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
