import { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PullToRefresh = ({ children, onRefresh, disabled }: PullToRefreshProps) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const hasDecidedDirection = useRef(false);

  const triggerDistance = 60;
  const maxPullDistance = 100;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // CRITICAL: Only allow pull-to-refresh at ABSOLUTE TOP
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollY > 10 || scrollTop > 10) return;
    
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = false;
    hasDecidedDirection.current = false;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY.current;
    const deltaX = Math.abs(currentX - startX.current);
    const absDeltaY = Math.abs(deltaY);
    
    // Detect swipe direction on first significant movement
    if (!hasDecidedDirection.current && (deltaX > 10 || absDeltaY > 10)) {
      hasDecidedDirection.current = true;
      // If horizontal movement is greater, it's a tab swipe - ignore
      if (deltaX > absDeltaY) {
        isHorizontalSwipe.current = true;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }
    }
    
    // If horizontal swipe detected, don't process
    if (isHorizontalSwipe.current) return;
    
    if (deltaY > 0) {
      // Apply spring resistance - stronger resistance as you pull further
      const resistance = 1 - Math.min(deltaY / (maxPullDistance * 3), 0.7);
      const distance = Math.min(deltaY * resistance * 0.5, maxPullDistance);
      setPullDistance(distance);
    }
  }, [isPulling, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isHorizontalSwipe.current) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    setIsPulling(false);

    if (pullDistance >= triggerDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, onRefresh, disabled]);

  const progress = Math.min(pullDistance / triggerDistance, 1);

  return (
    <div 
      ref={containerRef}
      className="relative h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator - Spring animated spinner */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center z-10 pointer-events-none"
        style={{
          top: -40,
          height: 40,
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shadow-lg transition-all"
          style={{
            transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
            opacity: progress > 0.1 ? 1 : 0,
            transition: isPulling ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Loader2 
            className={`h-6 w-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </div>
      </div>

      {/* Content with spring animation */}
      <div
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
