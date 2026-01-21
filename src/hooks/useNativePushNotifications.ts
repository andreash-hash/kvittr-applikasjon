import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

console.log('=== useNativePushNotifications module loading ===');

export const useNativePushNotifications = () => {
  const [isEnabled, setIsEnabled] = useState(false);
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

  // Check if user already has FCM token (notifications enabled)
  useEffect(() => {
    const checkExistingToken = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', user.id)
          .single();

        if (profile?.fcm_token) {
          setIsEnabled(true);
        }
      } catch (error) {
        console.log('Error checking existing token:', error);
      }
    };
    checkExistingToken();
  }, []);

  // Save FCM token to profiles.fcm_token
  const saveFcmToken = useCallback(async (token: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to save FCM token:', error);
      throw error;
    }

    console.log('FCM token saved successfully to profiles table');
    setIsEnabled(true);
  }, []);

  const requestPermissions = useCallback(async () => {
    console.log('=== requestPermissions FUNCTION CALLED ===');
    
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
      
      // Remove ALL existing listeners first to avoid conflicts
      await PushNotifications.removeAllListeners();
      console.log('Removed all existing listeners');
      
      // Set up one-time listener for registration before calling register
      let resolveToken: (token: string) => void;
      let rejectToken: (error: any) => void;

      const tokenPromise = new Promise<string>((resolve, reject) => {
        resolveToken = resolve;
        rejectToken = reject;
      });

      // Increase timeout to 30 seconds for slower networks
      const timeout = setTimeout(() => {
        console.error('Token timeout after 30 seconds');
        rejectToken(new Error('Token timeout - vennligst prøv igjen'));
      }, 30000);

      const registrationHandle = await PushNotifications.addListener('registration', (token) => {
        clearTimeout(timeout);
        console.log('Push registration success, token:', token.value);
        resolveToken(token.value);
      });

      const errorHandle = await PushNotifications.addListener('registrationError', (error) => {
        clearTimeout(timeout);
        console.error('Push registration error event:', error);
        rejectToken(new Error(error?.error || 'Registreringsfeil'));
      });

      // Register with FCM/APNs
      console.log('Calling PushNotifications.register()...');
      await PushNotifications.register();
      console.log('Register called, waiting for token...');

      // Wait for token
      const token = await tokenPromise;
      console.log('Got FCM token:', token);

      // Cleanup one-time listeners
      await registrationHandle.remove();
      await errorHandle.remove();

      // Optimistic UI: switch can show enabled while saving
      setIsEnabled(true);

      // Save token to database
      await saveFcmToken(token);

      toast({
        title: "Varsler aktivert",
        description: "Du vil motta varsler om utgående garantier og gavekort",
      });
    } catch (error: any) {
      console.error('Push registration error:', error);
      setIsEnabled(false);

      const msg =
        typeof error?.message === 'string'
          ? error.message
          : 'Kunne ikke aktivere varsler';

      toast({
        title: "Feil",
        description:
          msg.includes('denied') || msg.toLowerCase().includes('permission')
            ? 'Varsler er deaktivert i iOS. Gå til Innstillinger → Varsler → Kvittr og slå på.'
            : msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, saveFcmToken]);

  const disableNotifications = useCallback(async () => {
    console.log('=== disableNotifications FUNCTION CALLED ===');
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      // Remove FCM token from database
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setIsEnabled(false);
      toast({
        title: "Varsler deaktivert",
        description: "Du vil ikke lenger motta push-varsler",
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke deaktivere varsler",
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
  }, [isNative, toast, saveFcmToken]);

  return { isEnabled, isLoading, requestPermissions, disableNotifications, isNative };
};
