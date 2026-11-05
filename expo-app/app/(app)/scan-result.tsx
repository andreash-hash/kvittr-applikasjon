import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { getReceiptById } from '@/lib/storage';
import { summarizeScanResult, type ResultTone } from '@/utils/scanResult';
import { track } from '@/lib/track';

const TONE_COLORS: Record<ResultTone, { bg: string; fg: string }> = {
  good: { bg: '#10B98120', fg: '#10B981' },
  soon: { bg: '#F59E0B20', fg: '#D97706' },
  expired: { bg: '#EF444420', fg: '#EF4444' },
  neutral: { bg: '#64748B20', fg: '#64748B' },
};

/**
 * Shown right after a successful scan. This is the moment the product proves
 * itself, so it leads with the warranty date, then asks a new user to keep the
 * receipt by adding an email.
 */
export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAnonymous } = useAuth();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id, user?.id],
    queryFn: () => getReceiptById(id as string, user?.id),
    enabled: !!id && !!user,
  });

  useEffect(() => {
    if (isAnonymous) track('signup_prompt_shown', { source: 'scan_result' });
  }, [isAnonymous]);

  if (isLoading || !receipt) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        {!isLoading && !receipt ? (
          <View className="mt-6 px-8 items-center gap-4">
            <Text className="text-foreground dark:text-slate-100 text-center">
              Vi fant ikke kvitteringen.
            </Text>
            <Button onPress={() => router.replace('/(app)/dashboard')}>Til oversikten</Button>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  const summary = summarizeScanResult(receipt);
  const colors = TONE_COLORS[summary.tone];
  const title = receipt.product_name || receipt.shop_name || 'Kvittering';
  const subtitle = receipt.product_name && receipt.shop_name ? receipt.shop_name : null;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-10 pb-6 justify-between">
          <View className="items-center">
            <CheckCircle size={44} color="#10B981" />
            <Text className="text-muted-foreground dark:text-slate-400 mt-3">Kvitteringen er lest</Text>
            <Text
              className="text-2xl font-bold text-foreground dark:text-slate-100 mt-2 text-center"
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-muted-foreground dark:text-slate-400 mt-1 text-center">{subtitle}</Text>
            ) : null}
          </View>

          <View
            className="rounded-3xl px-6 py-8 items-center my-8"
            style={{ backgroundColor: colors.bg }}
          >
            <Text style={{ color: colors.fg }} className="text-sm font-semibold uppercase tracking-wide">
              {summary.label}
            </Text>
            {summary.headline ? (
              <Text
                style={{ color: colors.fg }}
                className="text-3xl font-bold mt-2 text-center"
                accessibilityRole="header"
              >
                {summary.headline}
              </Text>
            ) : null}
            <Text className="text-foreground dark:text-slate-200 mt-3 text-center leading-6">
              {summary.detail}
            </Text>
          </View>

          <View className="gap-3">
            {isAnonymous ? (
              <>
                <Text className="text-muted-foreground dark:text-slate-400 text-center mb-1 leading-6">
                  Lag en gratis konto for å lagre kvitteringen og få varsel før garantien utløper.
                </Text>
                <Button
                  size="lg"
                  onPress={() => router.push('/(auth)/signup')}
                  accessibilityLabel="Lag konto"
                >
                  Lag konto
                </Button>
                <Button
                  variant="outline"
                  onPress={() => router.replace(`/(app)/item/${receipt.id}`)}
                  accessibilityLabel="Se kvitteringen"
                >
                  Se kvitteringen
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onPress={() => router.replace(`/(app)/item/${receipt.id}`)}
                accessibilityLabel="Se kvitteringen"
              >
                Se kvitteringen
              </Button>
            )}
            <Button
              variant="ghost"
              onPress={() => router.replace('/(app)/scan')}
              accessibilityLabel="Skann en til"
            >
              Skann en til
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
