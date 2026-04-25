import '../src/global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { initializeRevenueCat, syncSubscriptionStatus } from '@/lib/revenuecat';
import { useNotificationDeepLink, useForegroundNotifications } from '@/hooks/usePushNotifications';
import { isMobileApp } from '@/utils/platform';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function AppInit() {
  useNotificationDeepLink();
  useForegroundNotifications();

  useEffect(() => {
    const initRC = async () => {
      if (!isMobileApp()) return;
      const { data: { session } } = await supabase.auth.getSession();
      await initializeRevenueCat(session?.user?.id);
    };
    initRC();

    const handleAppResume = async () => {
      if (!isMobileApp()) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) await syncSubscriptionStatus(session.user.id);
    };

    // Supabase auth state changes trigger RevenueCat re-sync
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
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
