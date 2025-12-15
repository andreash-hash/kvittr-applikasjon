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
            Du har brukt dine 2 gratis scanninger denne måneden! 🎯
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Oppgrader til Premium for ubegrenset tilgang
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Ubegrenset scanninger</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Push-varsler før garanti utløper</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success flex-shrink-0" />
            <span className="text-sm">Synkronisering mellom enheter</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleUpgrade} className="w-full">
            Se Premium
          </Button>
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Avbryt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
