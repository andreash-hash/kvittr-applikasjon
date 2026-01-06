import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer = ({ imageUrl, isOpen, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0, time: 0 });
  const animationRef = useRef<number | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isOpen]);

  // Reset position when scale returns to 1
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  const getMaxPan = (currentScale: number) => (currentScale - 1) * 150;

  const clampPosition = (x: number, y: number, currentScale: number) => {
    const maxPan = getMaxPan(currentScale);
    return {
      x: Math.max(-maxPan, Math.min(maxPan, x)),
      y: Math.max(-maxPan, Math.min(maxPan, y))
    };
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  // Double-tap to zoom
  const handleDoubleTap = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Momentum animation
  const applyMomentum = () => {
    const friction = 0.95;
    const minVelocity = 0.5;

    const animate = () => {
      velocityRef.current.x *= friction;
      velocityRef.current.y *= friction;

      if (Math.abs(velocityRef.current.x) < minVelocity && Math.abs(velocityRef.current.y) < minVelocity) {
        animationRef.current = null;
        return;
      }

      setPosition(prev => {
        const newPos = clampPosition(
          prev.x + velocityRef.current.x,
          prev.y + velocityRef.current.y,
          scale
        );
        
        // Stop if hitting boundaries
        if (newPos.x !== prev.x + velocityRef.current.x) velocityRef.current.x = 0;
        if (newPos.y !== prev.y + velocityRef.current.y) velocityRef.current.y = 0;
        
        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        e.preventDefault();
        handleDoubleTap();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        
        if (scale > 1) {
          setIsDragging(true);
          setDragStart({
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y
          });
          lastTouchRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: now
          };
          velocityRef.current = { x: 0, y: 0 };
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance) {
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = newDistance / touchDistance;
      setScale(prev => {
        const newScale = Math.min(Math.max(prev * ratio, 1), 3);
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
      setTouchDistance(newDistance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      const now = Date.now();
      const dt = now - lastTouchRef.current.time;
      
      if (dt > 0) {
        velocityRef.current = {
          x: (e.touches[0].clientX - lastTouchRef.current.x) * 0.8,
          y: (e.touches[0].clientY - lastTouchRef.current.y) * 0.8
        };
      }
      
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: now
      };

      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition(clampPosition(newX, newY, scale));
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
    
    if (isDragging && scale > 1) {
      const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
      if (speed > 2) {
        applyMomentum();
      }
    }
    
    setIsDragging(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full w-full h-full max-h-full p-0 bg-black border-none rounded-none [&>button]:hidden"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div 
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={() => onClose()}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Zoom controls */}
          <div 
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex gap-3"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="bg-white/10 hover:bg-white/20 rounded-full p-3 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="bg-white/10 rounded-full px-4 py-3 text-white text-sm font-medium min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="bg-white/10 hover:bg-white/20 rounded-full p-3 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Hint text for zoom */}
          {scale === 1 && (
            <p className="absolute top-20 left-1/2 -translate-x-1/2 text-white/50 text-sm z-40">
              Dobbelttrykk for å zoome
            </p>
          )}

          {/* Image */}
          <img
            src={imageUrl}
            alt="Kvittering"
            className="max-w-full max-h-full object-contain select-none"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
