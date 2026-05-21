import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export default function VerifySuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900 items-center justify-center px-8">
      <Logo size="large" />
      <View className="mt-8 bg-green-50 dark:bg-green-900/20 rounded-3xl p-6">
        <CheckCircle size={56} color="#10B981" />
      </View>
      <Text className="text-2xl font-bold text-foreground dark:text-slate-100 mt-6 text-center">
        E-post bekreftet!
      </Text>
      <Text className="text-muted-foreground dark:text-slate-400 text-center mt-3 leading-6">
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
