import React, { useEffect, useState, useRef } from 'react';
import { View, Animated } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Logo } from '@/components/Logo';
import { Onboarding } from '@/components/Onboarding';
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

    // Auth + onboarding check
    const authPromise: Promise<'dashboard' | 'onboarding'> = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!cancelled) setUserId(uid);

      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', uid)
          .single();

        if (profile?.onboarding_completed === false) return 'onboarding';
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        return 'dashboard';
      }

      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      return done ? 'dashboard' : 'onboarding';
    })();

    // Wait for both: minimum display time AND auth result
    Promise.all([minTimePromise, authPromise]).then(([, destination]) => {
      if (cancelled) return;

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        if (destination === 'onboarding') {
          setShowOnboarding(true);
        } else {
          router.replace('/(app)/dashboard');
        }
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    if (userId) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
    }
    setShowOnboarding(false);
    router.replace('/(app)/dashboard');
  };

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
