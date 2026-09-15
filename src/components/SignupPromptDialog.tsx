import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

interface SignupPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptCount: number;
}

/**
 * Shown once the guest has used their free scan. The ask here is an account,
 * never a payment — the paywall comes one scan later, after the user has
 * something to lose.
 */
export const SignupPromptDialog = ({ isOpen, onClose, receiptCount }: SignupPromptDialogProps) => {
  const navigate = useNavigate();

  const handleSignup = () => {
    onClose();
    navigate('/signup', { state: { migrateGuest: true } });
  };

  const handleLater = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Fint! Nå er kvitteringen trygg 🎉
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-4 pt-4">
              <p className="text-foreground font-medium">
                Opprett gratis konto, så får du:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Én skanning til – helt gratis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Kvitteringene lagret i skyen, ikke bare på mobilen</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Oversikt over garanti og byttefrist</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {receiptCount === 1
                  ? 'Kvitteringen du nettopp skannet ligger foreløpig kun på denne enheten. Den flyttes automatisk over når du oppretter konto.'
                  : `Dine ${receiptCount} kvitteringer ligger foreløpig kun på denne enheten. De flyttes automatisk over når du oppretter konto.`}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button onClick={handleSignup} className="w-full">
            Opprett gratis konto
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            className="w-full text-muted-foreground"
          >
            Senere
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
