import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ArchiveX } from 'lucide-react-native';
import { ReceiptCard } from '@/components/ReceiptCard';
import { getArchivedReceipts, unarchiveReceipt } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import type { Receipt } from '@/types/receipt';

export default function ArchiveScreen() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: archived = [], isLoading } = useQuery({
    queryKey: ['archived-receipts', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return [];
      return getArchivedReceipts(user.id);
    },
    enabled: isAuthenticated,
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      Toast.show({ type: 'success', text1: 'Hentet fra arkiv' });
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900 items-center justify-center px-8" edges={['top']}>
        <ArchiveX size={56} color="#94A3B8" />
        <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-4 text-center">
          Logg inn for å se arkivet
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <View className="px-4 py-4 border-b border-border dark:border-slate-700">
        <Text className="text-2xl font-bold text-foreground dark:text-slate-100">Arkiv</Text>
        <Text className="text-sm text-muted-foreground dark:text-slate-400 mt-0.5">
          Arkiverte kvitteringer
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : archived.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <ArchiveX size={56} color="#94A3B8" />
          <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-4 text-center">
            Arkivet er tomt
          </Text>
          <Text className="text-muted-foreground dark:text-slate-400 text-center mt-2 leading-6">
            Sveip en kvittering til venstre på dashbordet for å arkivere den.
          </Text>
        </View>
      ) : (
        <FlatList
          data={archived as Receipt[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View>
              <ReceiptCard receipt={item} />
              <TouchableOpacity
                onPress={() => unarchiveMutation.mutate(item.id)}
                className="mb-3 -mt-1 mx-1 bg-muted dark:bg-slate-800 rounded-b-2xl px-4 py-2.5 flex-row items-center gap-2 border border-t-0 border-border dark:border-slate-700"
                activeOpacity={0.7}
              >
                <ArchiveX size={14} color="#6366F1" />
                <Text className="text-primary text-xs font-medium">Hent fra arkiv</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
