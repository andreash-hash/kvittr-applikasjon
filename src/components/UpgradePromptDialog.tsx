import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

interface UpgradePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The paywall prompt. Only reached after the user has scanned twice — once as
 * a guest and once on a free account — so the copy assumes they already know
 * what the app does.
 */
export function UpgradePromptDialog({ isOpen, onClose }: UpgradePromptDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/premium');
  };

  const handleCancel = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Klar for resten av kvitteringene?
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Du har brukt de gratis skanningene dine. Premium koster 19 kr i måneden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Ubegrenset antall kvitteringer</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Push-varsel 30 dager før garantien utløper</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Byttelapper og gavekort med utløpsvarsling</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleUpgrade} className="w-full">
            Se Premium
          </Button>
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Ikke nå
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
