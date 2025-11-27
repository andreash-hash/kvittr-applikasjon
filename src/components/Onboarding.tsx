import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Slide {
  image: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    image: '/images/slide1-receipt.png',
    title: 'Aldri mer mistet kvitteringer',
    description: 'La oss ta vare på dem for deg',
  },
  {
    image: '/images/slide2-scanning.png',
    title: 'Skann dine kvitteringer',
    description: 'Ta et bilde, så gjør AI-en resten',
  },
  {
    image: '/images/slide3-returns.png',
    title: 'Trygg bytting og retur',
    description: 'Hold styr på alle byttelapper og gavekort',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleSkip = async () => {
    // Save to localStorage (instant)
    localStorage.setItem('onboarding_completed', 'true');
    
    // Save to Supabase (for cross-device sync)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
    
    onComplete();
  };

  const handleComplete = async () => {
    // Save to localStorage (instant)
    localStorage.setItem('onboarding_completed', 'true');
    
    // Save to Supabase (for cross-device sync)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
    
    onComplete();
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      nextSlide();
    } else if (info.offset.x > threshold) {
      prevSlide();
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[10000] bg-background"
    >
      {/* Skip button - top right with safe area */}
      <button
        onClick={handleSkip}
        className="fixed z-20 text-white text-base font-semibold shadow-lg"
        style={{
          top: 'calc(16px + env(safe-area-inset-top))',
          right: 'calc(16px + env(safe-area-inset-right))',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      >
        Hopp over
      </button>

      {/* Slide content */}
      <div className="h-full flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragDirectionLock={true}
            onDragEnd={handleDragEnd}
            className="h-full flex flex-col relative"
          >
            {/* Full screen image */}
            <div className="absolute inset-0">
              <img 
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover object-center"
              />
              {/* Gradient overlay for text readability */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 50%)'
                }}
              />
            </div>

            {/* Navigation dots - positioned above text overlay */}
            <div 
              className="absolute left-0 right-0 z-10 flex justify-center gap-2"
              style={{ bottom: 'calc(280px + env(safe-area-inset-bottom))' }}
            >
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentSlide ? 1 : -1);
                    setCurrentSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 border ${
                    index === currentSlide
                      ? 'bg-primary w-6 border-primary'
                      : 'bg-white/50 border-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Text overlay - frosted glass effect at bottom */}
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-10 rounded-t-[24px] backdrop-blur-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
              }}
            >
              <div className="dark:bg-gray-800/95 dark:backdrop-blur-xl rounded-t-[24px] px-6 pt-8 pb-6">
                <h2 className="text-[28px] font-bold text-gray-900 dark:text-gray-50 mb-3 text-center leading-tight">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed text-center mb-6">
                  {slides[currentSlide].description}
                </p>

                {/* Action button */}
                {isLastSlide ? (
                  <Button
                    onClick={handleComplete}
                    className="w-full h-14 text-lg font-bold rounded-xl"
                  >
                    Kom i gang
                  </Button>
                ) : (
                  <Button
                    onClick={nextSlide}
                    variant="outline"
                    className="w-full h-14 text-lg font-semibold rounded-xl"
                  >
                    Neste
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Onboarding;
