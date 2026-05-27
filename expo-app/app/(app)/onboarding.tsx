import React from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Onboarding } from '@/components/Onboarding';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const ONBOARDING_KEY = 'kvittr_onboarding_completed';

export default function OnboardingScreen() {
  const { user } = useAuth();

  const handleComplete = async (action: 'register' | 'guest' | 'skip') => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }

    if (action === 'register') {
      router.replace('/(auth)/signup');
    } else {
      router.replace('/(app)/dashboard');
    }
  };

  return <Onboarding onComplete={handleComplete} />;
}
