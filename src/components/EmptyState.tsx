import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Gift, RefreshCw, Archive, Camera, Plus } from 'lucide-react';

interface EmptyStateProps {
  filter: 'alle' | 'kvitteringer' | 'gavekort' | 'bytte' | 'arkiv' | 'expiring';
  onScan: () => void;
}

const EmptyState = ({ filter, onScan }: EmptyStateProps) => {
  const getConfig = () => {
    switch (filter) {
      case 'kvitteringer':
        return {
          icon: Receipt,
          title: 'Ingen kvitteringer enna',
          description: 'Skann din forste kvittering for a holde orden pa garantier og kjop.',
          color: 'text-category-receipt',
          bgColor: 'bg-category-receipt/10',
          buttonText: 'Skann kvittering',
        };
      case 'gavekort':
        return {
          icon: Gift,
          title: 'Ingen gavekort registrert',
          description: 'Hold styr pa gavekortsaldoen og utlopsdatoer.',
          color: 'text-category-giftcard',
          bgColor: 'bg-category-giftcard/10',
          buttonText: 'Legg til gavekort',
        };
      case 'bytte':
        return {
          icon: RefreshCw,
          title: 'Ingen byttelapper',
          description: 'Skann byttelapper for a huske byttefristen.',
          color: 'text-category-return',
          bgColor: 'bg-category-return/10',
          buttonText: 'Skann byttelapp',
        };
      case 'arkiv':
        return {
          icon: Archive,
          title: 'Arkivet er tomt',
          description: 'Her havner utlopte kvitteringer og brukte gavekort.',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          buttonText: null,
        };
      case 'expiring':
        return {
          icon: Receipt,
          title: 'Ingenting utloper snart',
          description: 'Flott! Du har ingen garantier eller byttefrister som utloper de neste 60 dagene.',
          color: 'text-success',
          bgColor: 'bg-success/10',
          buttonText: null,
        };
      default:
        return {
          icon: Camera,
          title: 'Kom i gang med Kvittr',
          description: 'Skann din forste kvittering for a holde orden pa garantier, gavekort og byttelapper.',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          buttonText: 'Skann forste kvittering',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Card className="p-8 rounded-2xl border border-border/50 bg-card">
      <div className="flex flex-col items-center text-center">
        <div className={`w-20 h-20 rounded-2xl ${config.bgColor} flex items-center justify-center mb-5`}>
          <Icon className={`h-10 w-10 ${config.color}`} />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {config.title}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-[260px] mb-6 leading-relaxed">
          {config.description}
        </p>
        
        {config.buttonText && (
          <Button 
            onClick={onScan}
            className="h-12 px-6 rounded-xl font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            {config.buttonText}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default EmptyState;
