import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { differenceInDays } from 'date-fns';
import { router } from 'expo-router';
import type { Receipt } from '../types/receipt';

interface ReceiptCardProps {
  receipt: Receipt;
  isExpiring?: boolean;
}

const typeColors: Record<string, string> = {
  receipt: 'bg-category-receipt',
  gift_card: 'bg-category-giftcard',
  return_slip: 'bg-category-return',
  warranty: 'bg-category-receipt',
};

const typeLabels: Record<string, string> = {
  receipt: 'Kvittering',
  gift_card: 'Gavekort',
  return_slip: 'Byttelapp',
  warranty: 'Garanti',
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, isExpiring }) => {
  const expiryDate = receipt.warranty_until ?? receipt.return_until ?? receipt.expiry_date;
  const daysLeft = expiryDate
    ? differenceInDays(new Date(expiryDate), new Date())
    : null;

  const expiryLabel = () => {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return 'Utløpt';
    if (daysLeft === 0) return 'Utløper i dag!';
    if (daysLeft === 1) return '1 dag igjen';
    if (daysLeft < 30) return `${daysLeft} dager igjen`;
    const months = Math.floor(daysLeft / 30);
    return `${months} ${months === 1 ? 'måned' : 'måneder'} igjen`;
  };

  return (
    <TouchableOpacity
      className={`rounded-2xl bg-card p-4 mb-2 shadow-sm border ${
        isExpiring ? 'border-category-expiring' : 'border-border'
      }`}
      style={{ elevation: 2 }}
      activeOpacity={0.75}
      onPress={() => router.push(`/(app)/item/${receipt.id}`)}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {receipt.shop_name}
          </Text>
          <Text className="text-sm text-muted-foreground mt-0.5" numberOfLines={1}>
            {receipt.product_name}
          </Text>
          {receipt.amount > 0 && (
            <Text className="text-sm text-muted-foreground mt-1">
              {receipt.amount.toFixed(0)} kr
            </Text>
          )}
        </View>

        <View className="items-end ml-3">
          <View className={`${typeColors[receipt.type] ?? 'bg-primary'} rounded-lg px-2 py-1`}>
            <Text className="text-xs font-medium text-white">
              {typeLabels[receipt.type] ?? 'Kvittering'}
            </Text>
          </View>
          {expiryLabel() && (
            <Text
              className={`text-xs mt-1.5 font-medium ${
                (daysLeft ?? 0) <= 7 && (daysLeft ?? 0) >= 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {expiryLabel()}
            </Text>
          )}
        </View>
      </View>

      {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && (
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-sm text-muted-foreground">
            Saldo: <Text className="font-semibold text-foreground">{receipt.remaining_value} kr</Text>
          </Text>
        </View>
      )}

      {receipt.processing_status === 'pending' && (
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-xs text-primary">⏳ Analyserer kvittering…</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
