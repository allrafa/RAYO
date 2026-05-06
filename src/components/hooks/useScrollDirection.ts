import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollDirectionOptions {
  threshold?: number;
  initialDirection?: ScrollDirection;
}

export function useScrollDirection({
  threshold = 10,
  initialDirection = null
}: UseScrollDirectionOptions = {}): {
  scrollDirection: ScrollDirection;
  scrollY: number;
  isAtTop: boolean;
} {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Minimum delta required to register a direction change. We never go
    // below 6px so iOS rubber-band / trackpad inertia don't flip the
    // direction on every frame.
    const minDelta = Math.max(6, threshold);

    const updateScrollDirection = () => {
      // Negative values happen during iOS overscroll / rubber-band. Treat
      // them as "at top" and never as a direction change.
      const currentScrollY = Math.max(0, window.scrollY);
      setScrollY(currentScrollY);

      if (currentScrollY < threshold) {
        setScrollDirection(null);
      } else if (Math.abs(currentScrollY - lastScrollY.current) < minDelta) {
        // Ignore tiny jitter from inertia / sub-pixel scrolls.
        ticking.current = false;
        return;
      } else if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up');
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    // Inicializar com a posição atual
    lastScrollY.current = window.scrollY;
    setScrollY(window.scrollY);

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);

  return {
    scrollDirection,
    scrollY,
    isAtTop: scrollY < threshold
  };
}
