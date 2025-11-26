import { useState, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
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
  const controls = useAnimation();

  const triggerDistance = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
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
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.5, triggerDistance * 1.5);
      setPullDistance(distance);
    }
  }, [isPulling, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
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
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex justify-center items-center z-10 pointer-events-none"
        style={{
          top: -40,
          height: 40,
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <div 
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 transition-all ${
            isRefreshing ? 'scale-100' : ''
          }`}
          style={{
            transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
            opacity: progress > 0.1 ? 1 : 0,
          }}
        >
          <Loader2 
            className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
