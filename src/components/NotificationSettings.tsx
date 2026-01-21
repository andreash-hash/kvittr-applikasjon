import { Bell, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';

export const NotificationSettings = () => {
  const { isEnabled, isLoading, requestPermissions, disableNotifications, isNative } = useNativePushNotifications();

  console.log('NotificationSettings render:', { isEnabled, isLoading, isNative });

  // Web environment - show message
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
          <p className="text-sm text-muted-foreground">
            Push-varsler er kun tilgjengelig i den nedlastede appen fra App Store eller Google Play
          </p>
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
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-medium">
              {isEnabled ? 'Varsler aktivert' : 'Varsler deaktivert'}
            </div>
            <div className="text-sm text-muted-foreground">
              {isEnabled 
                ? 'Du mottar varsler 7 og 3 dager før utløp'
                : 'Aktiver for å motta varsler'
              }
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              console.log('=== Switch onCheckedChange called ===', { checked, isEnabled, isLoading });
              if (isLoading) {
                console.log('Switch blocked - isLoading is true');
                return;
              }
              if (checked) {
                console.log('Calling requestPermissions...');
                requestPermissions();
              } else {
                console.log('Calling disableNotifications...');
                disableNotifications();
              }
            }}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};
