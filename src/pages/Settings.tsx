import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ExternalLink, Moon, Sun, Monitor, Trash2, Sparkles, Key, Check, X, LogIn, UserPlus, LogOut, Bell } from 'lucide-react';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SEO } from '@/components/SEO';
import { nb } from 'date-fns/locale';
import { getRemainingGuestScans, isGuestPremium } from '@/lib/guestStorage';
import { isMobileApp, getMobilePlatform } from '@/utils/platform';
import { showPaywallUI, showCustomerCenterUI, handleRevenueCatError } from '@/lib/revenuecat';


// Helper to safely get platform
const getPlatform = (): string => {
  return getMobilePlatform();
};

// Helper to open external URLs using Capacitor Browser plugin
const openExternalUrl = async (url: string): Promise<boolean> => {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
    return true;
  } catch (error) {
    console.error('Failed to open URL with Browser plugin:', error);
    return false;
  }
};

type Theme = 'light' | 'dark' | 'system';

const Settings = () => {
  const navigate = useNavigate();
  const [notify30Days, setNotify30Days] = useState(true);
  const [notify7Days, setNotify7Days] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // Use the native push notifications hook
  const { isEnabled: pushEnabled, isLoading, requestPermissions, disableNotifications, isNative } = useNativePushNotifications();
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Load settings from database on mount
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsGuest(false);
        setUserId(user.id);
        setUserEmail(user.email || null);
        
        // Fetch subscription info
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setSubscriptionTier(profile.subscription_tier || 'free');
          setSubscriptionExpiresAt(profile.subscription_expires_at);
        }
      } else {
        // Guest mode
        setIsGuest(true);
        // Check if guest has premium
        if (isGuestPremium()) {
          setSubscriptionTier('premium');
        }
      }
    };
    loadSettings();
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemPrefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await requestPermissions();
    } else {
      await disableNotifications();
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call edge function to permanently delete account
      const response = await fetch(
        `https://wdfxfhchugungurebbcc.supabase.co/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Sign out locally
      await supabase.auth.signOut();
      
      toast.success('Kontoen din er permanent slettet');
      navigate('/login');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Kunne ikke slette kontoen. Prøv igjen senere.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Vennligst fyll ut nåværende passord');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      toast.error('Det nye passordet oppfyller ikke kravene');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passordene stemmer ikke overens');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Feil nåværende passord');
        setIsChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message);
      } else {
        toast.success('Passord endret!');
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Kunne ikke endre passord. Prøv igjen.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const ValidationCheck = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {valid ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={valid ? 'text-green-500' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

  // Safe area fallback for native platforms (iOS status bar ~47-59pt, Android ~24-48dp)
  const headerTopPaddingFallback = isNative ? 48 : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Innstillinger – Kvittr" description="Administrer konto, varsler og abonnement i Kvittr." path="/settings" noindex />
      {/* Sticky header with proper safe area */}
      <div
        className="sticky top-0 z-10 bg-background border-b border-border/50"
        style={{
          paddingTop: `max(${headerTopPaddingFallback}px, env(safe-area-inset-top, 0px))`,
        }}
      >
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">Innstillinger</h1>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto p-4 space-y-6">

        {/* Guest Account Section */}
        {isGuest && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Gjestemodus</CardTitle>
              <CardDescription>
                {isGuestPremium() 
                  ? 'Du har Premium - opprett konto for å synkronisere'
                  : `${getRemainingGuestScans()} av 3 gratis scanninger gjenstående`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Opprett en konto for å lagre kvitteringene dine trygt i skyen og få tilgang til alle funksjoner.
              </p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => navigate('/signup')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Opprett konto
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Logg inn
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme / Dark Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Utseende</CardTitle>
            <CardDescription>
              Tilpass hvordan appen ser ut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handleThemeChange('light')}
              >
                <Sun className="h-4 w-4 mr-2" />
                Lys
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handleThemeChange('dark')}
              >
                <Moon className="h-4 w-4 mr-2" />
                Mørk
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handleThemeChange('system')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Auto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Abonnement</CardTitle>
            <CardDescription>
              Din nåværende plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionTier === 'premium' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium">Premium aktiv</span>
                </div>
                <p className="text-sm text-muted-foreground">Ubegrenset kvitteringer</p>
                {subscriptionExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Fornyes: {format(new Date(subscriptionExpiresAt), 'd. MMMM yyyy', { locale: nb })}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      await showCustomerCenterUI();
                    } catch (error: any) {
                      const errorMessage = handleRevenueCatError(error);
                      if (errorMessage !== 'cancelled') {
                        toast.error(errorMessage);
                      }
                    }
                  }}
                >
                  Administrer abonnement
                </Button>
              </div>
            ) : isGuest ? (
              <div className="space-y-3">
                <div className="font-medium">Gjestemodus</div>
                <p className="text-sm text-muted-foreground">Opprett konto for å abonnere på Premium</p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/signup')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Opprett konto
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-medium">Gratis plan</div>
                <p className="text-sm text-muted-foreground">2 kvitteringer per måned</p>
                <Button 
                  className="w-full"
                  onClick={async () => {
                    try {
                      await showPaywallUI();
                    } catch (error: any) {
                      const errorMessage = handleRevenueCatError(error);
                      if (errorMessage !== 'cancelled') {
                        toast.error(errorMessage);
                      }
                    }
                  }}
                >
                  Oppgrader til Premium
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications - only show for logged in users */}
        {!isGuest && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push-varsler
              </CardTitle>
              <CardDescription>
                Få beskjed når garantier, gavekort og byttelapper snart utgår
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isNative ? (
                <p className="text-sm text-muted-foreground">
                  Push-varsler er kun tilgjengelig i den nedlastede appen fra App Store eller Google Play
                </p>
              ) : subscriptionTier === 'premium' ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {pushEnabled ? 'Varsler aktivert' : 'Varsler deaktivert'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pushEnabled 
                        ? 'Du mottar varsler 7 og 3 dager før utløp'
                        : 'Aktiver for å motta varsler'
                      }
                    </div>
                  </div>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handlePushToggle}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium text-muted-foreground">Varsler deaktivert</div>
                      <div className="text-sm text-muted-foreground">
                        Kun for Premium-brukere
                      </div>
                    </div>
                    <Switch
                      checked={false}
                      disabled={true}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={async () => {
                      try {
                        await showPaywallUI();
                      } catch (error: any) {
                        const errorMessage = handleRevenueCatError(error);
                        if (errorMessage !== 'cancelled') {
                          toast.error(errorMessage);
                        }
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Oppgrader for push-varsler
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notification Timing - only for Premium users */}
        {!isGuest && subscriptionTier === 'premium' && (
          <Card>
            <CardHeader>
              <CardTitle>Varslingsinnstillinger</CardTitle>
              <CardDescription>
                Når skal du få varsel før utløp?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-30" className="flex-1">
                  <div className="font-medium">30-dagers varsel</div>
                  <div className="text-sm text-muted-foreground">
                    Varsle meg 30 dager før utløp
                  </div>
                </Label>
                <Switch
                  id="notify-30"
                  checked={notify30Days}
                  onCheckedChange={setNotify30Days}
                  disabled={!pushEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify-7" className="flex-1">
                  <div className="font-medium">7-dagers varsel</div>
                  <div className="text-sm text-muted-foreground">
                    Varsle meg 7 dager før utløp
                  </div>
                </Label>
                <Switch
                  id="notify-7"
                  checked={notify7Days}
                  onCheckedChange={setNotify7Days}
                  disabled={!pushEnabled}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle>App-informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">App versjon</span>
              <span className="text-sm text-muted-foreground">1.0.0</span>
            </div>

            <Separator />

            <button
              onClick={() => window.open('https://kvittr.app/privacy', '_blank')}
              className="w-full flex items-center justify-between text-sm hover:bg-accent p-2 rounded-md transition-colors"
            >
              <span className="font-medium">Personvern</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => window.open('https://kvittr.app/terms', '_blank')}
              className="w-full flex items-center justify-between text-sm hover:bg-accent p-2 rounded-md transition-colors"
            >
              <span className="font-medium">Vilkår</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Account Management - only for logged in users */}
        {!isGuest && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle>Kontohåndtering</CardTitle>
              <CardDescription>
                Administrer kontoen din
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPasswordDialog(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                Endre passord
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Slett konto permanent
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slett konto?</AlertDialogTitle>
                    <AlertDialogDescription className="text-left space-y-2">
                      <span>Dette vil permanent slette:</span>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>All dine kvitteringer</li>
                        <li>Alle byttelapper og gavekort</li>
                        <li>Din brukerinformasjon</li>
                        <li>Abonnement (hvis aktivt)</li>
                      </ul>
                      <p className="font-medium text-destructive mt-3">
                        Denne handlingen kan ikke angres.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Sletter...' : 'Slett konto permanent'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Separator className="my-3" />
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/login');
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Endre passord</DialogTitle>
              <DialogDescription>
                Fyll ut feltene for å endre passordet ditt
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Nåværende passord</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nytt passord</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {newPassword.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <ValidationCheck valid={hasMinLength} text="Minst 8 tegn" />
                    <ValidationCheck valid={hasUppercase} text="Minst én stor bokstav (A-Z)" />
                    <ValidationCheck valid={hasLowercase} text="Minst én liten bokstav (a-z)" />
                    <ValidationCheck valid={hasNumber} text="Minst ett tall (0-9)" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Bekreft nytt passord</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword.length > 0 && (
                  <ValidationCheck valid={passwordsMatch} text="Passordene stemmer overens" />
                )}
              </div>
              <Button 
                className="w-full" 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !passwordsMatch}
              >
                {isChangingPassword ? 'Endrer...' : 'Endre passord'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
      
      {/* Bottom safe area */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
};

export default Settings;