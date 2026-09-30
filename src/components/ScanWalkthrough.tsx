import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon, Sun, Crop, Sparkles, X } from 'lucide-react';

const WALKTHROUGH_SEEN_KEY = 'kvittr_scan_walkthrough_seen';

export const hasSeenScanWalkthrough = (): boolean => {
  try {
    return localStorage.getItem(WALKTHROUGH_SEEN_KEY) === 'true';
  } catch {
    // Private mode or blocked storage: showing the walkthrough twice is a far
    // smaller problem than crashing on the first screen a new user sees.
    return false;
  }
};

export const markScanWalkthroughSeen = (): void => {
  try {
    localStorage.setItem(WALKTHROUGH_SEEN_KEY, 'true');
  } catch {
    // no-op
  }
};

const steps = [
  {
    icon: Crop,
    title: 'Få med hele kvitteringen',
    body: 'Legg den på et flatt underlag og hold mobilen rett over. Alle fire hjørnene må være innenfor bildet.',
  },
  {
    icon: Sun,
    title: 'Sørg for lys',
    body: 'Unngå skygge fra din egen hånd. Dagslys eller en lampe rett over gir best resultat.',
  },
  {
    icon: Sparkles,
    title: 'Resten ordner appen',
    body: 'Kvittr leser butikk, beløp, dato og garantitid selv – du trenger ikke skrive noe.',
  },
];

interface ScanWalkthroughProps {
  /** Fired when the user is ready to shoot; opens the camera directly. */
  onStart: () => void;
  onDismiss: () => void;
}

/**
 * First-run coaching for the scan screen. The first scan happens before the
 * user has an account, so this is the only chance to explain the one action
 * the whole product depends on.
 */
export const ScanWalkthrough = ({ onStart, onDismiss }: ScanWalkthroughProps) => {
  const [step, setStep] = useState(0);
  const isLastStep = step === steps.length - 1;
  const { icon: Icon, title, body } = steps[step];

  const handleNext = () => {
    if (isLastStep) {
      markScanWalkthroughSeen();
      onStart();
      return;
    }
    setStep(step + 1);
  };

  const handleSkip = () => {
    markScanWalkthroughSeen();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-background/95 backdrop-blur-sm flex flex-col safe-area-all">
      <div
        className="flex justify-end p-4"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}
      >
        <button
          onClick={handleSkip}
          aria-label="Lukk veiledning"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <Icon className="h-12 w-12 text-primary" />
        </div>

        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground max-w-sm leading-relaxed">{body}</p>

        <div className="flex gap-2 mt-10" role="tablist" aria-label="Steg i veiledningen">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              role="tab"
              aria-selected={index === step}
              aria-label={`Steg ${index + 1} av ${steps.length}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-6 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-3">
        <Button className="w-full h-14 text-lg" onClick={handleNext}>
          {isLastStep ? (
            <>
              <CameraIcon className="mr-2 h-5 w-5" />
              Ta bilde
            </>
          ) : (
            'Neste'
          )}
        </Button>
        {!isLastStep && (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
            Hopp over
          </Button>
        )}
      </div>
    </div>
  );
};
