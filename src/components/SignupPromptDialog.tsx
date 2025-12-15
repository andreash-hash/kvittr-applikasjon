import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Shield, Bell, Sparkles } from 'lucide-react';

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

  const handleLogin = () => {
    onClose();
    navigate('/login', { state: { migrateGuest: true } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            🎉 Du har skannet {receiptCount} kvitteringer!
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Opprett en gratis konto for å lagre kvitteringene dine permanent og få tilgang til alle funksjoner.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Lagre kvitteringer trygt i skyen</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Bell className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Få varsler før garanti utløper</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Hold styr på gavekort og byttelapper</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSignup} className="w-full">
            Opprett gratis konto
          </Button>
          <Button variant="outline" onClick={handleLogin} className="w-full">
            Har allerede konto? Logg inn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
