import { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  className = "" 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canRefresh = pullDistance >= threshold;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;

    const currentTouch = e.touches[0].clientY;
    const distance = Math.max(0, currentTouch - touchStart);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5)); // Add resistance
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    if (!isPulling && !isRefreshing) {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing]);

  const refreshIndicatorOpacity = Math.min(pullDistance / threshold, 1);
  const refreshIndicatorRotation = (pullDistance / threshold) * 180;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/90 backdrop-blur-sm border-b z-10"
        style={{
          height: Math.max(0, pullDistance),
          opacity: refreshIndicatorOpacity
        }}
        initial={false}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw 
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: !isRefreshing ? `rotate(${refreshIndicatorRotation}deg)` : undefined
            }}
          />
          <span className="text-sm">
            {isRefreshing 
              ? 'Atualizando...' 
              : canRefresh 
                ? 'Solte para atualizar' 
                : 'Puxe para atualizar'
            }
          </span>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{
          transform: `translateY(${Math.max(0, pullDistance)}px)`
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}