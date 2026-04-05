import { useEffect, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventScroll?: boolean;
  enabled?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
    enabled = true
  } = options;

  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (preventScroll) {
      e.preventDefault();
    }
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;
    const isUpSwipe = distanceY > threshold;
    const isDownSwipe = distanceY < -threshold;

    // Add haptic feedback
    if ('vibrate' in navigator && (isLeftSwipe || isRightSwipe || isUpSwipe || isDownSwipe)) {
      navigator.vibrate(10);
    }

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      // Vertical swipe
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => onTouchStart(e);
    const handleTouchMove = (e: TouchEvent) => onTouchMove(e);
    const handleTouchEnd = () => onTouchEnd();

    document.addEventListener('touchstart', handleTouchStart as any, { passive: !preventScroll });
    document.addEventListener('touchmove', handleTouchMove as any, { passive: !preventScroll });
    document.addEventListener('touchend', handleTouchEnd as any);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart as any);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [enabled, touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, preventScroll]);

  return {
    swipeHandlers: {
      onTouchStart: (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (preventScroll) {
          e.preventDefault();
        }
        setTouchEnd({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
      },
      onTouchEnd: () => onTouchEnd()
    }
  };
}