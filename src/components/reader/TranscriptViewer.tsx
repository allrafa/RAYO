// ============================================================================
// 📚 RAYO ECOSYSTEM - TRANSCRIPT VIEWER
// Visualizador de transcrição sincronizada com áudio
// ============================================================================

import { useEffect, useRef } from 'react';
import { useBookReader } from './BookReaderContext';
import { useTheme } from '../ThemeProvider';

export function TranscriptViewer() {
  const { state, transcript, goToSegment } = useBookReader();
  const { theme } = useTheme();
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o segmento ativo
  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [state.currentSegmentId]);

  return (
    <div className="space-y-0">
      {transcript.map((segment, index) => {
        const isActive = segment.id === state.currentSegmentId;
        const isPast = state.currentTime > segment.endTime;
        
        return (
          <div
            key={segment.id}
            ref={isActive ? activeSegmentRef : null}
            onClick={() => goToSegment(segment.id)}
            className="cursor-pointer transition-all duration-300 py-2"
            style={{
              background: 'transparent',
            }}
          >
            {/* Text - Minimalista como na imagem do Headway */}
            <p
              className="text-[16px] lg:text-[18px] leading-relaxed"
              style={{
                color: isActive 
                  ? 'var(--raio-accent-primary)' 
                  : isPast 
                    ? 'var(--raio-text-tertiary)'
                    : 'var(--raio-text-primary)',
                fontWeight: isActive ? 600 : 400,
                opacity: isPast && !isActive ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {segment.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
