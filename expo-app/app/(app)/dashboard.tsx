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
  import { Bell, Crown, AlertTriangle, FileText, ArchiveX } from 'lucide-react-native';
  import { ReceiptCard } from '@/components/ReceiptCard';
  import { SwipeableCard } from '@/components/SwipeableCard';
  import { Logo } from '@/components/Logo';
  import { Button } from '@/components/ui/Button';
  import { getReceipts, deleteReceipt, archiveReceipt, getArchivedReceipts, unarchiveReceipt } from '@/lib/storage';
  import { getGuestReceipts, deleteGuestReceipt } from '@/lib/guestStorage';
  import { useAuth } from '@/hooks/useAuth';
  import { usePremiumStatus } from '@/hooks/usePremiumStatus';
  import { isExpiringSoon } from '@/utils/receiptStatus';
  import type { Receipt, GuestReceipt } from '@/types/receipt';

  type FilterTab = 'all' | 'expiring' | 'receipt' | 'gift_card' | 'return_slip' | 'archived';

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'expiring', label: 'Utløper' },
    { key: 'receipt', label: 'Kvitteringer' },
    { key: 'gift_card', label: 'Gavekort' },
    { key: 'return_slip', label: 'Byttelapper' },
    { key: 'archived', label: 'Arkivert' },
  ];

  export default function DashboardScreen() {
    const { user, isAuthenticated } = useAuth();
    const { isPremium } = usePremiumStatus();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [refreshing, setRefreshing] = useState(false);

    const isArchivedTab = activeTab === 'archived';

    const { data: receipts = [], isLoading } = useQuery({
      queryKey: ['receipts', user?.id],
      queryFn: async () => {
        if (isAuthenticated && user) return getReceipts(user.id);
        return getGuestReceipts();
      },
      staleTime: 10_000,
    });

    const { data: archivedReceipts = [], isLoading: isLoadingArchived } = useQuery({
      queryKey: ['archived-receipts', user?.id],
      queryFn: async () => {
        if (!isAuthenticated || !user) return [];
        return getArchivedReceipts(user.id);
      },
      enabled: isAuthenticated && isArchivedTab,
      staleTime: 10_000,
    });

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['archived-receipts'] });
    };

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
        if (isAuthenticated && user) {
          await deleteReceipt(id);
        } else {
          await deleteGuestReceipt(id);
        }
      },
      onSuccess: () => {
        invalidateAll();
        Toast.show({ type: 'success', text1: 'Slettet' });
      },
      onError: () => {
        Toast.show({ type: 'error', text1: 'Sletting feilet' });
      },
    });

    const archiveMutation = useMutation({
      mutationFn: async (id: string) => {
        if (isAuthenticated && user) await archiveReceipt(id);
      },
      onSuccess: () => {
        invalidateAll();
        Toast.show({ type: 'success', text1: 'Arkivert' });
      },
      onError: () => {
        Toast.show({ type: 'error', text1: 'Arkivering feilet' });
      },
    });

    const unarchiveMutation = useMutation({
      mutationFn: (id: string) => unarchiveReceipt(id),
      onSuccess: () => {
        invalidateAll();
        Toast.show({ type: 'success', text1: 'Hentet fra arkiv' });
      },
      onError: () => {
        Toast.show({ type: 'error', text1: 'Kunne ikke hente fra arkiv' });
      },
    });

    const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await invalidateAll();
      setRefreshing(false);
    }, [queryClient]);

    const filtered = isArchivedTab
      ? (archivedReceipts as Receipt[])
      : receipts.filter((r: Receipt | GuestReceipt) => {
          if (activeTab === 'all') return true;
          if (activeTab === 'expiring') return isExpiringSoon(r as Receipt);
          return (r as Receipt).type === activeTab;
        });

    const expiringCount = receipts.filter((r: Receipt | GuestReceipt) =>
      isExpiringSoon(r as Receipt),
    ).length;

    const loading = isArchivedTab ? isLoadingArchived : isLoading;

    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
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

        {/* Expiry alert banner */}
        {expiringCount > 0 && !isArchivedTab && (
          <TouchableOpacity
            onPress={() => setActiveTab('expiring')}
            className="mx-4 mb-2 flex-row items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5"
            activeOpacity={0.8}
          >
            <AlertTriangle size={16} color="#D97706" />
            <Text className="text-amber-700 dark:text-amber-400 text-sm font-medium flex-1">
              {expiringCount} {expiringCount === 1 ? 'kvittering utløper' : 'kvitteringer utløper'} snart
            </Text>
            <Text className="text-amber-600 dark:text-amber-500 text-xs">Se →</Text>
          </TouchableOpacity>
        )}

        {/* Filter tabs */}
        <View className="border-b border-border dark:border-slate-700">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={isAuthenticated ? TABS : TABS.filter(t => t.key !== 'archived')}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveTab(item.key)}
                className={`px-3 py-1.5 rounded-full ${
                  activeTab === item.key
                    ? 'bg-primary'
                    : 'bg-muted dark:bg-slate-800'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    activeTab === item.key
                      ? 'text-white'
                      : 'text-muted-foreground dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6366F1" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            {isArchivedTab ? (
              <>
                <ArchiveX size={56} color="#94A3B8" />
                <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-4 text-center">
                  Arkivet er tomt
                </Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-center mt-2 leading-6">
                  Sveip en kvittering til venstre og trykk Arkiver for å lagre den her.
                </Text>
              </>
            ) : (
              <>
                <FileText size={56} color="#94A3B8" />
                <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-4 text-center">
                  {activeTab === 'all' ? 'Ingen kvitteringer ennå' : 'Ingen her'}
                </Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-center mt-2 leading-6">
                  {activeTab === 'all'
                    ? 'Trykk på skann-knappen for å legge til din første kvittering.'
                    : 'Prøv en annen kategori eller skann en ny kvittering.'}
                </Text>
                {activeTab === 'all' && (
                  <Button onPress={() => router.push('/(app)/scan')} className="mt-6">
                    Skann kvittering
                  </Button>
                )}
              </>
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
              <View>
                <SwipeableCard
                  onDelete={() => deleteMutation.mutate((item as Receipt).id)}
                  onArchive={
                    isAuthenticated && !isArchivedTab
                      ? () => archiveMutation.mutate((item as Receipt).id)
                      : undefined
                  }
                >
                  <ReceiptCard
                    receipt={item as Receipt}
                    isExpiring={isExpiringSoon(item as Receipt)}
                  />
                </SwipeableCard>
                {isArchivedTab && (
                  <TouchableOpacity
                    onPress={() => unarchiveMutation.mutate((item as Receipt).id)}
                    className="mb-3 -mt-9 mx-1 bg-muted dark:bg-slate-800 rounded-b-2xl px-4 py-2.5 flex-row items-center gap-2 border border-t-0 border-border dark:border-slate-700"
                    activeOpacity={0.7}
                  >
                    <ArchiveX size={14} color="#6366F1" />
                    <Text className="text-primary text-xs font-medium">Hent fra arkiv</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }
  