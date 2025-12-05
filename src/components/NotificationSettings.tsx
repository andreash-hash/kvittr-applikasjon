import { Bell, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const NotificationSettings = () => {
  const { isRegistered, isLoading, registerPush, isNative } = useNativePushNotifications();
  const { toast } = useToast();

  console.log('NotificationSettings render:', { isRegistered, isLoading, isNative });

  const handleClick = async () => {
    console.log('=== BUTTON CLICKED ===');
    console.log('isNative:', isNative);
    console.log('isLoading:', isLoading);
    console.log('isRegistered:', isRegistered);
    console.log('registerPush function:', typeof registerPush);

    try {
      await registerPush();
      console.log('registerPush completed');
    } catch (error) {
      console.error('registerPush error:', error);
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : 'Ukjent feil',
        variant: "destructive"
      });
    }
  };

  // Web environment - show test mode and message
  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Varsler
          </CardTitle>
          <CardDescription>
            Push-varsler er kun tilgjengelig i iOS/Android-appen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* DEBUG: Test mode for web */}
          <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-semibold">🧪 Test Mode (Web)</p>
            <p className="text-xs text-muted-foreground">
              Simulerer iOS push registration for å teste logikk
            </p>
            <Button 
              onClick={async () => {
                console.log('=== TEST MODE: Simulating iOS push registration ===');
                
                try {
                  // Generate fake FCM token
                  const fakeToken = `test_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  console.log('Fake FCM token:', fakeToken);
                  
                  // Get current user
                  const { data: { user }, error: userError } = await supabase.auth.getUser();
                  if (userError) throw userError;
                  if (!user) throw new Error('No user logged in');
                  
                  console.log('User ID:', user.id);
                  
                  // Try to save to profiles.fcm_token
                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ fcm_token: fakeToken })
                    .eq('id', user.id);
                  
                  if (updateError) {
                    console.error('UPDATE ERROR:', updateError);
                    throw updateError;
                  }
                  
                  console.log('✅ SUCCESS: Token saved to profiles.fcm_token');
                  
                  // Verify it was saved
                  const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('fcm_token')
                    .eq('id', user.id)
                    .single();
                  
                  if (fetchError) throw fetchError;
                  
                  console.log('✅ VERIFIED: Token in database:', profile.fcm_token);
                  
                  toast({
                    title: "✅ Test vellykket!",
                    description: `Token lagret: ${fakeToken.substring(0, 20)}...`,
                  });
                  
                  // Test Edge Function
                  console.log('Testing Edge Function...');
                  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-notification', {
                    body: {
                      user_id: user.id,
                      title: '🧪 Test fra web',
                      message: 'Hvis Edge Function fungerer, er alt klart for iOS!',
                      receipt_id: null
                    }
                  });
                  
                  if (edgeError) {
                    console.error('Edge Function error:', edgeError);
                    toast({
                      title: "⚠️ Edge Function feilet",
                      description: edgeError.message,
                      variant: "destructive"
                    });
                  } else {
                    console.log('✅ Edge Function response:', edgeData);
                    toast({
                      title: "✅ Edge Function OK!",
                      description: "Alt er klart for iOS",
                    });
                  }
                  
                } catch (error) {
                  console.error('❌ TEST FAILED:', error);
                  toast({
                    title: "❌ Test feilet",
                    description: error instanceof Error ? error.message : 'Ukjent feil',
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="w-full"
              type="button"
            >
              🧪 Test Push Logic (Simulate iOS)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
      <CardContent className="space-y-4">
        {isRegistered ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Bell className="h-4 w-4" />
            Varsler er aktivert på denne enheten
          </div>
        ) : (
          <Button 
            onClick={handleClick}
            disabled={isLoading}
            className="w-full"
            type="button"
          >
            {isLoading ? 'Aktiverer...' : 'Aktiver varsler'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
