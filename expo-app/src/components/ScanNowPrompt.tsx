import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'lucide-react-native';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

interface ScanNowPromptProps {
  onScanNow: () => void;
  onLater: () => void;
}

/**
 * First screen a new user sees. One question, one action: the fastest way to
 * show what Kvittr does is to let the person try it on a receipt they are
 * holding right now.
 */
export function ScanNowPrompt({ onScanNow, onLater }: ScanNowPromptProps) {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <View className="flex-1 px-6 pt-10 pb-8 justify-between">
        <View className="items-center">
          <Logo size="large" />
        </View>

        <View className="items-center">
          <View className="bg-primary/10 rounded-3xl p-6 mb-8">
            <Camera size={56} color="#6366F1" />
          </View>
          <Text className="text-3xl font-bold text-foreground dark:text-slate-100 text-center">
            Har du en kvittering å skanne nå?
          </Text>
          <Text className="text-muted-foreground dark:text-slate-400 text-center mt-4 text-base leading-6">
            Se garantien din på sekunder. Du trenger ingen konto for å prøve.
          </Text>
        </View>

        <View className="gap-3">
          <Button size="lg" onPress={onScanNow} accessibilityLabel="Skann nå">
            Skann nå
          </Button>
          <Button variant="ghost" onPress={onLater} accessibilityLabel="Senere">
            Senere
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
