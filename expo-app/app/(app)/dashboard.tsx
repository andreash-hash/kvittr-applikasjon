import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Bell, Crown, AlertTriangle, FileText, ArchiveX, Search, X } from 'lucide-react-native';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremiumStatus();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['archived-receipts'] });
  }, [queryClient]);

  // Refresh data every time the screen comes into focus (handles initial
  // mount via Stack→Tabs navigation and subsequent tab taps)
  useFocusEffect(
    useCallback(() => {
      invalidateAll();
    }, [invalidateAll]),
  );

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
    invalidateAll();
    setRefreshing(false);
  }, [invalidateAll]);

  const tabFiltered = isArchivedTab
    ? (archivedReceipts as Receipt[])
    : receipts.filter((r: Receipt | GuestReceipt) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'expiring') return isExpiringSoon(r as Receipt);
        return (r as Receipt).type === activeTab;
      });

  const filtered = searchQuery.trim()
    ? tabFiltered.filter((r) => {
        const q = searchQuery.toLowerCase();
        const receipt = r as Receipt;
        return (
          receipt.shop_name?.toLowerCase().includes(q) ||
          receipt.product_name?.toLowerCase().includes(q) ||
          receipt.notes?.toLowerCase().includes(q) ||
          String(receipt.amount ?? '').includes(q)
        );
      })
    : tabFiltered;

  const expiringCount = receipts.filter((r: Receipt | GuestReceipt) =>
    isExpiringSoon(r as Receipt),
  ).length;

  const loading = isArchivedTab ? isLoadingArchived : isLoading;

  const bgColor = isDark ? '#0F172A' : '#FAF7F2';
  const textColor = isDark ? '#F1F5F9' : '#1A1A2E';
  const mutedColor = isDark ? '#94A3B8' : '#6B7280';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Logo size="medium" />
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {!isPremium && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/premium')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Crown size={20} color="#6366F1" />
              <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '500' }}>Premium</Text>
            </TouchableOpacity>
          )}
          {expiringCount > 0 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveTab('expiring')} style={{ position: 'relative' }}>
              <Bell size={22} color="#64748B" />
              <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, backgroundColor: '#EF4444', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{expiringCount}</Text>
              </View>
            </TouchableOpacity>
          )}
          {!isAuthenticated && (
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={{ color: '#6366F1', fontSize: 14, fontWeight: '500' }}>Logg inn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search field */}
      <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: isDark ? '#334155' : '#E5E7EB' }}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Søk etter butikk eller produkt..."
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: textColor }}
          clearButtonMode="never"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Expiry alert banner */}
      {expiringCount > 0 && !isArchivedTab && !searchQuery && (
        <TouchableOpacity
          onPress={() => setActiveTab('expiring')}
          style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? 'rgba(217,119,6,0.2)' : '#FFFBEB', borderWidth: 1, borderColor: isDark ? '#92400E' : '#FDE68A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
          activeOpacity={0.8}
        >
          <AlertTriangle size={16} color="#D97706" />
          <Text style={{ color: isDark ? '#FCD34D' : '#B45309', fontSize: 14, fontWeight: '500', flex: 1 }}>
            {expiringCount} {expiringCount === 1 ? 'kvittering utløper' : 'kvitteringer utløper'} snart
          </Text>
          <Text style={{ color: isDark ? '#FCD34D' : '#D97706', fontSize: 12 }}>Se →</Text>
        </TouchableOpacity>
      )}

      {/* Filter tabs */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#E5E7EB' }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={isAuthenticated ? TABS : TABS.filter(t => t.key !== 'archived')}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item.key)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: activeTab === item.key ? '#6366F1' : (isDark ? '#1E293B' : '#F3F4F6') }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === item.key ? '#fff' : mutedColor }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          {searchQuery.trim() ? (
            <>
              <Search size={48} color="#94A3B8" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, marginTop: 16, textAlign: 'center' }}>
                Ingen treff
              </Text>
              <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 8 }}>
                Prøv et annet søkeord.
              </Text>
            </>
          ) : isArchivedTab ? (
            <>
              <ArchiveX size={56} color="#94A3B8" />
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, marginTop: 16, textAlign: 'center' }}>
                Arkivet er tomt
              </Text>
              <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 8, lineHeight: 24 }}>
                Sveip en kvittering til venstre og trykk Arkiver for å lagre den her.
              </Text>
            </>
          ) : (
            <>
              <FileText size={56} color="#94A3B8" />
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, marginTop: 16, textAlign: 'center' }}>
                {activeTab === 'all' ? 'Ingen kvitteringer ennå' : 'Ingen her'}
              </Text>
              <Text style={{ color: mutedColor, textAlign: 'center', marginTop: 8, lineHeight: 24 }}>
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
                footer={
                  isArchivedTab ? (
                    <TouchableOpacity
                      onPress={() => unarchiveMutation.mutate((item as Receipt).id)}
                      style={{ backgroundColor: isDark ? '#1E293B' : '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      activeOpacity={0.7}
                    >
                      <ArchiveX size={14} color="#6366F1" />
                      <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '500' }}>Hent fra arkiv</Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            </SwipeableCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}
