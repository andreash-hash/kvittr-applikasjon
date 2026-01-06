import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer = ({ imageUrl, isOpen, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  // Reset scale when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));

  // Pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance) {
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = newDistance / touchDistance;
      setScale(prev => Math.min(Math.max(prev * ratio, 1), 3));
      setTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
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

          {/* Image */}
          <img
            src={imageUrl}
            alt="Kvittering"
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
