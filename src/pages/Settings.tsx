import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    firebaseMessaging?: any;
    FIREBASE_VAPID_KEY?: string;
  }
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notify30Days, setNotify30Days] = useState(true);
  const [notify7Days, setNotify7Days] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
      }
    };
    loadSettings();
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      setPushEnabled(enabled);
      
      if (enabled) {
        // Request notification permission first
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        
        if (permission !== 'granted') {
          setPushEnabled(false);
          toast({
            title: "Push-varsler ble avvist",
            description: "Du må gi tillatelse for å motta varsler",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Check if Firebase is loaded
        if (!window.firebaseMessaging) {
          throw new Error('Firebase ikke lastet');
        }

        // Get FCM token
        const token = await window.firebaseMessaging.getToken({
          vapidKey: window.FIREBASE_VAPID_KEY
        });
        
        console.log('FCM token:', token);
        
        if (!token) {
          throw new Error('Kunne ikke hente FCM token');
        }
        
        // Save token to Supabase
        const { error: tokenError } = await supabase.from('push_tokens').upsert({
          user_id: userId,
          token: token,
          platform: 'web',
          enabled: true
        });
        
        if (tokenError) {
          console.error('Error saving push token:', tokenError);
          throw new Error('Kunne ikke lagre push token');
        }
        
        console.log('Push token saved successfully');
      } else {
        // Disable push notifications
        await supabase.from('push_tokens')
          .update({ enabled: false })
          .eq('user_id', userId);
      }
      
      // Always save preference to user_settings regardless of Firebase success
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId,
        notification_enabled: enabled
      });
      
      if (error) {
        console.error('Error saving user settings:', error);
        throw error;
      }
      
      toast({
        title: enabled ? "Push-varsler aktivert" : "Push-varsler deaktivert",
        description: enabled 
          ? "Du vil motta varsler om utløpende kvitteringer" 
          : "Du vil ikke lenger motta varsler"
      });
      
    } catch (error) {
      console.error('Settings update error:', error);
      setPushEnabled(!enabled);
      toast({
        title: "Kunne ikke oppdatere innstillinger",
        description: error instanceof Error ? error.message : "Vennligst prøv igjen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">Innstillinger</h1>
        </div>

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
              onClick={() => window.open('https://lovable.dev/privacy', '_blank')}
              className="w-full flex items-center justify-between text-sm hover:bg-accent p-2 rounded-md transition-colors"
            >
              <span className="font-medium">Personvern</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => window.open('https://lovable.dev/terms', '_blank')}
              className="w-full flex items-center justify-between text-sm hover:bg-accent p-2 rounded-md transition-colors"
            >
              <span className="font-medium">Vilkår</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
