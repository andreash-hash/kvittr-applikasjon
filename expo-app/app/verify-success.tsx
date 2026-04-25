import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export default function VerifySuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Logo size="large" />
      <Text style={{ fontSize: 80, marginTop: 32 }}>✅</Text>
      <Text className="text-2xl font-bold text-foreground mt-6 text-center">
        E-post bekreftet!
      </Text>
      <Text className="text-muted-foreground text-center mt-3 leading-6">
        Kontoen din er nå aktivert. Logg inn for å komme i gang med Kvittr.
      </Text>
      <Button
        onPress={() => router.replace('/(auth)/login')}
        className="mt-10 w-full"
      >
        Logg inn
      </Button>
    </SafeAreaView>
  );
}
