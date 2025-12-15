import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

interface SignupPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptCount: number;
}

export const SignupPromptDialog = ({ isOpen, onClose, receiptCount }: SignupPromptDialogProps) => {
  const navigate = useNavigate();

  const handleSignup = () => {
    onClose();
    navigate('/signup', { state: { migrateGuest: true } });
  };

  const handlePremium = () => {
    onClose();
    navigate('/premium');
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
            🎉 Du har brukt dine 3 gratis scanninger!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-4 pt-4">
              <p className="text-foreground font-medium">
                Opprett gratis konto for å:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Lagre ubegrenset kvitteringer</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Få push-varsler før garanti utløper</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Synkronisere mellom alle enheter</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Aldri miste dine kvitteringer</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Dine {receiptCount} kvitteringer blir automatisk lagret når du registrerer deg.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button onClick={handleSignup} className="w-full">
            Opprett gratis konto
          </Button>
          <Button variant="outline" onClick={handlePremium} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Kjøp Premium direkte
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
