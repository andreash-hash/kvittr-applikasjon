import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Trash2, Archive, ChevronLeft, FileText, Scale, Pencil, X, RotateCcw,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { getReceipts, getArchivedReceipts, deleteReceipt, archiveReceipt, updateReceipt } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { calculateStatus } from '@/utils/receiptStatus';
import type { Receipt } from '@/types/receipt';
import { EditFieldModal, type FieldType, type SegmentOption } from '@/components/EditFieldModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const typeLabels: Record<string, string> = {
  receipt: 'Kvittering',
  gift_card: 'Gavekort',
  return_slip: 'Byttelapp',
  warranty: 'Garanti',
};

const statusColors: Record<string, string> = {
  active:            'text-green-600 dark:text-green-400',
  expiring_soon:     'text-orange-500',
  warranty_expired:  'text-destructive',
  return_expired:    'text-orange-400 dark:text-orange-300',
  gift_card_expired: 'text-destructive',
  used:              'text-muted-foreground dark:text-slate-400',
  archived:          'text-muted-foreground dark:text-slate-400',
  expired:           'text-destructive',
};

const statusLabels: Record<string, string> = {
  active:            'Aktiv',
  expiring_soon:     'Utløper snart',
  warranty_expired:  'Garanti utløpt',
  return_expired:    'Byttefrist utløpt',
  gift_card_expired: 'Gavekort utløpt',
  used:              'Brukt',
  archived:          'Arkivert',
  expired:           'Utløpt',
};

const RECEIPT_TYPE_OPTIONS: SegmentOption[] = [
  { value: 'receipt',    label: 'Kvittering' },
  { value: 'gift_card',  label: 'Gavekort' },
  { value: 'return_slip', label: 'Byttelapp' },
];

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-3 border-b border-border dark:border-slate-700">
      <Text className="text-muted-foreground dark:text-slate-400 text-sm">{label}</Text>
      <Text className="text-foreground dark:text-slate-100 text-sm font-medium">{value}</Text>
    </View>
  );
}

function EditableRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string | null;
  onEdit: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.7}
      className="flex-row justify-between items-center py-3 border-b border-border dark:border-slate-700"
    >
      <Text className="text-muted-foreground dark:text-slate-400 text-sm">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Text
          className={`text-sm font-medium ${value ? 'text-foreground dark:text-slate-100' : 'text-muted-foreground dark:text-slate-500'}`}
        >
          {value ?? 'Ikke satt'}
        </Text>
        <Pencil size={12} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = useState(false);
  const [imageZoomVisible, setImageZoomVisible] = useState(false);

  // Swipe-down-to-dismiss for image zoom
  const zoomTranslateY = useSharedValue(0);
  const zoomOpacity = useSharedValue(1);

  useEffect(() => {
    if (imageZoomVisible) {
      zoomTranslateY.value = 0;
      zoomOpacity.value = 1;
    }
  }, [imageZoomVisible]);

  const dismissGesture = Gesture.Pan()
    .activeOffsetY([0, 15])
    .failOffsetY(-10)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        zoomTranslateY.value = e.translationY;
        zoomOpacity.value = Math.max(0.4, 1 - e.translationY / 250);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 600) {
        zoomTranslateY.value = withTiming(700, { duration: 220 });
        zoomOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(setImageZoomVisible)(false);
      } else {
        zoomTranslateY.value = withSpring(0, { damping: 20 });
        zoomOpacity.value = withSpring(1);
      }
    });

  const dismissAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: zoomTranslateY.value }],
    opacity: zoomOpacity.value,
  }));

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    fieldKey: string;
    title: string;
    fieldType: FieldType;
    value: string;
    segmentOptions?: SegmentOption[];
  }>({ visible: false, fieldKey: '', title: '', fieldType: 'text', value: '' });

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id, user?.id],
    queryFn: async (): Promise<Receipt | null> => {
      if (!user || !id) return null;
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

  const openEdit = (
    fieldKey: string,
    title: string,
    fieldType: FieldType,
    value: string,
    segmentOptions?: SegmentOption[],
  ) => {
    setEditModal({ visible: true, fieldKey, title, fieldType, value, segmentOptions });
  };

  const handleSave = async (newValue: string) => {
    if (!id || !receipt) return;
    setEditModal((prev) => ({ ...prev, visible: false }));

    try {
      const updates: Record<string, unknown> = {};

      if (editModal.fieldKey === 'purchase_date') {
        updates.purchase_date = newValue;
        // Recompute warranty_until when purchase_date changes
        if (receipt.warranty_until) {
          const oldPurchase = new Date(receipt.purchase_date.split('T')[0]);
          const oldWarranty = new Date(receipt.warranty_until);
          const durationMs = oldWarranty.getTime() - oldPurchase.getTime();
          const newPurchase = new Date(newValue);
          const newWarranty = new Date(newPurchase.getTime() + durationMs);
          updates.warranty_until = newWarranty.toISOString().split('T')[0];
        }
      } else if (editModal.fieldKey === 'amount') {
        updates.amount = parseFloat(newValue) || 0;
      } else if (editModal.fieldKey === 'gift_card_balance') {
        updates.gift_card_balance = parseFloat(newValue) || 0;
      } else if (editModal.fieldKey === 'receipt_type') {
        updates.receipt_type = newValue;
      } else {
        updates[editModal.fieldKey] = newValue || null;
      }

      await updateReceipt(id, updates as Parameters<typeof updateReceipt>[1]);
      queryClient.invalidateQueries({ queryKey: ['receipt', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      Toast.show({ type: 'success', text1: 'Lagret' });
    } catch {
      Toast.show({ type: 'error', text1: 'Lagring feilet' });
    }
  };

  const handleRestoreFromOcr = () => {
    if (!receipt?.ocr_raw) return;
    const result = (receipt.ocr_raw as Record<string, unknown>)._result as Record<string, unknown> | undefined;
    if (!result) return;

    Alert.alert(
      'Tilbakestill til OCR-data',
      'Dette overskriver dine endringer med de opprinnelige verdiene fra skanningen.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Tilbakestill',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateReceipt(id!, {
                shop_name: result.shop_name as string,
                product_name: result.product_name as string,
                amount: Number(result.amount),
                purchase_date: result.purchase_date as string,
                receipt_type: result.receipt_type as string,
                warranty_until: (result.warranty_until as string | null) ?? null,
                return_until: (result.return_until as string | null) ?? null,
                expiry_date: (result.expiry_date as string | null) ?? null,
                gift_card_balance: result.gift_card_balance ? Number(result.gift_card_balance) : null,
              });
              queryClient.invalidateQueries({ queryKey: ['receipt', id, user?.id] });
              queryClient.invalidateQueries({ queryKey: ['receipts'] });
              Toast.show({ type: 'success', text1: 'Tilbakestilt til OCR-data' });
            } catch {
              Toast.show({ type: 'error', text1: 'Tilbakestilling feilet' });
            }
          },
        },
      ],
    );
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

  // Legal section varies by receipt type
  const legalTitle =
    receipt.type === 'gift_card' ? 'Gyldighetstid' :
    receipt.type === 'return_slip' ? 'Byttefrist' :
    receipt.warranty_until ? 'Reklamasjon og bytterett' : 'Forbrukerrett';

  const legalText = receipt.warranty_reasoning ?? (
    receipt.type === 'gift_card'
      ? 'Gavekortet kan benyttes frem til utløpsdatoen.'
      : receipt.type === 'return_slip'
      ? 'Tilgodeseddelen kan benyttes frem til utløpsdatoen.'
      : receipt.warranty_until
      ? 'Reklamasjonsretten er beregnet etter norsk forbrukerkjøpslov. 2 år standard, 5 år for varige forbruksgjenstand.'
      : 'Forbrukerrettigheter gjelder etter norsk forbrukerkjøpslov.'
  );

  const hasOcrRaw = !!receipt.ocr_raw;

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

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Receipt image — tap to zoom */}
        {receipt.image_url && !imageError ? (
          <Pressable onPress={() => setImageZoomVisible(true)}>
            <Image
              source={{ uri: receipt.image_url }}
              style={{ width: '100%', height: 220 }}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </Pressable>
        ) : (
          <View className="w-full h-32 bg-muted dark:bg-slate-800 items-center justify-center">
            <FileText size={40} color="#94A3B8" />
          </View>
        )}

        <View className="px-6 pt-6">
          {/* Shop name (editable) */}
          <TouchableOpacity
            onPress={() => openEdit('shop_name', 'Butikk', 'text', receipt.shop_name)}
            className="flex-row items-start justify-between mb-1"
            activeOpacity={0.75}
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-foreground dark:text-slate-100">
                  {receipt.shop_name}
                </Text>
                <Pencil size={14} color="#94A3B8" />
              </View>
              {receipt.product_name ? (
                <TouchableOpacity
                  onPress={() => openEdit('product_name', 'Produkt', 'text', receipt.product_name)}
                  className="flex-row items-center gap-1 mt-1"
                >
                  <Text className="text-muted-foreground dark:text-slate-400">
                    {receipt.product_name}
                  </Text>
                  <Pencil size={11} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => openEdit('receipt_type', 'Type', 'segmented', receipt.type, RECEIPT_TYPE_OPTIONS)}
              className="bg-primary/10 rounded-lg px-3 py-1.5 flex-row items-center gap-1"
            >
              <Text className="text-primary text-sm font-medium">
                {typeLabels[receipt.type] ?? 'Kvittering'}
              </Text>
              <Pencil size={10} color="#6366F1" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Status */}
          <Text className={`text-sm font-medium mt-2 ${statusColors[status] ?? 'text-foreground'}`}>
            {statusLabels[status] ?? status}
          </Text>

          {/* Amount (editable) */}
          {receipt.amount > 0 || true ? (
            <TouchableOpacity
              onPress={() => openEdit('amount', 'Beløp (kr)', 'numeric', String(receipt.amount))}
              className="flex-row items-center gap-2 mt-4"
            >
              <Text className="text-3xl font-bold text-foreground dark:text-slate-100">
                {receipt.amount > 0 ? `${receipt.amount.toFixed(0)} kr` : '— kr'}
              </Text>
              <Pencil size={14} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}

          {/* Gift card remaining balance */}
          {receipt.type === 'gift_card' && (
            <TouchableOpacity
              onPress={() => openEdit('gift_card_balance', 'Gjenstående saldo (kr)', 'numeric', String(receipt.remaining_value ?? ''))}
              className="mt-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-800"
              activeOpacity={0.75}
            >
              <Text className="text-muted-foreground dark:text-slate-400 text-sm">Gjenstående saldo</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-2xl font-bold text-foreground dark:text-slate-100">
                  {receipt.remaining_value !== undefined ? `${receipt.remaining_value} kr` : 'Ukjent'}
                </Text>
                <Pencil size={14} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          )}

          {/* Editable detail rows */}
          <View className="mt-6 bg-card dark:bg-slate-800 rounded-2xl px-4 border border-border dark:border-slate-700">
            <EditableRow
              label="Kjøpsdato"
              value={formatDate(receipt.purchase_date)}
              onEdit={() => openEdit('purchase_date', 'Kjøpsdato', 'date', receipt.purchase_date?.split('T')[0] ?? '')}
            />
            <EditableRow
              label="Garanti til"
              value={formatDate(receipt.warranty_until)}
              onEdit={() => openEdit('warranty_until', 'Garanti til', 'date', receipt.warranty_until ?? '')}
            />
            <EditableRow
              label="Returrett til"
              value={formatDate(receipt.return_until)}
              onEdit={() => openEdit('return_until', 'Returrett til', 'date', receipt.return_until ?? '')}
            />
            {receipt.type === 'gift_card' && (
              <EditableRow
                label="Utløper"
                value={formatDate(receipt.expiry_date)}
                onEdit={() => openEdit('expiry_date', 'Utløpsdato', 'date', receipt.expiry_date ?? '')}
              />
            )}
          </View>

          {/* Legal / warranty reasoning section — dynamic per receipt type */}
          <View className="mt-4 bg-muted dark:bg-slate-800 rounded-xl p-4 gap-1.5">
            <View className="flex-row items-center gap-2 mb-1">
              <Scale size={14} color="#6B7280" />
              <Text className="text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
                {legalTitle}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground dark:text-slate-400 leading-5">
              {legalText}
            </Text>
            <Text className="text-xs text-muted-foreground/60 dark:text-slate-500 leading-5 mt-0.5">
              Kvittr er ikke juridisk rådgivning.
            </Text>
          </View>

          {/* Processing indicator */}
          {receipt.processing_status === 'pending' && (
            <View className="mt-4 bg-primary/10 rounded-xl p-4 flex-row items-center gap-3">
              <ActivityIndicator size="small" color="#6366F1" />
              <Text className="text-primary text-sm">Analyserer kvittering…</Text>
            </View>
          )}

          {/* Restore from OCR button */}
          {hasOcrRaw && (
            <TouchableOpacity
              onPress={handleRestoreFromOcr}
              className="mt-4 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-border dark:border-slate-600"
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color="#94A3B8" />
              <Text className="text-muted-foreground dark:text-slate-400 text-sm">
                Tilbakestill til OCR-data
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit field modal */}
      <EditFieldModal
        visible={editModal.visible}
        title={editModal.title}
        fieldType={editModal.fieldType}
        value={editModal.value}
        segmentOptions={editModal.segmentOptions}
        onClose={() => setEditModal((prev) => ({ ...prev, visible: false }))}
        onSave={handleSave}
      />

      {/* Full-screen image zoom modal */}
      <Modal
        visible={imageZoomVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImageZoomVisible(false)}
      >
        {/* Outer view so X button sits OUTSIDE GestureDetector and always receives touches */}
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <GestureDetector gesture={dismissGesture}>
            <Animated.View style={[{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }, dismissAnimStyle]}>
              {/* Pinch-to-zoom via ScrollView.maximumZoomScale (iOS native) */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                maximumZoomScale={5}
                minimumZoomScale={1}
                bouncesZoom
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: receipt.image_url }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5 }}
                  resizeMode="contain"
                />
              </ScrollView>
            </Animated.View>
          </GestureDetector>

          {/* Close button — outside GestureDetector so Pan gesture can't eat the touch */}
          <TouchableOpacity
            onPress={() => setImageZoomVisible(false)}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              right: 16,
              zIndex: 20,
              padding: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
            }}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
