// ============================================================================
// 📚 RAIO ECOSYSTEM - AUDIO PLAYER
// Player de áudio com controles completos
// ============================================================================

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { useBookReader } from './BookReaderContext';
import { useTheme } from '../ThemeProvider';

export function AudioPlayer() {
  const { 
    state, 
    togglePlay, 
    skipBackward, 
    skipForward, 
    seek, 
    setVolume 
  } = useBookReader();
  const { theme } = useTheme();

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

  return (
    <div 
      className="space-y-4"
      style={{
        background: 'var(--raio-bg-secondary)',
        borderColor: 'var(--raio-border-default)'
      }}
    >
      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[state.currentTime]}
          max={state.duration}
          step={0.1}
          onValueChange={(value) => seek(value[0])}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--raio-text-tertiary)' }}>
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip Backward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skipBackward(15)}
          className="relative"
          style={{ color: 'var(--raio-text-secondary)' }}
        >
          <SkipBack className="w-5 h-5" />
          <span 
            className="absolute text-[10px]"
            style={{ 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              fontWeight: 700
            }}
          >
            15
          </span>
        </Button>

        {/* Play/Pause */}
        <Button
          size="icon"
          className="w-12 h-12 rounded-full"
          onClick={togglePlay}
          style={{
            background: 'var(--raio-accent-primary)',
            color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--raio-accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--raio-accent-primary)';
          }}
        >
          {state.isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        {/* Skip Forward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skipForward(15)}
          className="relative"
          style={{ color: 'var(--raio-text-secondary)' }}
        >
          <SkipForward className="w-5 h-5" />
          <span 
            className="absolute text-[10px]"
            style={{ 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              fontWeight: 700
            }}
          >
            15
          </span>
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVolume(state.volume === 0 ? 1 : 0)}
          style={{ color: 'var(--raio-text-secondary)' }}
        >
          {state.volume === 0 ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>
        <Slider
          value={[state.volume]}
          max={1}
          step={0.01}
          onValueChange={(value) => setVolume(value[0])}
          className="flex-1"
        />
      </div>

      {/* Playback Speed */}
      <div className="flex justify-center gap-2">
        {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
          <Button
            key={speed}
            variant={state.playbackSpeed === speed ? 'default' : 'outline'}
            size="sm"
            onClick={() => useBookReader().setPlaybackSpeed(speed)}
            style={{
              background: state.playbackSpeed === speed 
                ? 'var(--raio-accent-primary)' 
                : 'transparent',
              color: state.playbackSpeed === speed 
                ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
                : 'var(--raio-text-secondary)',
              borderColor: state.playbackSpeed === speed 
                ? 'var(--raio-accent-primary)' 
                : 'var(--raio-border-default)'
            }}
          >
            {speed}x
          </Button>
        ))}
      </div>
    </div>
  );
}
