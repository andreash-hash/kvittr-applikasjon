import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Logo } from '@/components/Logo';

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
        className="fixed z-20 text-white text-base font-semibold drop-shadow-lg"
        style={{
          top: 'calc(16px + env(safe-area-inset-top))',
          right: 'calc(16px + env(safe-area-inset-right))',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
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
            {/* Full screen image with gradient overlay */}
            <div className="absolute inset-0 bg-[#1F2937]">
              <img 
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className={`w-full h-full object-cover object-center ${
                  currentSlide === 0 ? 'blur-[2px]' : ''
                }`}
              />
              {/* Strong dark gradient overlay at top for logo readability */}
              <div 
                className="absolute top-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: '200px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)'
                }}
              />
              {/* Subtle gradient overlay for better text contrast at bottom */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
            </div>

            {/* Text overlay - floating card in lower third */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute left-0 right-0 mx-auto z-10 w-[85%] max-w-[580px] rounded-[20px]"
              style={{
                bottom: 'calc(80px + env(safe-area-inset-bottom))',
                background: '#F5E6D3',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}
            >
              {/* Navigation dots - positioned above text card */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex justify-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentSlide ? 1 : -1);
                      setCurrentSlide(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 border shadow-md ${
                      index === currentSlide
                        ? 'w-6 border-white'
                        : 'bg-white/60 border-white/50'
                    }`}
                    style={
                      index === currentSlide
                        ? {
                            background: 'linear-gradient(90deg, #FF6B9D 0%, #FFA500 35%, #6366F1 65%, #16A085 100%)',
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="px-6 py-6">
                <h2 
                  className="text-[24px] font-bold text-center"
                  style={{
                    background: 'linear-gradient(90deg, #2C3E50 0%, #FF6B9D 25%, #FFA500 50%, #6366F1 75%, #16A085 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.2',
                    marginBottom: '10px',
                    fontWeight: '700',
                  }}
                >
                  {slides[currentSlide].title}
                </h2>
                <p 
                  className="text-[15px] text-center"
                  style={{ 
                    color: '#4B5563',
                    lineHeight: '1.4',
                    marginBottom: '20px',
                  }}
                >
                  {slides[currentSlide].description}
                </p>

                {/* Action button */}
                {isLastSlide ? (
                  <Button
                    onClick={handleComplete}
                    className="w-full text-white"
                    style={{
                      background: '#1E293B',
                      height: '52px',
                      fontSize: '17px',
                      fontWeight: '600',
                      borderRadius: '14px',
                    }}
                  >
                    Kom i gang
                  </Button>
                ) : (
                  <Button
                    onClick={nextSlide}
                    className="w-full text-white"
                    style={{
                      background: '#1E293B',
                      height: '52px',
                      fontSize: '17px',
                      fontWeight: '600',
                      borderRadius: '14px',
                    }}
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
