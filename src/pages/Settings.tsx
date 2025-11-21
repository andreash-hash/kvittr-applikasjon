import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [emailReminders, setEmailReminders] = useState(false);
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
          setNotifications(settings.notification_enabled ?? true);
        }
      }
    };
    loadSettings();
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotifications(enabled);
    
    if (!userId) return;

    if (enabled) {
      // Request push notification permission via OneSignal
      try {
        const OneSignal = (window as any).OneSignal;
        if (OneSignal) {
          await OneSignal.showSlidedownPrompt();
          
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
        }
      } catch (error) {
        console.error('OneSignal error:', error);
        toast({
          title: "Kunne ikke aktivere varsler",
          description: "Vennligst prøv igjen senere",
          variant: "destructive"
        });
      }
    } else {
      // Disable notifications in database
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
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">Innstillinger</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Varsler</CardTitle>
            <CardDescription>
              Administrer hvordan du vil bli varslet om utløpende kvitteringer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="flex-1">
                <div className="font-medium">Push-varsler</div>
                <div className="text-sm text-muted-foreground">
                  Få varsler når noe snart utløper
                </div>
              </Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={handleNotificationToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="flex-1">
                <div className="font-medium">E-post påminnelser</div>
                <div className="text-sm text-muted-foreground">
                  Motta daglige oppsummeringer på e-post
                </div>
              </Label>
              <Switch
                id="email"
                checked={emailReminders}
                onCheckedChange={setEmailReminders}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
