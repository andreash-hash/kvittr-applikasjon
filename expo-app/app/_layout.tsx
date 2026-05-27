import '../src/global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, InfoToast, BaseToastProps } from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { initializeRevenueCat, syncSubscriptionStatus } from '@/lib/revenuecat';
import { useNotificationDeepLink, useForegroundNotifications, setupAndroidNotificationChannel } from '@/hooks/usePushNotifications';
import { isMobileApp } from '@/utils/platform';
import { initTheme } from '@/lib/themeStore';

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
    // Apply persisted theme preference before anything renders.
    initTheme().catch(() => null);

    setupAndroidNotificationChannel().catch(() => null);

    const initRC = async () => {
      if (!isMobileApp()) return;
      const { data: { session } } = await supabase.auth.getSession();
      await initializeRevenueCat(session?.user?.id);
    };
    initRC();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id && isMobileApp()) {
        await syncSubscriptionStatus(session.user.id);
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
