import { Pause, Play, X } from "lucide-react";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function GlobalAudioPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, seek, close } = useAudioPlayer();
  if (!currentTrack) return null;

  const canSeek = duration > 0;
  const progress = canSeek ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rayo-global-audio-player" role="region" aria-label="Player de áudio">
      <div className="rayo-gap-inner">
        {currentTrack.coverUrl && (
          <img
            src={currentTrack.coverUrl}
            alt=""
            className="rayo-gap-cover"
            loading="lazy"
          />
        )}
        <div className="rayo-gap-meta">
          <p className="rayo-gap-title" title={currentTrack.title}>{currentTrack.title}</p>
          {currentTrack.subtitle && (
            <p className="rayo-gap-subtitle" title={currentTrack.subtitle}>{currentTrack.subtitle}</p>
          )}
        </div>

        <button
          type="button"
          className="rayo-gap-play"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pausar ${currentTrack.title}` : `Reproduzir ${currentTrack.title}`}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" style={{ marginLeft: 2 }} />}
        </button>

        <div className="rayo-gap-progress">
          <span className="rayo-gap-time">{fmt(currentTime)}</span>
          <div
            className="rayo-gap-track"
            role="slider"
            tabIndex={canSeek ? 0 : -1}
            aria-label="Posição do áudio"
            aria-valuemin={0}
            aria-valuemax={canSeek ? Math.round(duration) : 0}
            aria-valuenow={canSeek ? Math.round(currentTime) : 0}
            aria-valuetext={canSeek ? `${fmt(currentTime)} de ${fmt(duration)}` : "Áudio carregando"}
            aria-disabled={!canSeek}
            onClick={(e) => {
              if (!canSeek) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seek(ratio * duration);
            }}
            onKeyDown={(e) => {
              if (!canSeek) return;
              if (e.key === "ArrowRight") { e.preventDefault(); seek(currentTime + 5); }
              else if (e.key === "ArrowLeft") { e.preventDefault(); seek(currentTime - 5); }
              else if (e.key === "Home") { e.preventDefault(); seek(0); }
              else if (e.key === "End") { e.preventDefault(); seek(duration); }
            }}
          >
            <div className="rayo-gap-track-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="rayo-gap-time">{fmt(canSeek ? duration : 0)}</span>
        </div>

        <button
          type="button"
          className="rayo-gap-close"
          onClick={close}
          aria-label="Fechar player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
