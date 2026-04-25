import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './ui/Button';

const { width } = Dimensions.get('window');

const slides = [
  {
    emoji: '🧾',
    title: 'Ta vare på kvitteringene dine',
    body: 'Skann kvitteringer med kamera og ha dem alltid tilgjengelig. Kvittr leser ut all informasjon automatisk.',
  },
  {
    emoji: '🛡️',
    title: '2 og 5 års garanti',
    body: 'Kvittr beregner automatisk reklamasjonsretten din etter norsk lov — 2 år standard, 5 år for varige varer.',
  },
  {
    emoji: '🔔',
    title: 'Varsler før fristen',
    body: 'Få push-varsler 7 og 3 dager før garantier, byttelapper og gavekort utløper. Aldri mer tapt garanti.',
  },
  {
    emoji: '🎁',
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <Text style={{ fontSize: 80 }}>{slide.emoji}</Text>
        <Text className="text-2xl font-bold text-foreground text-center mt-6">{slide.title}</Text>
        <Text className="text-base text-muted-foreground text-center mt-3 leading-6">{slide.body}</Text>
      </View>

      {/* Dots */}
      <View className="flex-row justify-center mb-6 gap-2">
        {slides.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === index ? 'w-6 bg-primary' : 'w-2 bg-muted'}`}
          />
        ))}
      </View>

      <View className="px-6 pb-8 gap-3">
        <Button
          onPress={() => {
            if (isLast) {
              onComplete();
            } else {
              setIndex((prev) => prev + 1);
            }
          }}
        >
          {isLast ? 'Kom i gang' : 'Neste'}
        </Button>
        {!isLast && (
          <Button variant="ghost" onPress={onComplete}>
            Hopp over
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};
