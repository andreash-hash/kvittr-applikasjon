import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, ExternalLink, Moon, Sun, Monitor, Trash2, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Capacitor } from '@capacitor/core';
declare global {
  interface Window {
    firebaseMessaging?: any;
    FIREBASE_VAPID_KEY?: string;
  }
}

type Theme = 'light' | 'dark' | 'system';

const Settings = () => {
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notify30Days, setNotify30Days] = useState(true);
  const [notify7Days, setNotify7Days] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Load settings from database on mount
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch current notification setting
        const { data: settings } = await supabase
          .from('user_settings')
          .select('notification_enabled')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (settings) {
          setPushEnabled(settings.notification_enabled ?? false);
        }

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
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      setPushEnabled(enabled);
      
      if (enabled) {
        console.log('Current Notification.permission:', Notification.permission);
        
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission !== 'granted') {
          setPushEnabled(false);
          toast.error('Du må gi tillatelse for å motta varsler');
          setIsLoading(false);
          return;
        }

        if (!window.firebaseMessaging) {
          throw new Error('Firebase ikke lastet');
        }

        const token = await window.firebaseMessaging.getToken({
          vapidKey: window.FIREBASE_VAPID_KEY
        });
        
        if (!token) {
          throw new Error('Kunne ikke hente FCM token');
        }
        
        // Save FCM token to profiles table
        const { error: tokenError } = await supabase
          .from('profiles')
          .update({ fcm_token: token })
          .eq('id', userId);
        
        if (tokenError) {
          throw new Error('Kunne ikke lagre push token');
        }
      } else {
        // Clear FCM token when disabling
        await supabase
          .from('profiles')
          .update({ fcm_token: null })
          .eq('id', userId);
      }
      
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        notification_enabled: enabled
      });
      
      if (error) {
        throw error;
      }
      
      toast.success(enabled ? 'Push-varsler aktivert' : 'Push-varsler deaktivert');
      
    } catch (error) {
      console.error('Settings update error:', error);
      setPushEnabled(!enabled);
      toast.error(error instanceof Error ? error.message : 'Vennligst prøv igjen');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-background safe-area-all">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center mb-6" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">Innstillinger</h1>
        </div>

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
                  onClick={() => {
                    const platform = Capacitor.getPlatform();
                    if (platform === 'ios') {
                      window.open('https://apps.apple.com/account/subscriptions', '_system');
                    } else if (platform === 'android') {
                      window.open('https://play.google.com/store/account/subscriptions?package=app.kvittr', '_system');
                    } else {
                      toast.info('For å administrere abonnement:\n• iOS: Innstillinger → [ditt navn] → Abonnementer\n• Android: Play Store → Meny → Abonnementer');
                    }
                  }}
                >
                  Administrer abonnement
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-medium">Gratis plan</div>
                <p className="text-sm text-muted-foreground">5 kvitteringer per måned</p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/premium')}
                >
                  Oppgrader til Premium
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Push-varsler</CardTitle>
            <CardDescription>
              Få varsel når garantier og bytteretter snart utløper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex-1">
                <div className="font-medium">Push-varsler</div>
                <div className="text-sm text-muted-foreground">
                  Aktiver for å motta varsler
                </div>
              </Label>
              <Switch
                id="push-notifications"
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Timing */}
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

        {/* Account Management */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Kontohåndtering</CardTitle>
            <CardDescription>
              Administrer kontoen din
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;