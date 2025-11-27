import { useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Trash2, Archive } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onArchive: () => void;
  disabled?: boolean;
}

const SwipeableCard = ({ children, onDelete, onArchive, disabled }: SwipeableCardProps) => {
  const controls = useAnimation();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 100; // pixels to trigger action
  const maxSwipe = 120;

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -threshold || velocity < -500) {
      // Swiped left - Delete (show confirmation)
      await controls.start({ x: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } });
      setSwipeDirection(null);
      setShowDeleteConfirm(true);
    } else if (offset > threshold || velocity > 500) {
      // Swiped right - Archive (show confirmation)
      await controls.start({ x: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } });
      setSwipeDirection(null);
      setShowArchiveConfirm(true);
    } else {
      // Snap back
      await controls.start({ x: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } });
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

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await controls.start({ x: -maxSwipe * 2, opacity: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } });
    onDelete();
    await controls.start({ x: 0, opacity: 1 });
  };

  const handleConfirmArchive = async () => {
    setShowArchiveConfirm(false);
    await controls.start({ x: maxSwipe * 2, opacity: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } });
    onArchive();
    await controls.start({ x: 0, opacity: 1 });
  };

  return (
    <>
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
          dragElastic={0.05}
          dragTransition={{ 
            bounceStiffness: 600,
            bounceDamping: 20
          }}
          whileDrag={{ scale: 1.02 }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={controls}
          className="relative z-10 bg-card"
        >
          {children}
        </motion.div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett kvittering</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne kvitteringen? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arkiver kvittering?</AlertDialogTitle>
            <AlertDialogDescription>
              Kvitteringen flyttes til arkivet og fjernes fra oversikten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmArchive} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Arkiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SwipeableCard;
