import { useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Trash2, Archive } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onArchive: () => void;
  disabled?: boolean;
}

const SwipeableCard = ({ children, onDelete, onArchive, disabled }: SwipeableCardProps) => {
  const controls = useAnimation();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // pixels to trigger action
  const maxSwipe = 120;

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -threshold || velocity < -500) {
      // Swiped left - Delete
      await controls.start({ x: -maxSwipe });
      setSwipeDirection('left');
    } else if (offset > threshold || velocity > 500) {
      // Swiped right - Archive
      await controls.start({ x: maxSwipe });
      setSwipeDirection('right');
    } else {
      // Snap back
      await controls.start({ x: 0 });
      setSwipeDirection(null);
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const offset = info.offset.x;
    if (offset < -20) {
      setSwipeDirection('left');
    } else if (offset > 20) {
      setSwipeDirection('right');
    } else {
      setSwipeDirection(null);
    }
  };

  const confirmAction = async () => {
    if (swipeDirection === 'left') {
      onDelete();
    } else if (swipeDirection === 'right') {
      onArchive();
    }
    await controls.start({ x: 0 });
    setSwipeDirection(null);
  };

  const cancelAction = async () => {
    await controls.start({ x: 0 });
    setSwipeDirection(null);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Archive (right swipe) */}
        <div 
          className={`flex-1 flex items-center justify-start pl-4 bg-muted-foreground transition-opacity duration-200 ${
            swipeDirection === 'right' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 text-white">
            <Archive className="h-5 w-5" />
            <span className="font-medium">Arkiver</span>
          </div>
        </div>
        
        {/* Delete (left swipe) */}
        <div 
          className={`flex-1 flex items-center justify-end pr-4 bg-destructive transition-opacity duration-200 ${
            swipeDirection === 'left' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium">Slett</span>
            <Trash2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Swipeable content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -maxSwipe, right: maxSwipe }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10 bg-card"
      >
        {children}
      </motion.div>

      {/* Action confirmation overlay */}
      {swipeDirection && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex gap-4">
            <button
              onClick={cancelAction}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground font-medium"
            >
              Avbryt
            </button>
            <button
              onClick={confirmAction}
              className={`px-4 py-2 rounded-lg font-medium text-white ${
                swipeDirection === 'left' ? 'bg-destructive' : 'bg-muted-foreground'
              }`}
            >
              {swipeDirection === 'left' ? 'Slett' : 'Arkiver'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableCard;
