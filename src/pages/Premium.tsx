import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Bell, Gift, Heart, Sparkles, UserPlus, Cloud, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setGuestPremium, isGuestPremium } from '@/lib/guestStorage';
import { useToastNotification } from '@/components/CenteredToast';

const Premium = () => {
  const navigate = useNavigate();
  const { showToast } = useToastNotification();
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndPremium();
  }, []);

  const checkAuthAndPremium = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setIsLoggedIn(true);
      // Check Supabase premium status
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', session.user.id)
        .maybeSingle();
      
      setIsPremium(profile?.subscription_tier === 'premium');
    } else {
      setIsLoggedIn(false);
      // Check local premium status for guests
      setIsPremium(isGuestPremium());
    }
    setIsLoading(false);
  };

  const handleSubscribe = async () => {
    // For now, show launch dialog (replace with actual IAP when ready)
    // This is where you would integrate native IAP
    setShowLaunchDialog(true);
  };

  const handlePurchaseComplete = async (transactionId?: string) => {
    if (isLoggedIn) {
      // Save to Supabase for logged-in users
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
      }
      showToast('Premium aktivert!', 'success');
      setIsPremium(true);
    } else {
      // Save locally for guest users
      setGuestPremium(transactionId);
      setIsPremium(true);
      showToast('Premium aktivert!', 'success');
      // Show sync prompt for guests
      setShowSyncDialog(true);
    }
  };

  const handleRestorePurchase = () => {
    setShowLaunchDialog(true);
  };

  const handleCreateAccount = () => {
    setShowSyncDialog(false);
    navigate('/signup', { state: { migratePremium: true } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Already premium view
  if (isPremium) {
    return (
      <div className="min-h-screen bg-background safe-area-all">
        <div className="container max-w-md mx-auto p-4 space-y-6">
          <div className="flex items-center" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-center space-y-4 py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Du har Premium! ✨</h1>
            <p className="text-muted-foreground">
              Du har tilgang til alle Premium-funksjoner.
            </p>
            
            {!isLoggedIn && (
              <Card className="mt-6 border-primary/50">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Synkroniser på tvers av enheter</p>
                      <p className="text-xs text-muted-foreground">
                        Opprett konto for å beholde Premium hvis du bytter enhet
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/signup', { state: { migratePremium: true } })}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Opprett konto
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Button 
            variant="default"
            className="w-full"
            onClick={() => {
              // Opens platform-specific subscription management
              showToast('Åpne innstillinger for å administrere abonnement', 'success');
            }}
          >
            Administrer abonnement
          </Button>

          <Button 
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
          >
            Tilbake
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">Kvittr Premium</h1>
          </div>
          <p className="text-lg text-muted-foreground">Aldri mer tapt garanti!</p>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free Plan */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-sm">Gratis</h3>
                <p className="text-xs text-muted-foreground">0 kr/mnd</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                  <span>2 kvitteringer per måned</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                  <span>Skylagring og synkronisering</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                  <span>Garanti-tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                  <span>Byttelapper og gavekort</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <X className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>Push-varsler</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-sm text-primary">Premium ✨</h3>
                <p className="text-xs text-muted-foreground">19 kr/mnd</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Ubegrenset kvitteringer</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Skylagring og synkronisering</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Garanti-tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Byttelapper og gavekort</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Push-varsler 30 dager før utløp</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Prioritert support</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Value proposition */}
        <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
          <p className="font-medium text-foreground mb-1">2 kvitteringer per måned er begrensende</p>
          <p>Med Premium får du frihet til å skanne alt – kvitteringer, garantier, byttelapper og gavekort.</p>
        </div>

        {/* Pricing highlight */}
        <Card className="border-primary">
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-primary">19 kr</div>
            <div className="text-sm text-muted-foreground">per måned · Kanseller når som helst</div>
          </CardContent>
        </Card>

        {/* CTA based on user state */}
        <div className="space-y-3 pb-6">
          {!isLoggedIn ? (
            <>
              <Button 
                className="w-full h-12 text-lg"
                onClick={() => navigate('/signup')}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Opprett konto først
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Du trenger en konto for å bruke Premium
              </p>
            </>
          ) : (
            <Button 
              className="w-full h-12 text-lg"
              onClick={handleSubscribe}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Start Premium
            </Button>
          )}
          
          {isLoggedIn && (
            <button
              onClick={handleRestorePurchase}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Gjenopprett kjøp
            </button>
          )}
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

      {/* Premium Launch Dialog */}
      <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Premium lanseres snart! 🎉
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left space-y-4 pt-2">
                <p>
                  Kvittr Premium med ubegrenset kvitteringer og push-varsler lanseres snart.
                </p>
                <div>
                  <p className="font-medium text-foreground mb-2">Funksjoner:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Ubegrenset kvitteringer</li>
                    <li>• Push-varsler 30 dager før garanti utløper</li>
                    <li>• Prioritert support</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowLaunchDialog(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Account Dialog (shown after guest purchase) */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Premium aktivert! ✨
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center space-y-4 pt-2">
                <p>
                  Du har nå tilgang til alle Premium-funksjoner på denne enheten.
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <Cloud className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-foreground text-sm">
                    Opprett konto for å synkronisere Premium på tvers av enheter
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valgfritt – du kan fortsette uten konto
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleCreateAccount} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Opprett konto
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowSyncDialog(false);
                navigate('/dashboard');
              }}
              className="w-full"
            >
              Fortsett uten konto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Premium;
