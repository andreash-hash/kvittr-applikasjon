import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '@/components/Logo';
import { Onboarding } from '@/components/Onboarding';
import { supabase } from '@/lib/supabase';

const ONBOARDING_KEY = 'kvittr_onboarding_completed';

export default function IndexScreen() {
  const [checking, setChecking] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        // Authenticated user: DB flag is the source of truth.
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', uid)
          .single();

        if (profile?.onboarding_completed === false) {
          setShowOnboarding(true);
          setChecking(false);
          return;
        }
        // Completed in DB — ensure AsyncStorage matches and go to dashboard.
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        router.replace('/(app)/dashboard');
        return;
      }

      // Guest user: AsyncStorage is the source of truth.
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        setShowOnboarding(true);
        setChecking(false);
        return;
      }
      router.replace('/(app)/dashboard');
    })();
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

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-background gap-4">
        <Logo size="medium" />
        <ActivityIndicator color="#6366F1" />
      </View>
    );
  }

  return null;
}
