import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crop, Sun, Sparkles, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { markScanWalkthroughSeen } from '@/lib/scanWalkthroughState';

const STEPS = [
  {
    Icon: Crop,
    title: 'Få med hele kvitteringen',
    body: 'Legg den på et flatt underlag og hold mobilen rett over. Alle fire hjørnene må være innenfor bildet.',
  },
  {
    Icon: Sun,
    title: 'Sørg for lys',
    body: 'Unngå skygge fra din egen hånd. Dagslys eller en lampe rett over gir best resultat.',
  },
  {
    Icon: Sparkles,
    title: 'Resten ordner appen',
    body: 'Kvittr leser butikk, beløp, dato og garantitid selv – du trenger ikke skrive noe.',
  },
];

interface ScanWalkthroughProps {
  visible: boolean;
  /** Fired when the user is ready to shoot; should open the camera. */
  onStart: () => void;
  onDismiss: () => void;
}

/**
 * First-run coaching for the scan screen. The first scan happens before the
 * user has an account, so this is the only chance to explain the one action
 * the whole product depends on.
 */
export function ScanWalkthrough({ visible, onStart, onDismiss }: ScanWalkthroughProps) {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const { Icon, title, body } = STEPS[step];

  const handleNext = async () => {
    if (isLastStep) {
      await markScanWalkthroughSeen();
      setStep(0);
      onStart();
      return;
    }
    setStep(step + 1);
  };

  const handleSkip = async () => {
    await markScanWalkthroughSeen();
    setStep(0);
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={handleSkip}>
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
        <View className="flex-row justify-end px-5 py-3">
          <TouchableOpacity
            onPress={handleSkip}
            accessibilityLabel="Lukk veiledning"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-primary/10 rounded-full p-7 mb-8">
            <Icon size={48} color="#6366F1" />
          </View>

          <Text className="text-2xl font-bold text-foreground dark:text-slate-100 text-center">
            {title}
          </Text>
          <Text className="text-muted-foreground dark:text-slate-400 text-center mt-3 leading-6">
            {body}
          </Text>

          <View className="flex-row gap-2 mt-10">
            {STEPS.map((s, i) => (
              <TouchableOpacity
                key={s.title}
                onPress={() => setStep(i)}
                accessibilityLabel={`Steg ${i + 1} av ${STEPS.length}`}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                className={`h-2 rounded-full ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </View>
        </View>

        <View className="px-6 pb-8 gap-3">
          <Button onPress={handleNext} size="lg">
            {isLastStep ? 'Ta bilde' : 'Neste'}
          </Button>
          {!isLastStep && (
            <Button variant="ghost" onPress={handleSkip}>
              Hopp over
            </Button>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
