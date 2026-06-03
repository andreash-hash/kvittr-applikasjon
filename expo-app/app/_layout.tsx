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
import { debugLog } from '@/lib/debugLog';

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

    // ── Shared state between auth listener and initRC ──────────────────────────

    // Guards against redundant Supabase writes when multiple triggers fire for
    // the same userId in quick succession (INITIAL_SESSION + launch sync, etc.).
    let lastSyncedUserId: string | null = null;

    // True once Purchases.configure() has been called. The auth listener checks
    // this before calling Purchases.logIn() to avoid "not configured" errors
    // when an auth event fires before initRC completes.
    let rcConfigured = false;

    // FIX B: If an auth event fires before RC is configured (i.e. before
    // initRC's awaits resolve), park the userId here. initRC consumes it as a
    // fallback when its own getSession() races with AsyncStorage and returns null.
    let pendingAuthUserId: string | null = null;

    // EmitterSubscription from addCustomerInfoUpdateListener — removed on unmount.
    let rcListenerSub: { remove: () => void } | null = null;

    // Shared helper: identify the RC SDK as userId, then sync entitlements to
    // Supabase. Skips the Supabase write if we already synced this userId this
    // session to avoid back-to-back identical writes.
    const ensureRCSync = async (userId: string, source: string): Promise<void> => {
      console.log(
        `### RC ${source}: ensureRCSync start userId=${userId} lastSynced=${lastSyncedUserId ?? 'null'}`
      );
      try {
        const Purchases = (await import('react-native-purchases')).default;
        await Purchases.logIn(userId);
        console.log(`### RC ${source}: logIn success userId=${userId}`);
      } catch (e: any) {
        // logIn is a no-op when already identified as this user — not an error.
        console.log(`### RC ${source}: logIn note userId=${userId} msg=${e?.message}`);
      }
      if (lastSyncedUserId === userId) {
        console.log(`### RC ${source}: skipping duplicate Supabase sync userId=${userId}`);
        return;
      }
      lastSyncedUserId = userId;
      await syncSubscriptionStatus(userId);
    };

    // ── FIX A + FIX B: Register auth listener FIRST ───────────────────────────
    //
    // Registered synchronously, before any async work, so no auth event can be
    // missed regardless of how long initRC takes to await getSession/configure.
    //
    // FIX A: Handle INITIAL_SESSION the same as SIGNED_IN. Supabase fires
    // INITIAL_SESSION (not SIGNED_IN) when recovering an existing session from
    // storage on app start. The previous code only matched SIGNED_IN, so
    // already-logged-in users never got RC identified or Supabase synced.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const userId = session?.user?.id ?? null;
      debugLog('rc: auth event', { event, userId: userId ?? 'null', rcConfigured });
      if (!isMobileApp()) return;

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && userId) {
        if (rcConfigured) {
          await ensureRCSync(userId, 'AUTH');
        } else {
          pendingAuthUserId = userId;
          debugLog('rc: auth queued', { event, userId, reason: 'RC not ready' });
        }
      } else if (event === 'SIGNED_OUT') {
        lastSyncedUserId = null;
        pendingAuthUserId = null;
        try {
          const Purchases = (await import('react-native-purchases')).default;
          debugLog('rc: logOut start', {});
          await Purchases.logOut();
          debugLog('rc: logOut done', {});
        } catch (e: any) {
          debugLog('rc: logOut failed', { message: e?.message });
        }
      }
    });

    // ── initRC — called AFTER auth listener is registered ─────────────────────
    //
    // FIX B: Uses pendingAuthUserId as fallback when getSession() races with
    // AsyncStorage and returns null. Auth listener already registered above so
    // any session event that fires during the awaits below is captured.
    const initRC = async () => {
      if (!isMobileApp()) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If getSession() lost the race and returned null, use the userId the auth
      // listener already captured from INITIAL_SESSION / SIGNED_IN.
      const userId = session?.user?.id ?? pendingAuthUserId ?? undefined;
      pendingAuthUserId = null;

      debugLog('rc: init start', { userId: userId ?? 'anonymous', ts: Date.now() });
      const ok = await initializeRevenueCat(userId);
      debugLog('rc: init done', { ok, userId: userId ?? 'anonymous', ts: Date.now() });

      if (!ok) {
        debugLog('rc: init failed — aborting', {});
        return;
      }

      rcConfigured = true;

      if (userId) {
        debugLog('rc: launch sync start', { userId });
        await ensureRCSync(userId, 'INIT');
        debugLog('rc: launch sync done', { userId });
      } else {
        debugLog('rc: no userId at init — skipping launch sync', {});
      }

      const Purchases = (await import('react-native-purchases')).default;
      debugLog('rc: registering customerInfoUpdateListener', {});
      rcListenerSub = Purchases.addCustomerInfoUpdateListener(async (_updatedInfo) => {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        const uid = s?.user?.id;
        debugLog('rc: customerInfo update', { uid: uid ?? 'null', ts: Date.now() });
        if (uid) {
          await syncSubscriptionStatus(uid);
        } else {
          debugLog('rc: listener skipped — no session', {});
        }
      });
    };

    initRC();

    return () => {
      subscription.unsubscribe();
      if (rcListenerSub) {
        console.log('### RC INIT: removing customerInfoUpdateListener');
        rcListenerSub.remove();
      }
    };
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
