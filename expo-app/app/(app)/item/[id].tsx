import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Trash2, Archive, ChevronLeft, FileText, Scale } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { getReceipts, getArchivedReceipts, deleteReceipt, archiveReceipt } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { calculateStatus } from '@/utils/receiptStatus';
import type { Receipt } from '@/types/receipt';

const typeLabels: Record<string, string> = {
  receipt: 'Kvittering',
  gift_card: 'Gavekort',
  return_slip: 'Byttelapp',
  warranty: 'Garanti',
};

// 'warranty_expired' and 'gift_card_expired' → red (alarming — the protection is gone)
// 'return_expired'                            → orange (calm — only the return window closed)
// All other states match previous behaviour.
const statusColors: Record<string, string> = {
  active:           'text-green-600 dark:text-green-400',
  expiring_soon:    'text-orange-500',
  warranty_expired: 'text-destructive',
  return_expired:   'text-orange-400 dark:text-orange-300',
  gift_card_expired:'text-destructive',
  used:             'text-muted-foreground dark:text-slate-400',
  archived:         'text-muted-foreground dark:text-slate-400',
  expired:          'text-destructive', // legacy — kept for old cached rows
};

const statusLabels: Record<string, string> = {
  active:           'Aktiv',
  expiring_soon:    'Utløper snart',
  warranty_expired: 'Garanti utløpt',
  return_expired:   'Byttefrist utløpt',
  gift_card_expired:'Gavekort utløpt',
  used:             'Brukt',
  archived:         'Arkivert',
  expired:          'Utløpt', // legacy
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-3 border-b border-border dark:border-slate-700">
      <Text className="text-muted-foreground dark:text-slate-400 text-sm">{label}</Text>
      <Text className="text-foreground dark:text-slate-100 text-sm font-medium">{value}</Text>
    </View>
  );
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id, user?.id],
    queryFn: async (): Promise<Receipt | null> => {
      if (!user || !id) return null;
      // Use the same queries that work on dashboard/archive screens.
      // getReceipts and getArchivedReceipts filter by user_id explicitly,
      // so they work regardless of how Supabase RLS is configured.
      const [active, archived] = await Promise.all([
        getReceipts(user.id),
        getArchivedReceipts(user.id),
      ]);
      return active.find((r) => r.id === id) ?? archived.find((r) => r.id === id) ?? null;
    },
    enabled: !!id && !!user,
    retry: 2,
    retryDelay: 800,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReceipt(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['archived-receipts'] });
      router.back();
      Toast.show({ type: 'success', text1: 'Slettet' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Sletting feilet' }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveReceipt(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['archived-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      Toast.show({ type: 'success', text1: 'Arkivert' });
    },
  });

  const confirmDelete = () => {
    Alert.alert('Slett kvittering', 'Er du sikker? Handlingen kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Slett', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'd. MMMM yyyy', { locale: nb });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900 items-center justify-center px-8">
        <Text className="text-xl font-bold text-foreground dark:text-slate-100 mb-3">Ikke funnet</Text>
        <Text className="text-muted-foreground dark:text-slate-400 text-center">
          Kvitteringen ble ikke funnet eller du har ikke tilgang.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6">
          <Text className="text-primary">← Tilbake</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = calculateStatus(receipt);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border dark:border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft size={20} color="#6366F1" />
          <Text className="text-primary text-base">Tilbake</Text>
        </TouchableOpacity>
        <View className="flex-row gap-4">
          {!receipt.archived && (
            <TouchableOpacity onPress={() => archiveMutation.mutate()}>
              <Archive size={20} color="#64748B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={confirmDelete}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Image */}
        {receipt.image_url && !imageError ? (
          <Image
            source={{ uri: receipt.image_url }}
            style={{ width: '100%', height: 220 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View className="w-full h-32 bg-muted dark:bg-slate-800 items-center justify-center">
            <FileText size={40} color="#94A3B8" />
          </View>
        )}

        <View className="px-6 pt-6">
          {/* Title row */}
          <View className="flex-row items-start justify-between mb-1">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-bold text-foreground dark:text-slate-100">{receipt.shop_name}</Text>
              {receipt.product_name ? (
                <Text className="text-muted-foreground dark:text-slate-400 mt-1">{receipt.product_name}</Text>
              ) : null}
            </View>
            <View className="bg-primary/10 rounded-lg px-3 py-1.5">
              <Text className="text-primary text-sm font-medium">
                {typeLabels[receipt.type] ?? 'Kvittering'}
              </Text>
            </View>
          </View>

          {/* Status badge */}
          <Text className={`text-sm font-medium mt-2 ${statusColors[status] ?? 'text-foreground'}`}>
            {statusLabels[status] ?? status}
          </Text>

          {/* Extra context for return-right-expired-but-warranty-valid is handled
              implicitly: calculateStatus returns 'active' in that case, so it
              will NEVER show 'return_expired' when warranty is still valid.
              The warranty date row below already communicates the remaining value. */}

          {/* Amount */}
          {receipt.amount > 0 && (
            <Text className="text-3xl font-bold text-foreground dark:text-slate-100 mt-4">
              {receipt.amount.toFixed(0)} kr
            </Text>
          )}

          {/* Gift card remaining */}
          {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && (
            <View className="mt-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-800">
              <Text className="text-muted-foreground dark:text-slate-400 text-sm">Gjenstående saldo</Text>
              <Text className="text-2xl font-bold text-foreground dark:text-slate-100 mt-1">
                {receipt.remaining_value} kr
              </Text>
            </View>
          )}

          {/* Details */}
          <View className="mt-6 bg-card dark:bg-slate-800 rounded-2xl px-4 border border-border dark:border-slate-700">
            <DetailRow label="Kjøpsdato" value={formatDate(receipt.purchase_date)} />
            <DetailRow label="Garanti til" value={formatDate(receipt.warranty_until)} />
            <DetailRow label="Returrett til" value={formatDate(receipt.return_until)} />
            <DetailRow label="Utløper" value={formatDate(receipt.expiry_date)} />
          </View>

          {/* Warranty disclaimer */}
          {receipt.type === 'receipt' && receipt.warranty_until && (
            <View className="mt-4 bg-muted dark:bg-slate-800 rounded-xl p-4 flex-row gap-3">
              <Scale size={16} color="#6B7280" style={{ marginTop: 1 }} />
              <Text className="text-xs text-muted-foreground dark:text-slate-400 leading-5 flex-1">
                Reklamasjonsretten er beregnet etter norsk forbrukerkjøpslov. 2 år standard,
                5 år for varige forbruksvarer. Kvittr er ikke juridisk rådgivning.
              </Text>
            </View>
          )}

          {/* Processing */}
          {receipt.processing_status === 'pending' && (
            <View className="mt-4 bg-primary/10 rounded-xl p-4 flex-row items-center gap-3">
              <ActivityIndicator size="small" color="#6366F1" />
              <Text className="text-primary text-sm">Analyserer kvittering…</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
