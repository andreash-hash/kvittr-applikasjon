import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (!projectId) {
    console.error('Missing EAS projectId in app.config.ts extra.eas.projectId');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kvittr varsler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('Failed to save expo_push_token:', error);
    throw error;
  }

  return token;
}

export async function disablePushNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', userId);
  if (error) throw error;
}

export async function hasExistingToken(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();
  return !!data?.expo_push_token;
}

// Root-level hook — mount once in _layout.tsx
export function useNotificationDeepLink(): void {
  const responseRef = useRef<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      responseRef.current = response;
      const receiptId = response.notification.request.content.data?.receipt_id as
        | string
        | undefined;
      if (receiptId) {
        router.push(`/(app)/item/${receiptId}`);
      }
    });
    return () => sub.remove();
  }, []);
}

// Foreground notification display hook
export function useForegroundNotifications(): void {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground notification received:', notification.request.identifier);
    });
    return () => sub.remove();
  }, []);
}
