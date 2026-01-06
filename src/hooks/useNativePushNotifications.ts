import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

console.log('=== useNativePushNotifications module loading ===');

export const useNativePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const { toast } = useToast();

  // Check if native platform
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const native = Capacitor.isNativePlatform();
        console.log('Platform check:', { native, platform: Capacitor.getPlatform() });
        setIsNative(native);
      } catch (err) {
        console.log('Platform check error (expected in web):', err);
        setIsNative(false);
      }
    };
    checkPlatform();
  }, []);

  // Save FCM token to profiles.fcm_token
  const saveFcmToken = useCallback(async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in, cannot save FCM token');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to save FCM token:', updateError);
        throw new Error('Kunne ikke lagre push token');
      }
      
      console.log('FCM token saved successfully to profiles table');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }, []);

  const registerPush = useCallback(async () => {
    console.log('=== registerPush FUNCTION CALLED ===');
    
    // Check platform directly instead of relying on state
    let nativePlatform = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      nativePlatform = Capacitor.isNativePlatform();
      console.log('Direct platform check:', { nativePlatform, platform: Capacitor.getPlatform() });
    } catch (err) {
      console.log('Platform check failed:', err);
    }
    
    if (!nativePlatform) {
      console.log('Exiting - not native platform');
      toast({
        title: "Ikke mobil",
        description: "Push-varsler fungerer kun på mobil-appen",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log('Permission status:', permStatus);
      
      // Request permission if needed
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('Permission after request:', permStatus);
      }
      
      if (permStatus.receive !== 'granted') {
        toast({
          title: "Tillatelse nektet",
          description: "Du må aktivere varsler i innstillingene",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Register with FCM/APNs
      await PushNotifications.register();
      setIsRegistered(true);
      
      toast({
        title: "Varsler aktivert",
        description: "Du vil motta varsler om utgående garantier og gavekort",
      });
    } catch (error) {
      console.error('Push registration error:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke aktivere varsler",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isNative) return;

    let registrationListener: any;
    let errorListener: any;
    let receivedListener: any;
    let actionListener: any;

    const setupListeners = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Listen for successful registration
        registrationListener = await PushNotifications.addListener(
          'registration',
          async (token) => {
            console.log('Push registration success, token:', token.value);
            await saveFcmToken(token.value);
          }
        );

        // Listen for registration errors
        errorListener = await PushNotifications.addListener(
          'registrationError',
          (error) => {
            console.error('Push registration error:', error);
          }
        );

        // Listen for push notifications received while app is in foreground
        receivedListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('Push notification received:', notification);
            toast({
              title: notification.title || 'Kvittr',
              description: notification.body || '',
            });
          }
        );

        // Listen for push notification tapped (app opened from notification)
        actionListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification) => {
            console.log('Push notification action performed:', notification);
            // Handle navigation based on notification data
            const data = notification.notification.data;
            if (data?.receipt_id) {
              window.location.href = `/item/${data.receipt_id}`;
            }
          }
        );

        // Auto-register on app start
        registerPush();
      } catch (error) {
        console.error('Error setting up push listeners:', error);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      registrationListener?.remove?.();
      errorListener?.remove?.();
      receivedListener?.remove?.();
      actionListener?.remove?.();
    };
  }, [isNative, toast, saveFcmToken, registerPush]);

  return { isRegistered, isLoading, registerPush, isNative };
};
