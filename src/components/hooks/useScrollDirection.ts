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
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Se estiver no topo ou muito próximo
      if (currentScrollY < threshold) {
        setScrollDirection(null);
      } else if (Math.abs(currentScrollY - lastScrollY.current) < threshold) {
        // Ignorar movimentos muito pequenos
        ticking.current = false;
        return;
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up
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
