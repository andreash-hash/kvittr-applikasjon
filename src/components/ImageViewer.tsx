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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Reset position when scale returns to 1
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

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
  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (scale === 1) {
      // Zoom in to 2x
      setScale(2);
    } else {
      // Reset to 1x
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch-to-zoom start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    } else if (e.touches.length === 1) {
      // Check for double-tap
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        e.preventDefault();
        handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        
        // Start drag if zoomed in
        if (scale > 1) {
          setIsDragging(true);
          setDragStart({
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y
          });
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance) {
      // Pinch-to-zoom
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
      // Pan/drag when zoomed
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      // Calculate max pan distance based on scale
      const container = containerRef.current;
      if (container) {
        const maxPan = (scale - 1) * 150; // Limit pan based on zoom level
        setPosition({
          x: Math.max(-maxPan, Math.min(maxPan, newX)),
          y: Math.max(-maxPan, Math.min(maxPan, newY))
        });
      } else {
        setPosition({ x: newX, y: newY });
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
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
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? 'grab' : 'default'
            }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
