import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Text style={{ fontSize: 80 }}>🔍</Text>
      <Text className="text-2xl font-bold text-foreground mt-6 text-center">
        Siden finnes ikke
      </Text>
      <Text className="text-muted-foreground text-center mt-3">
        Beklager, vi fant ikke siden du lette etter.
      </Text>
      <Button
        onPress={() => router.replace('/(app)/dashboard')}
        className="mt-8 w-full"
      >
        Tilbake til hjem
      </Button>
    </SafeAreaView>
  );
}
