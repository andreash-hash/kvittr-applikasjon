import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

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

  const handleSkip = () => {
    // Save to localStorage only (user is not authenticated yet)
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleComplete = () => {
    // Save to localStorage only (user is not authenticated yet)
    localStorage.setItem('onboarding_completed', 'true');
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
            <div className="absolute inset-0 bg-[#1F2937]">
              <img 
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className={`w-full h-full object-contain object-center ${
                  currentSlide === 0 ? 'blur-[2px]' : ''
                }`}
              />
            </div>

            {/* Text overlay - floating card centered */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute left-0 right-0 mx-auto top-1/2 -translate-y-1/2 z-10 w-[83%] max-w-[390px] backdrop-blur-xl rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              {/* Navigation dots - positioned above text card */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex justify-center gap-2">
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
              <div className="dark:bg-gray-800/95 dark:backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.24)] rounded-[20px] px-5 py-5">
                <h2 className="text-[20px] font-bold text-gray-900 dark:text-gray-50 mb-1.5 text-center leading-tight">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-[1.4] text-center mb-4">
                  {slides[currentSlide].description}
                </p>

                {/* Action button */}
                {isLastSlide ? (
                  <Button
                    onClick={handleComplete}
                    className="w-full h-10 text-sm font-bold rounded-xl"
                  >
                    Kom i gang
                  </Button>
                ) : (
                  <Button
                    onClick={nextSlide}
                    variant="outline"
                    className="w-full h-10 text-sm font-semibold rounded-xl"
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
