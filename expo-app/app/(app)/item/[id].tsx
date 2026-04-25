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
import { Trash2, Archive, ChevronLeft, ExternalLink } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { getReceipts, deleteReceipt, archiveReceipt } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { calculateStatus } from '@/utils/receiptStatus';
import type { Receipt } from '@/types/receipt';

const typeLabels: Record<string, string> = {
  receipt: 'Kvittering',
  gift_card: 'Gavekort',
  return_slip: 'Byttelapp',
  warranty: 'Garanti',
};

const statusColors: Record<string, string> = {
  active: 'text-green-600',
  expiring_soon: 'text-orange-500',
  expired: 'text-destructive',
  archived: 'text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  expiring_soon: 'Utløper snart',
  expired: 'Utløpt',
  archived: 'Arkivert',
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-3 border-b border-border">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground text-sm font-medium">{value}</Text>
    </View>
  );
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async (): Promise<Receipt | null> => {
      if (!isAuthenticated || !user) return null;
      const all = await getReceipts(user.id);
      return all.find((r) => r.id === id) ?? null;
    },
    enabled: !!id && isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReceipt(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      router.back();
      Toast.show({ type: 'success', text1: 'Slettet' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Sletting feilet' }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveReceipt(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'receipt'] });
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
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-xl font-bold text-foreground mb-3">Ikke funnet</Text>
        <Text className="text-muted-foreground text-center">
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft size={20} color="#6366F1" />
          <Text className="text-primary text-base">Tilbake</Text>
        </TouchableOpacity>
        <View className="flex-row gap-4">
          {receipt.status !== 'archived' && (
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
          <View className="w-full h-32 bg-muted items-center justify-center">
            <Text style={{ fontSize: 40 }}>🧾</Text>
          </View>
        )}

        <View className="px-6 pt-6">
          {/* Title row */}
          <View className="flex-row items-start justify-between mb-1">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-bold text-foreground">{receipt.shop_name}</Text>
              {receipt.product_name ? (
                <Text className="text-muted-foreground mt-1">{receipt.product_name}</Text>
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

          {/* Amount */}
          {receipt.amount > 0 && (
            <Text className="text-3xl font-bold text-foreground mt-4">
              {receipt.amount.toFixed(0)} kr
            </Text>
          )}

          {/* Gift card remaining */}
          {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && (
            <View className="mt-3 bg-category-giftcard/10 rounded-xl p-4">
              <Text className="text-muted-foreground text-sm">Gjenstående saldo</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">
                {receipt.remaining_value} kr
              </Text>
            </View>
          )}

          {/* Details */}
          <View className="mt-6 bg-card rounded-2xl px-4 border border-border">
            <DetailRow label="Kjøpsdato" value={formatDate(receipt.purchase_date)} />
            <DetailRow label="Garanti til" value={formatDate(receipt.warranty_until)} />
            <DetailRow label="Returrett til" value={formatDate(receipt.return_until)} />
            <DetailRow label="Utløper" value={formatDate(receipt.expiry_date)} />
          </View>

          {/* Warranty disclaimer */}
          {receipt.type === 'receipt' && receipt.warranty_until && (
            <View className="mt-4 bg-muted rounded-xl p-4">
              <Text className="text-xs text-muted-foreground leading-5">
                ⚖️ Reklamasjonsretten er beregnet etter norsk forbrukerkjøpslov. 2 år standard,
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
