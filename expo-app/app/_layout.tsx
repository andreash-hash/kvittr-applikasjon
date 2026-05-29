import '../src/global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, InfoToast, BaseToastProps } from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import { initializeRevenueCat, syncSubscriptionStatus } from '@/lib/revenuecat';
import { useNotificationDeepLink, useForegroundNotifications, setupAndroidNotificationChannel } from '@/hooks/usePushNotifications';
import { isMobileApp } from '@/utils/platform';
import { initTheme } from '@/lib/themeStore';

// Keep native splash (solid dark background, no image) visible until
// our JS animated logo takes over in index.tsx.
SplashScreen.preventAutoHideAsync();

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#EF4444' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: '#6366F1' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function AppInit() {
  useNotificationDeepLink();
  useForegroundNotifications();

  useEffect(() => {
    initTheme().catch(() => null);
    setupAndroidNotificationChannel().catch(() => null);

    const initRC = async () => {
      if (!isMobileApp()) return;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      console.log(`### RC INIT: start userId=${userId ?? 'anonymous'} ts=${Date.now()}`);
      const ok = await initializeRevenueCat(userId);
      console.log(`### RC INIT: done ok=${ok} userId=${userId ?? 'anonymous'} ts=${Date.now()}`);
    };
    initRC();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const userId = session?.user?.id ?? null;
      console.log(`### RC AUTH: event=${event} userId=${userId ?? 'null'}`);
      if (!isMobileApp()) return;

      if (event === 'SIGNED_IN' && userId) {
        // FIX: logIn BEFORE syncSubscriptionStatus so RC identity is correct
        try {
          const Purchases = (await import('react-native-purchases')).default;
          console.log(`### RC AUTH: logIn userId=${userId}`);
          await Purchases.logIn(userId);
          console.log(`### RC AUTH: logIn success`);
        } catch (e: any) {
          console.log('### RC AUTH: logIn failed', JSON.stringify(e), e?.message);
        }
        await syncSubscriptionStatus(userId);
      } else if (event === 'SIGNED_OUT') {
        // FIX: logOut so RC returns to anonymous — no stale identity left behind
        try {
          const Purchases = (await import('react-native-purchases')).default;
          console.log('### RC AUTH: logOut');
          await Purchases.logOut();
          console.log('### RC AUTH: logOut success');
        } catch (e: any) {
          console.log('### RC AUTH: logOut failed', JSON.stringify(e), e?.message);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppInit />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="success" />
            <Stack.Screen name="verify-success" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <Toast topOffset={60} config={toastConfig} />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
