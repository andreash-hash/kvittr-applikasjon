import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export default function SuccessScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(app)/dashboard');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Logo size="large" />
      <Text style={{ fontSize: 80, marginTop: 32 }}>🎉</Text>
      <Text className="text-2xl font-bold text-foreground mt-6 text-center">
        Betalingen er bekreftet!
      </Text>
      <Text className="text-muted-foreground text-center mt-3 leading-6">
        Velkommen til Kvittr Premium. Du har nå tilgang til alle funksjoner.
      </Text>
      <Button
        onPress={() => router.replace('/(app)/dashboard')}
        className="mt-10 w-full"
      >
        Kom i gang
      </Button>
    </SafeAreaView>
  );
}
