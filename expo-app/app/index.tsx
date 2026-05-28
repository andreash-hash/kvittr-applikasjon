import React, { useEffect, useState, useRef } from 'react';
import { View, Animated } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Logo } from '@/components/Logo';
import { Onboarding, type OnboardingAction } from '@/components/Onboarding';
import { supabase } from '@/lib/supabase';

const ONBOARDING_KEY = 'kvittr_onboarding_completed';
const FADE_IN_MS  = 700;
const HOLD_MS     = 1200;
const FADE_OUT_MS = 600;

export default function IndexScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // Hide native splash (solid dark bg, no image) and start our
    // JS fade-in simultaneously — seamless handoff.
    SplashScreen.hideAsync();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start();

    // Minimum display time: fade-in + hold
    const minTimePromise = new Promise<void>(resolve =>
      setTimeout(resolve, FADE_IN_MS + HOLD_MS),
    );

    // Auth + onboarding check — always runs unconditionally before any routing
    const authPromise: Promise<'dashboard' | 'onboarding'> = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      if (uid) {
        // Logged-in user: check if they completed onboarding in their profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', uid)
          .single();

        if (profile?.onboarding_completed === false) return 'onboarding';
        // Already completed — mark locally too and go straight to dashboard
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        return 'dashboard';
      }

      // Guest: check local flag
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      return done ? 'dashboard' : 'onboarding';
    })();

    // Wait for both: minimum display time AND auth result.
    // Auth/session/guest-storage state is fully resolved here before we route.
    Promise.all([minTimePromise, authPromise]).then(([, destination]) => {
      if (cancelled) return;

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        if (destination === 'onboarding') {
          // Show onboarding only after full init. Dashboard always arrives
          // with auth/session state already resolved via supabase.auth.getSession().
          setShowOnboarding(true);
        } else {
          router.replace('/(app)/dashboard');
        }
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnboardingComplete = async (action: OnboardingAction) => {
    // Mark onboarding seen so we skip it on future cold starts
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

    if (userId) {
      // Logged-in user who hadn't completed onboarding yet (rare path)
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      setShowOnboarding(false);
      router.replace('/(app)/dashboard');
      return;
    }

    // Guest paths
    setShowOnboarding(false);
    if (action === 'register') {
      router.push('/(auth)/signup');
    } else {
      // 'guest' or 'skip' — go straight to dashboard as unauthenticated guest
      router.replace('/(app)/dashboard');
    }
  };

  // Onboarding is rendered AFTER init resolves — not as an early return.
  // Auth/session state is already settled when showOnboarding becomes true.
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-slate-900">
      <Animated.View style={{ opacity: fadeAnim }}>
        <Logo size="splash" />
      </Animated.View>
    </View>
  );
}
