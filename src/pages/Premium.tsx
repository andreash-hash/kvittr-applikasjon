import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Camera, Bell, Gift, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const Premium = () => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    toast.info('Kommer snart!');
  };

  const handleRestorePurchase = () => {
    toast.info('Kommer snart!');
  };

  return (
    <div className="min-h-screen bg-background safe-area-all">
      <div className="container max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Hero */}
        <div className="text-center space-y-2 py-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Kvittr Premium</h1>
          </div>
          <p className="text-lg text-muted-foreground">Aldri mer tapt garanti!</p>
        </div>

        {/* Features */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Ubegrenset kvitteringer</h3>
                <p className="text-sm text-muted-foreground">Skann så mange kvitteringer du vil</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Push-varsler før garanti utløper</h3>
                <p className="text-sm text-muted-foreground">Få varsel 30 og 7 dager før</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Byttelapper & Gavekort tracking</h3>
                <p className="text-sm text-muted-foreground">Hold styr på alle bytteretter</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Prioritert support</h3>
                <p className="text-sm text-muted-foreground">Få hjelp raskt når du trenger det</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="border-primary">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="text-4xl font-bold">19 kr</div>
            <div className="text-muted-foreground">per måned</div>
            <div className="text-sm text-muted-foreground pt-2">
              Kanseller når som helst · Automatisk fornyet
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-3 pb-6">
          <Button 
            className="w-full h-12 text-lg"
            onClick={handleSubscribe}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Start Premium nå
          </Button>
          
          <button
            onClick={handleRestorePurchase}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Gjenopprett kjøp
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 text-sm text-muted-foreground pb-8">
          <button
            onClick={() => window.open('https://kvittr.app/terms', '_blank')}
            className="hover:text-primary transition-colors"
          >
            Vilkår
          </button>
          <span>·</span>
          <button
            onClick={() => window.open('https://kvittr.app/privacy', '_blank')}
            className="hover:text-primary transition-colors"
          >
            Personvern
          </button>
        </div>
      </div>
    </div>
  );
};

export default Premium;
