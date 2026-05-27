import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

const ONBOARDING_KEY = 'kvittr_onboarding_completed';
const FADE_IN_MS  = 700;
const HOLD_MS     = 1200;
const FADE_OUT_MS = 600;

export default function IndexScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    SplashScreen.hideAsync();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start();

    const minTimePromise = new Promise<void>(resolve =>
      setTimeout(resolve, FADE_IN_MS + HOLD_MS),
    );

    const authPromise: Promise<'dashboard' | 'onboarding'> = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;

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

    Promise.all([minTimePromise, authPromise]).then(([, destination]) => {
      if (cancelled) return;

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        if (destination === 'onboarding') {
          router.replace('/(app)/onboarding');
        } else {
          router.replace('/(app)/dashboard');
        }
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-slate-900">
      <Animated.View style={{ opacity: fadeAnim }}>
        <Logo size="splash" />
      </Animated.View>
    </View>
  );
}
