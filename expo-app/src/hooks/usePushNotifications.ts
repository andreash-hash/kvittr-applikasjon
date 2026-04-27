import { useEffect, useRef } from 'react';
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

// Call once on app start (Android only) so the channel exists even before
// the user grants notification permissions.
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Kvittr varsler',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366F1',
  });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Set up Android channel before requesting permissions.
  await setupAndroidNotificationChannel();

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

  // projectId resolves to '9a9f44ff-d636-4619-a7aa-a04072918a34' from app.config.ts
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

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

function routeToReceipt(receiptId: string | undefined) {
  if (receiptId) router.push(`/(app)/item/${receiptId}`);
}

// Root-level hook — mount once in _layout.tsx.
// Handles three notification tap scenarios:
//   1. App foregrounded/backgrounded — addNotificationResponseReceivedListener
//   2. App killed and relaunched from tap — getLastNotificationResponseAsync
export function useNotificationDeepLink(): void {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    // Scenario 2: app was killed; relaunched via notification tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return; // already handled
      handled.current = id;
      const receiptId = response.notification.request.content.data?.receipt_id as
        | string
        | undefined;
      routeToReceipt(receiptId);
    });

    // Scenario 1: app already running (foreground or background).
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (handled.current === id) return; // guard against double-fire
      handled.current = id;
      const receiptId = response.notification.request.content.data?.receipt_id as
        | string
        | undefined;
      routeToReceipt(receiptId);
    });

    return () => sub.remove();
  }, []);
}

// Foreground notification display hook — mount once in _layout.tsx.
export function useForegroundNotifications(): void {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground notification received:', notification.request.identifier);
    });
    return () => sub.remove();
  }, []);
}
