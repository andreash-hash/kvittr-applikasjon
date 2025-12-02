import { Bell, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';

export const NotificationSettings = () => {
  const { isRegistered, isLoading, registerPush, isNative } = useNativePushNotifications();

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
      <CardContent>
        {isRegistered ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Bell className="h-4 w-4" />
            Varsler er aktivert på denne enheten
          </div>
        ) : (
          <Button 
            onClick={registerPush} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Aktiverer...' : 'Aktiver varsler'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
