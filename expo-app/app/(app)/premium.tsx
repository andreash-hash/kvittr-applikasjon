import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Check,
  Camera,
  Bell,
  Cloud,
  Shield,
  BarChart3,
  Crown,
  CheckCircle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '@/components/ui/Button';
import { showPaywallUI, handleRevenueCatError, syncSubscriptionStatus } from '@/lib/revenuecat';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAuth } from '@/hooks/useAuth';
import { debugLog } from '@/lib/debugLog';

const FEATURES = [
  { Icon: Camera, title: 'Ubegrenset skanning', body: 'Skann så mange kvitteringer du vil.' },
  { Icon: Bell, title: 'Push-varsler', body: 'Få beskjed 7 og 3 dager før frister.' },
  { Icon: Cloud, title: 'Sky-synkronisering', body: 'Kvitteringene dine på alle enheter.' },
  { Icon: Shield, title: 'Garantikalkulator', body: 'Automatisk 2- og 5-årsberegning.' },
  { Icon: BarChart3, title: 'Statistikk', body: 'Oversikt over kjøp og utgifter.' },
];

export default function PremiumScreen() {
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      Toast.show({
        type: 'info',
        text1: 'Logg inn først',
        text2: 'Du må ha en konto for å abonnere på Premium.',
      });
      router.push('/(auth)/login');
      return;
    }

    setLoading(true);
    try {
      debugLog('rc: paywall start', { userId: user?.id ?? 'null', isAuthenticated });
      const result = await showPaywallUI();
      debugLog('rc: paywall result', { result: JSON.stringify(result) });

      try {
        const { PAYWALL_RESULT } = await import('react-native-purchases-ui');
        const purchased = result === PAYWALL_RESULT.PURCHASED;
        const restored = result === PAYWALL_RESULT.RESTORED;
        const cancelled = result === PAYWALL_RESULT.CANCELLED;
        const notPresented = result === PAYWALL_RESULT.NOT_PRESENTED;
        debugLog('rc: paywall result check', {
          purchased,
          restored,
          cancelled,
          notPresented,
          rawResult: JSON.stringify(result),
          userId: user?.id ?? 'null',
        });
        if ((purchased || restored) && user?.id) {
          debugLog('rc: sync start', { userId: user.id, trigger: purchased ? 'purchased' : 'restored' });
          await syncSubscriptionStatus(user.id);
          debugLog('rc: sync done', { userId: user.id });
        } else {
          debugLog('rc: sync skipped', { purchased, restored, hasUserId: !!user?.id });
        }
      } catch (syncErr: any) {
        debugLog('rc: sync FAILED', { message: syncErr?.message, full: JSON.stringify(syncErr) });
      }
    } catch (err: any) {
      const errDetail = {
        code: err?.code,
        message: err?.message,
        underlying: err?.underlyingErrorMessage,
        userCancelled: err?.userCancelled,
        full: JSON.stringify(err),
      };
      debugLog('rc: paywall ERROR', errDetail);
      const msg = handleRevenueCatError(err);
      if (msg !== 'cancelled') {
        Toast.show({ type: 'error', text1: 'Noe gikk galt', text2: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border dark:border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft size={20} color="#6366F1" />
          <Text className="text-primary text-base">Tilbake</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View className="items-center pt-10 pb-6 px-6">
          <View className="bg-primary/10 rounded-3xl p-5 mb-4">
            <Crown size={52} color="#6366F1" />
          </View>
          <Text className="text-3xl font-bold text-foreground dark:text-slate-100 mt-2 text-center">
            Kvittr Premium
          </Text>
          <Text className="text-muted-foreground dark:text-slate-400 text-center mt-3 leading-6">
            Ha full kontroll over alle kvitteringer, garantier og frister.
          </Text>
        </View>

        {/* Features */}
        <View className="mx-6 bg-card dark:bg-slate-800 rounded-2xl border border-border dark:border-slate-700 overflow-hidden mb-8">
          {FEATURES.map((f, i) => (
            <View
              key={f.title}
              className={`flex-row items-start px-4 py-4 gap-4 ${
                i < FEATURES.length - 1 ? 'border-b border-border dark:border-slate-700' : ''
              }`}
            >
              <View className="bg-primary/10 rounded-xl p-2">
                <f.Icon size={20} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground dark:text-slate-100 font-semibold">{f.title}</Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-sm mt-0.5">{f.body}</Text>
              </View>
              <Check size={18} color="#6366F1" />
            </View>
          ))}
        </View>

        {/* CTA */}
        <View className="mx-6">
          {premiumLoading ? (
            <ActivityIndicator color="#6366F1" />
          ) : isPremium ? (
            <View className="bg-primary/10 rounded-2xl p-6 items-center">
              <CheckCircle size={40} color="#6366F1" />
              <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-3">
                Premium aktiv
              </Text>
              <Text className="text-muted-foreground dark:text-slate-400 text-center mt-2">
                Du har allerede tilgang til alle Premium-funksjoner.
              </Text>
            </View>
          ) : (
            <>
              <Button onPress={handleUpgrade} loading={loading} size="lg">
                Kom i gang med Premium
              </Button>
              <Text className="text-xs text-muted-foreground dark:text-slate-500 text-center mt-3 leading-5">
                Abonnementet fornyes automatisk. Avbryt når som helst i App Store / Google Play.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
