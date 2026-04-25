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

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        setShowOnboarding(true);
        setChecking(false);
        return;
      }
      // Onboarding done — always go to dashboard (guest or authenticated)
      router.replace('/(app)/dashboard');
    })();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
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
