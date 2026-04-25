import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Bell, Crown } from 'lucide-react-native';
import { ReceiptCard } from '@/components/ReceiptCard';
import { SwipeableCard } from '@/components/SwipeableCard';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { getReceipts, deleteReceipt, archiveReceipt } from '@/lib/storage';
import { getGuestReceipts, deleteGuestReceipt } from '@/lib/guestStorage';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { isExpiringSoon } from '@/utils/receiptStatus';
import type { Receipt, GuestReceipt } from '@/types/receipt';

type FilterTab = 'all' | 'expiring' | 'receipt' | 'gift_card' | 'return_slip';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'expiring', label: '⚠️ Utløper' },
  { key: 'receipt', label: 'Kvitteringer' },
  { key: 'gift_card', label: 'Gavekort' },
  { key: 'return_slip', label: 'Byttelapper' },
];

export default function DashboardScreen() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremiumStatus();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', user?.id],
    queryFn: async () => {
      if (isAuthenticated && user) {
        return getReceipts(user.id);
      }
      return getGuestReceipts();
    },
    staleTime: 10_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isAuthenticated && user) {
        await deleteReceipt(id);
      } else {
        await deleteGuestReceipt(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      Toast.show({ type: 'success', text1: 'Slettet' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Sletting feilet' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isAuthenticated && user) {
        await archiveReceipt(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      Toast.show({ type: 'success', text1: 'Arkivert' });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['receipts'] });
    setRefreshing(false);
  }, [queryClient]);

  const filtered = receipts.filter((r: Receipt | GuestReceipt) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'expiring') return isExpiringSoon(r as Receipt);
    return (r as Receipt).type === activeTab;
  });

  const expiringCount = receipts.filter((r: Receipt | GuestReceipt) =>
    isExpiringSoon(r as Receipt),
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Logo size="small" />
        <View className="flex-row gap-3 items-center">
          {!isPremium && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/premium')}
              className="flex-row items-center gap-1 bg-primary/10 rounded-full px-3 py-1.5"
            >
              <Crown size={14} color="#6366F1" />
              <Text className="text-primary text-xs font-medium">Premium</Text>
            </TouchableOpacity>
          )}
          {expiringCount > 0 && (
            <View className="relative">
              <Bell size={22} color="#64748B" />
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{expiringCount}</Text>
              </View>
            </View>
          )}
          {!isAuthenticated && (
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-primary text-sm font-medium">Logg inn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View className="border-b border-border">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item.key)}
              className={`px-3 py-1.5 rounded-full ${
                activeTab === item.key ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === item.key ? 'text-white' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 60 }}>🧾</Text>
          <Text className="text-xl font-bold text-foreground mt-4 text-center">
            {activeTab === 'all' ? 'Ingen kvitteringer ennå' : 'Ingen her'}
          </Text>
          <Text className="text-muted-foreground text-center mt-2 leading-6">
            {activeTab === 'all'
              ? 'Trykk på skann-knappen for å legge til din første kvittering.'
              : 'Prøv en annen kategori eller skann en ny kvittering.'}
          </Text>
          {activeTab === 'all' && (
            <Button onPress={() => router.push('/(app)/scan')} className="mt-6">
              Skann kvittering
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => (item as Receipt).id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          renderItem={({ item }) => (
            <SwipeableCard
              onDelete={() => deleteMutation.mutate((item as Receipt).id)}
              onArchive={
                isAuthenticated
                  ? () => archiveMutation.mutate((item as Receipt).id)
                  : undefined
              }
            >
              <ReceiptCard
                receipt={item as Receipt}
                isExpiring={isExpiringSoon(item as Receipt)}
              />
            </SwipeableCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}
