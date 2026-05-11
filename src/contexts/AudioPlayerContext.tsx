import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface AudioTrack {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  coverUrl?: string | null;
}

interface AudioPlayerContextValue {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: AudioTrack) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  close: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  // Marca quando o usuário pediu pra começar uma faixa nova; o effect
  // abaixo cuida de load()/play() depois que o React aplicou o novo src.
  // Isso é mais determinístico que microtask + queueMicrotask, que é
  // sensível a render concorrente.
  const pendingPlayRef = useRef<string | null>(null);

  const playTrack = useCallback((track: AudioTrack) => {
    setCurrentTrack((prev) => {
      if (prev && prev.id === track.id) {
        // Mesma faixa: toggle pause/play sem recarregar.
        const el = audioRef.current;
        if (el) {
          if (el.paused) void el.play().catch(() => setIsPlaying(false));
          else el.pause();
        }
        return prev;
      }
      setCurrentTime(0);
      setDuration(0);
      pendingPlayRef.current = track.id;
      return track;
    });
  }, []);

  // Quando currentTrack muda pra uma faixa pendente, o React já aplicou
  // o novo src no <audio> via JSX — agora load()/play() é seguro.
  useEffect(() => {
    if (!currentTrack || pendingPlayRef.current !== currentTrack.id) return;
    pendingPlayRef.current = null;
    const el = audioRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => setIsPlaying(false));
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    if (el.paused) void el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const clamped = Math.max(0, Math.min(duration, seconds));
    el.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const close = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({ currentTrack, isPlaying, currentTime, duration, playTrack, togglePlay, seek, close, audioRef }),
    [currentTrack, isPlaying, currentTime, duration, playTrack, togglePlay, seek, close],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} src={currentTrack?.audioUrl ?? undefined} preload="metadata" />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer deve ser usado dentro de <AudioPlayerProvider>");
  return ctx;
}

export function useIsTrackPlaying(trackId: string | null | undefined): boolean {
  const { currentTrack, isPlaying } = useAudioPlayer();
  if (!trackId) return false;
  return currentTrack?.id === trackId && isPlaying;
}
