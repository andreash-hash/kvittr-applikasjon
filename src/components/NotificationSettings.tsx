import { Bell, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { useToast } from '@/hooks/use-toast';

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

    toast({
      title: "Debug",
      description: `Native: ${isNative}, Loading: ${isLoading}`,
    });

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

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Varsler
          </CardTitle>
          <CardDescription>
            Åpne appen på mobil for å aktivere varsler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Platform: web (varsler kun på mobil)
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
          <>
            <Button 
              onClick={handleClick}
              disabled={isLoading}
              className="w-full"
              type="button"
            >
              {isLoading ? 'Aktiverer...' : 'Aktiver varsler'}
            </Button>
            <div className="text-xs text-muted-foreground">
              Debug: Loading={String(isLoading)}, Registered={String(isRegistered)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
