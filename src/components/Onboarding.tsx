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
    image: '/images/slide1-scanning.png',
    title: 'Skann dine kvitteringer',
    description: 'Ta et bilde, så gjør AI-en resten',
  },
  {
    image: '/images/slide2-returns.png',
    title: 'Aldri mer mist byttelapper',
    description: 'Hold styr på alle returer og gavekort',
  },
  {
    image: '/images/slide3-receipt.png',
    title: 'Aldri mer mistet kvitteringer',
    description: 'La oss ta vare på dem for deg',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleComplete = () => {
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
    <div className="fixed inset-0 z-50 bg-background">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 z-10 text-muted-foreground text-base font-medium safe-area-top px-4 py-2"
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
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="flex-1 flex flex-col"
          >
            {/* Image area */}
            <div className="flex-1 relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${slides[currentSlide].image})`,
                  filter: 'brightness(0.9)'
                }}
              />
              {/* Fallback gradient if image doesn't exist */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/40" />
            </div>

            {/* Text overlay */}
            <div className="bg-card/95 dark:bg-card/95 backdrop-blur-sm rounded-t-3xl -mt-12 relative z-10 p-8 pb-safe-area-bottom">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                {slides[currentSlide].title}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation dots and buttons */}
        <div className="bg-card px-8 pb-8 safe-area-bottom">
          {/* Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentSlide ? 1 : -1);
                  setCurrentSlide(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {isLastSlide ? (
            <Button
              onClick={handleComplete}
              className="w-full h-14 text-lg font-semibold rounded-xl"
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
      </div>
    </div>
  );
};

export default Onboarding;
