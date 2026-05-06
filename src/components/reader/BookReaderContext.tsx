// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER CONTEXT
// Gerenciamento de estado do leitor de livros com áudio sincronizado
// ============================================================================

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Book } from '../types/BookTypes';

export type ReadingMode = 'read' | 'listen' | 'read-listen';
export type NarratorVoice = 'male' | 'female';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number; // segundos
  endTime: number;   // segundos
  page?: number;
}

interface BookReaderState {
  // Configurações
  mode: ReadingMode;
  narratorVoice: NarratorVoice;
  playbackSpeed: number;
  
  // Reprodução
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  
  // Texto
  currentSegmentId: string | null;
  currentPage: number;
  
  // Áudio
  volume: number;
}

interface BookReaderContextType {
  // Estado
  state: BookReaderState;
  
  // Controles de reprodução
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  
  // Configurações
  setMode: (mode: ReadingMode) => void;
  setNarrator: (voice: NarratorVoice) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  
  // Navegação
  goToSegment: (segmentId: string) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  
  // Transcrição
  transcript: TranscriptSegment[];
  getCurrentSegment: () => TranscriptSegment | null;
  
  // Audio element ref
  audioRef: React.RefObject<HTMLAudioElement>;
}

const BookReaderContext = createContext<BookReaderContextType | undefined>(undefined);

interface BookReaderProviderProps {
  children: ReactNode;
  book: Book;
  transcript: TranscriptSegment[];
  audioUrl: string;
}

export function BookReaderProvider({ children, book, transcript, audioUrl }: BookReaderProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [state, setState] = useState<BookReaderState>({
    mode: 'read',
    narratorVoice: 'female',
    playbackSpeed: 1.0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSegmentId: transcript[0]?.id || null,
    currentPage: book.currentPage || 1,
    volume: 1.0,
  });

  // Atualizar tempo atual e segmento ativo
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setState(prev => ({ ...prev, currentTime }));
      
      // Encontrar segmento atual baseado no tempo
      const currentSegment = transcript.find(
        seg => currentTime >= seg.startTime && currentTime < seg.endTime
      );
      
      if (currentSegment && currentSegment.id !== state.currentSegmentId) {
        setState(prev => ({ 
          ...prev, 
          currentSegmentId: currentSegment.id,
          currentPage: currentSegment.page || prev.currentPage
        }));
      }
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [transcript, state.currentSegmentId]);

  // Controles de reprodução
  const play = () => {
    audioRef.current?.play();
    setState(prev => ({ ...prev, isPlaying: true }));
  };

  const pause = () => {
    audioRef.current?.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  const togglePlay = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const skipForward = (seconds: number = 15) => {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    seek(newTime);
  };

  const skipBackward = (seconds: number = 15) => {
    const newTime = Math.max(state.currentTime - seconds, 0);
    seek(newTime);
  };

  // Configurações
  const setMode = (mode: ReadingMode) => {
    setState(prev => ({ ...prev, mode }));
    
    // Se mudar para modo listen ou read-listen, iniciar reprodução
    if ((mode === 'listen' || mode === 'read-listen') && !state.isPlaying) {
      play();
    }
    
    // Se mudar para modo read, pausar
    if (mode === 'read' && state.isPlaying) {
      pause();
    }
  };

  const setNarrator = (voice: NarratorVoice) => {
    setState(prev => ({ ...prev, narratorVoice: voice }));
    // TODO: Trocar URL do áudio
  };

  const setPlaybackSpeed = (speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const setVolume = (volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  };

  // Navegação
  const goToSegment = (segmentId: string) => {
    const segment = transcript.find(s => s.id === segmentId);
    if (segment) {
      seek(segment.startTime);
      setState(prev => ({ 
        ...prev, 
        currentSegmentId: segmentId,
        currentPage: segment.page || prev.currentPage
      }));
    }
  };

  const goToPage = (page: number) => {
    const segment = transcript.find(s => s.page === page);
    if (segment) {
      goToSegment(segment.id);
    }
  };

  const nextPage = () => {
    goToPage(state.currentPage + 1);
  };

  const previousPage = () => {
    goToPage(Math.max(state.currentPage - 1, 1));
  };

  const getCurrentSegment = (): TranscriptSegment | null => {
    return transcript.find(s => s.id === state.currentSegmentId) || null;
  };

  return (
    <BookReaderContext.Provider
      value={{
        state,
        play,
        pause,
        togglePlay,
        seek,
        skipForward,
        skipBackward,
        setMode,
        setNarrator,
        setPlaybackSpeed,
        setVolume,
        goToSegment,
        goToPage,
        nextPage,
        previousPage,
        transcript,
        getCurrentSegment,
        audioRef,
      }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      {children}
    </BookReaderContext.Provider>
  );
}

export function useBookReader() {
  const context = useContext(BookReaderContext);
  if (!context) {
    throw new Error('useBookReader must be used within BookReaderProvider');
  }
  return context;
}
