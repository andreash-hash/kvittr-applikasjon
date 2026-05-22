import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { differenceInDays } from 'date-fns';
import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import type { Receipt } from '../types/receipt';

interface ReceiptCardProps {
  receipt: Receipt;
  isExpiring?: boolean;
  footer?: React.ReactNode;
}

const typeBadge: Record<string, { bg: string; label: string }> = {
  receipt:     { bg: '#6366F1', label: 'Kvittering' },
  gift_card:   { bg: '#0D9488', label: 'Gavekort' },
  return_slip: { bg: '#D97706', label: 'Byttelapp' },
  warranty:    { bg: '#6366F1', label: 'Garanti' },
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, isExpiring, footer }) => {
  const expiryDate = receipt.warranty_until ?? receipt.return_until ?? receipt.expiry_date;
  const daysLeft = expiryDate
    ? differenceInDays(new Date(expiryDate), new Date())
    : null;

  const expiryLabel = (): string | null => {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return 'Utløpt';
    if (daysLeft === 0) return 'Utløper i dag!';
    if (daysLeft === 1) return '1 dag igjen';
    if (daysLeft < 30) return `${daysLeft} dager igjen`;
    const months = Math.floor(daysLeft / 30);
    return `${months} ${months === 1 ? 'måned' : 'måneder'} igjen`;
  };

  const badge = typeBadge[receipt.type] ?? typeBadge.receipt;
  const label = expiryLabel();
  const urgentExpiry = (daysLeft ?? Infinity) <= 7 && (daysLeft ?? Infinity) >= 0;

  const borderColor = isExpiring ? '#F59E0B' : undefined;

  return (
    <View
      className={`rounded-2xl bg-card dark:bg-slate-800 shadow-sm border overflow-hidden ${
        isExpiring ? 'border-category-expiring' : 'border-border dark:border-slate-700'
      }`}
      style={{ elevation: 2, borderColor }}
    >
      <TouchableOpacity
        className="p-4"
        activeOpacity={0.75}
        onPress={() => router.push(`/(app)/item/${receipt.id}`)}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground dark:text-slate-100" numberOfLines={1}>
              {receipt.shop_name}
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-slate-400 mt-0.5" numberOfLines={1}>
              {receipt.product_name}
            </Text>
            {receipt.amount > 0 && (
              <Text className="text-sm text-muted-foreground dark:text-slate-400 mt-1">
                {receipt.amount.toFixed(0)} kr
              </Text>
            )}
          </View>

          <View className="items-end ml-3">
            <View style={{ backgroundColor: badge.bg }} className="rounded-lg px-2 py-1">
              <Text className="text-xs font-medium text-white">{badge.label}</Text>
            </View>
            {label && (
              <View className="flex-row items-center gap-1 mt-1.5">
                {urgentExpiry && <Clock size={10} color="#EF4444" />}
                <Text
                  className={`text-xs font-medium ${
                    urgentExpiry ? 'text-destructive' : 'text-muted-foreground dark:text-slate-400'
                  }`}
                >
                  {label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && (
          <View className="mt-2 pt-2 border-t border-border dark:border-slate-700">
            <Text className="text-sm text-muted-foreground dark:text-slate-400">
              Saldo:{' '}
              <Text className="font-semibold text-foreground dark:text-slate-100">
                {receipt.remaining_value} kr
              </Text>
            </Text>
          </View>
        )}

        {receipt.processing_status === 'pending' && (
          <View className="mt-2 pt-2 border-t border-border dark:border-slate-700 flex-row items-center gap-2">
            <Clock size={12} color="#6366F1" />
            <Text className="text-xs text-primary">Analyserer kvittering…</Text>
          </View>
        )}
      </TouchableOpacity>

      {footer && (
        <>
          <View className="h-px bg-border dark:bg-slate-700" />
          {footer}
        </>
      )}
    </View>
  );
};
