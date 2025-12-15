import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Bell, Gift, Heart, Sparkles, UserPlus, Cloud } from 'lucide-react';
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

        {/* Guest notice */}
        {!isLoggedIn && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p>Du kan kjøpe Premium uten konto.</p>
            <p className="text-xs mt-1">Opprett konto senere for å synkronisere på tvers av enheter.</p>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3 pb-6">
          <Button 
            className="w-full h-12 text-lg"
            onClick={handleSubscribe}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Kjøp Premium
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
