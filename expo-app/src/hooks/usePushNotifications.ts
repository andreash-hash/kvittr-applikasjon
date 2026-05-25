import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
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

function routeToReceipt(receiptId: string) {
  router.push(`/(app)/item/${receiptId}`);
}

// Root-level hook — mount once in _layout.tsx.
// Handles three notification tap scenarios:
//   1. Warm-start (app foregrounded/backgrounded) — addNotificationResponseReceivedListener fires immediately
//   2. Cold-start (app killed, relaunched from tap) — getLastNotificationResponseAsync returns the tapped
//      notification, but we must buffer the receipt ID and only navigate once Expo Router has mounted its
//      navigation stack (detected via useRootNavigationState().key becoming non-null).
export function useNotificationDeepLink(): void {
  const handled = useRef<string | null>(null);
  // Buffer for cold-start: store receipt ID until the router is ready to navigate.
  const pendingReceiptId = useRef<string | null>(null);

  const navState = useRootNavigationState();

  // Effect 1: register both notification response sources once on mount.
  useEffect(() => {
    // Scenario 2 — cold-start: app was killed and relaunched by tapping a notification.
    // Router is not ready yet at this point, so we buffer the receiptId.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const receiptId = response.notification.request.content.data?.receipt_id as
        | string
        | undefined;
      if (receiptId) {
        // If the router is already ready (e.g. hot reload) navigate immediately;
        // otherwise buffer until Effect 2 fires with a valid navState.key.
        if (navState?.key) {
          routeToReceipt(receiptId);
        } else {
          pendingReceiptId.current = receiptId;
        }
      }
    });

    // Scenario 1 — warm-start: app already running in foreground or background.
    // Router is ready, navigate directly.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const receiptId = response.notification.request.content.data?.receipt_id as
        | string
        | undefined;
      if (receiptId) routeToReceipt(receiptId);
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: fires every time navState.key changes (i.e. when the router initialises).
  // If a cold-start receipt ID is buffered, navigate now that the stack is ready.
  useEffect(() => {
    if (navState?.key && pendingReceiptId.current) {
      routeToReceipt(pendingReceiptId.current);
      pendingReceiptId.current = null;
    }
  }, [navState?.key]);
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
