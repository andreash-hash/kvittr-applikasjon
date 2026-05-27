import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Shield, Bell, Gift } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from './ui/Button';

const slides = [
  {
    Icon: FileText,
    color: '#6366F1',
    title: 'Ta vare på kvitteringene dine',
    body: 'Skann kvitteringer med kamera og ha dem alltid tilgjengelig. Kvittr leser ut all informasjon automatisk.',
  },
  {
    Icon: Shield,
    color: '#0D9488',
    title: '2 og 5 års garanti',
    body: 'Kvittr beregner automatisk reklamasjonsretten din etter norsk lov — 2 år standard, 5 år for varige varer.',
  },
  {
    Icon: Bell,
    color: '#D97706',
    title: 'Varsler før fristen',
    body: 'Få push-varsler 7 og 3 dager før garantier, byttelapper og gavekort utløper. Aldri mer tapt garanti.',
  },
  {
    Icon: Gift,
    color: '#E05C7A',
    title: 'Gavekort og byttelapper',
    body: 'Hold styr på saldo, gyldighet og byttefrister for alle gavekort og byttelapper.',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];
  const { Icon, color } = slide;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <View className="flex-1 items-center justify-center px-8">
        <View
          style={{ backgroundColor: color + '20', borderRadius: 32 }}
          className="p-6 mb-6"
        >
          <Icon size={64} color={color} />
        </View>
        <Text className="text-2xl font-bold text-foreground dark:text-slate-100 text-center">
          {slide.title}
        </Text>
        <Text className="text-base text-muted-foreground dark:text-slate-400 text-center mt-3 leading-6">
          {slide.body}
        </Text>
      </View>

      <View className="flex-row justify-center mb-6 gap-2">
        {slides.map((_, i) => (
          <View
            key={i}
            style={{ backgroundColor: i === index ? '#6366F1' : '#E5E7EB' }}
            className={`h-2 rounded-full ${i === index ? 'w-6' : 'w-2'}`}
          />
        ))}
      </View>

      <View className="px-6 pb-8 gap-3">
        {isLast ? (
          <>
            <Button
              onPress={() => {
                onComplete();
                router.push('/(auth)/signup');
              }}
            >
              Registrer deg
            </Button>
            <Button variant="outline" onPress={onComplete}>
              Fortsett som gjest
            </Button>
          </>
        ) : (
          <>
            <Button onPress={() => setIndex((prev) => prev + 1)}>
              Neste
            </Button>
            <Button variant="ghost" onPress={onComplete}>
              Hopp over
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};
