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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notify30Days, setNotify30Days] = useState(true);
  const [notify7Days, setNotify7Days] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user and load settings
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Load user settings from database
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
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
    setPushEnabled(enabled);
    
    if (!userId) return;

    if (enabled) {
      // Request push notification permission via OneSignal
      try {
        // Wait for OneSignal to be initialized
        if (typeof (window as any).OneSignalDeferred === 'undefined') {
          throw new Error('OneSignal not loaded');
        }
        
        (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
          // Request permission using v16 API
          await OneSignal.Slidedown.promptPush();
          
          // Get subscription ID
          const subscriptionId = await OneSignal.User.PushSubscription.id;
          
          if (subscriptionId) {
            // Save to database
            await supabase
              .from('user_settings')
              .upsert({
                user_id: userId,
                notification_enabled: true,
                push_token: subscriptionId
              });
            
            toast({
              title: "Push-varsler aktivert",
              description: "Du vil nå motta varsler om utløpende kvitteringer",
            });
          }
        });
      } catch (error) {
        console.error('OneSignal error:', error);
        setPushEnabled(false);
        toast({
          title: "Kunne ikke aktivere varsler",
          description: "Vennligst prøv igjen eller sjekk nettleserinnstillingene",
          variant: "destructive"
        });
      }
    } else {
      // Disable notifications and unsubscribe from OneSignal
      try {
        (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
          await OneSignal.User.PushSubscription.optOut();
        });
      } catch (error) {
        console.error('OneSignal unsubscribe error:', error);
      }
      
      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          notification_enabled: false,
          push_token: null
        });
      
      toast({
        title: "Push-varsler deaktivert",
        description: "Du vil ikke lenger motta varsler",
      });
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
