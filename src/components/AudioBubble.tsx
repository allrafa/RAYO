import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface AudioBubbleProps {
  src: string;
  durationSec?: number | null;
  variant?: "user" | "assistant" | "compact";
  onPlay?: () => void;
  onTimeUpdate?: (currentSec: number) => void;
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function AudioBubble({
  src,
  durationSec,
  variant = "assistant",
  onPlay,
  onTimeUpdate,
}: AudioBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const initialTotal = durationSec != null && Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  const [total, setTotal] = useState<number>(initialTotal);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handlePlay = () => {
      setPlaying(true);
      onPlay?.();
    };
    const handlePause = () => setPlaying(false);
    const handleEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const handleTime = () => {
      setCurrent(el.currentTime);
      onTimeUpdate?.(el.currentTime);
    };
    const handleLoaded = () => {
      // Áudios webm/opus gravados pelo MediaRecorder costumam reportar
      // duration=Infinity até a primeira reprodução completa. Só aceita
      // valor finito > 0 — caso contrário mantemos o que veio do meta
      // server-side (0 = barra fica desativada, sem seek doido).
      if (Number.isFinite(el.duration) && el.duration > 0) setTotal(el.duration);
    };
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("timeupdate", handleTime);
    el.addEventListener("loadedmetadata", handleLoaded);
    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("timeupdate", handleTime);
      el.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [onPlay, onTimeUpdate]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play().catch(() => setPlaying(false));
  };

  const canSeek = Number.isFinite(total) && total > 0 && !!src;

  const seek = (clientX: number, rect: DOMRect) => {
    const el = audioRef.current;
    if (!el || !canSeek) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * total;
    setCurrent(el.currentTime);
  };

  const progress = canSeek ? (current / total) * 100 : 0;
  const display = playing || current > 0 ? current : (canSeek ? total : 0);

  return (
    <div className={`ra-audio-bubble ra-audio-${variant}`}>
      <button
        type="button"
        onClick={toggle}
        className="ra-audio-btn"
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ra-audio-play-icon" />}
      </button>
      <div
        className="ra-audio-track"
        role="slider"
        tabIndex={canSeek ? 0 : -1}
        aria-label="Posição do áudio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={canSeek ? `${fmt(current)} de ${fmt(total)}` : "Áudio não carregado"}
        aria-disabled={!canSeek}
        onClick={(e) => seek(e.clientX, e.currentTarget.getBoundingClientRect())}
        onKeyDown={(e) => {
          const el = audioRef.current;
          if (!el || !canSeek) return;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
            e.preventDefault();
          }
          if (e.key === "ArrowRight") {
            el.currentTime = Math.min(total, el.currentTime + 5);
            setCurrent(el.currentTime);
          } else if (e.key === "ArrowLeft") {
            el.currentTime = Math.max(0, el.currentTime - 5);
            setCurrent(el.currentTime);
          } else if (e.key === "Home") {
            el.currentTime = 0;
            setCurrent(0);
          } else if (e.key === "End") {
            el.currentTime = total;
            setCurrent(total);
          }
        }}
      >
        <div className="ra-audio-track-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="ra-audio-time">{fmt(display)}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
