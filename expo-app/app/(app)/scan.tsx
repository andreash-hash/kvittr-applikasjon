import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Camera, Image as ImageIcon, RefreshCw, CheckCircle, XCircle, Crown } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { checkScanLimit, incrementScanCount } from '@/lib/scanLimit';
import { canGuestScan } from '@/lib/guestStorage';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useHaptics } from '@/hooks/useHaptics';

type ScanState = 'idle' | 'uploading' | 'processing' | 'waiting' | 'done' | 'error';

const OCR_TIMEOUT_MS = 45_000;
const FUNCTION_TIMEOUT_MS = 30_000;

// Compress + resize image before upload: reduces 5 MB camera photo → ~300 KB,
// making base64 conversion fast and upload quick without hurting OCR quality.
async function prepareImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function ScanScreen() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { notification } = useHaptics();
  const queryClient = useQueryClient();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ocrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      realtimeChannel.current?.unsubscribe();
      if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    };
  }, []);

  const finishSuccess = (id: string | null) => {
    if (ocrTimeoutRef.current) {
      clearTimeout(ocrTimeoutRef.current);
      ocrTimeoutRef.current = null;
    }
    realtimeChannel.current?.unsubscribe();
    realtimeChannel.current = null;
    setScanState('done');
    notification('success');
    Toast.show({ type: 'success', text1: 'Kvittering analysert!' });
    setTimeout(() => {
      if (id) {
        router.replace(`/(app)/item/${id}`);
      } else {
        router.replace('/(app)/dashboard');
      }
    }, 800);
  };

  const finishError = (msg?: string) => {
    if (ocrTimeoutRef.current) {
      clearTimeout(ocrTimeoutRef.current);
      ocrTimeoutRef.current = null;
    }
    realtimeChannel.current?.unsubscribe();
    realtimeChannel.current = null;
    setScanState('error');
    notification('error');
    Toast.show({ type: 'error', text1: 'Analyse feilet', text2: msg ?? 'Prøv igjen.' });
  };

  const checkCanScan = async (): Promise<boolean> => {
    if (isPremium) return true;
    if (isAuthenticated && user) {
      const canScan = await checkScanLimit(user.id);
      if (!canScan) {
        router.push('/(app)/premium');
        return false;
      }
    } else {
      const canScan = await canGuestScan();
      if (!canScan) {
        Toast.show({
          type: 'info',
          text1: 'Gratis grense nådd',
          text2: 'Logg inn eller oppgrader for ubegrenset skanning.',
        });
        router.push('/(auth)/login');
        return false;
      }
    }
    return true;
  };

  const subscribeToReceipt = (receiptId: string) => {
    realtimeChannel.current?.unsubscribe();

    const channel = supabase
      .channel(`receipt-ocr-${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `id=eq.${receiptId}`,
        },
        (payload) => {
          const ps = (payload.new as { processing_status?: string }).processing_status;
          if (ps === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            finishSuccess(receiptId);
          } else if (ps === 'failed') {
            finishError('OCR-analyse feilet på serveren.');
          }
        },
      )
      .subscribe();

    realtimeChannel.current = channel;

    // Safety timeout: navigate after OCR_TIMEOUT_MS regardless
    ocrTimeoutRef.current = setTimeout(() => {
      if (realtimeChannel.current) {
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        finishSuccess(receiptId);
      }
    }, OCR_TIMEOUT_MS);
  };

  const processImage = async (uri: string) => {
    if (!isAuthenticated || !user) {
      Toast.show({
        type: 'info',
        text1: 'Logg inn for å skanne',
        text2: 'Du må logge inn for å lagre kvitteringer.',
      });
      return;
    }

    setScanState('uploading');
    setImageUri(uri);

    try {
      // Step 1: compress + resize (5 MB camera → ~300 KB, keeps OCR quality)
      const compressedUri = await prepareImage(uri);
      setImageUri(compressedUri);

      // Step 2: read as base64 via FileSystem (reliable on iOS for local URIs)
      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = base64ToUint8Array(base64);

      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, bytes, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

      setScanState('processing');

      // Step 3: call edge function with 30 s hard timeout via AbortController
      const abortCtrl = new AbortController();
      const fnTimeoutId = setTimeout(() => abortCtrl.abort(), FUNCTION_TIMEOUT_MS);
      let fnData: unknown;
      let fnError: unknown;
      try {
        const result = await supabase.functions.invoke('process-receipt-ocr', {
          body: { image_url: urlData.publicUrl, user_id: user.id },
          signal: abortCtrl.signal,
        });
        fnData = result.data;
        fnError = result.error;
      } finally {
        clearTimeout(fnTimeoutId);
      }

      if (fnError) throw fnError as Error;

      const receiptId = (fnData as { receipt_id?: string } | null)?.receipt_id ?? null;
      const ocrStatus = (fnData as { status?: string } | null)?.status;

      if (ocrStatus === 'failed') throw new Error('OCR returnerte feil fra serveren');

      await incrementScanCount(user.id);

      if (ocrStatus === 'completed' || !receiptId) {
        // Edge function processed synchronously — navigate immediately
        await queryClient.invalidateQueries({ queryKey: ['receipts'] });
        finishSuccess(receiptId);
        return;
      }

      // Edge function is async — wait for realtime update on processing_status
      setScanState('waiting');
      subscribeToReceipt(receiptId);

    } catch (err) {
      const msg = err instanceof Error ? err.message : undefined;
      finishError(msg);
    }
  };

  const reset = () => {
    realtimeChannel.current?.unsubscribe();
    realtimeChannel.current = null;
    if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    ocrTimeoutRef.current = null;
    setScanState('idle');
    setImageUri(null);
  };

  const pickFromCamera = async () => {
    if (!(await checkCanScan())) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Kameratilgang er påkrevd' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    if (!(await checkCanScan())) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Bildegalleri-tilgang er påkrevd' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const isProcessing =
    scanState === 'uploading' || scanState === 'processing' || scanState === 'waiting';

  const processingLabel =
    scanState === 'uploading'
      ? 'Laster opp bilde…'
      : scanState === 'processing'
        ? 'Sender til analyse…'
        : 'Leser kvittering…';

  const processingSubLabel =
    scanState === 'waiting'
      ? 'Henter ut dato, beløp og butikk automatisk'
      : 'Dette kan ta noen sekunder';

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pb-8">
          <Text className="text-2xl font-bold text-foreground dark:text-slate-100 mt-6 mb-2">
            Skann kvittering
          </Text>
          <Text className="text-muted-foreground dark:text-slate-400 mb-8">
            Ta bilde av kvitteringen din. Kvittr leser ut all informasjon automatisk.
          </Text>

          {imageUri && (
            <View className="rounded-2xl overflow-hidden mb-6 bg-muted dark:bg-slate-800" style={{ height: 220 }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          )}

          {isProcessing ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#6366F1" />
              <Text className="text-foreground dark:text-slate-100 font-medium mt-4 text-center">
                {processingLabel}
              </Text>
              <Text className="text-muted-foreground dark:text-slate-400 text-sm mt-2 text-center">
                {processingSubLabel}
              </Text>
            </View>
          ) : scanState === 'done' ? (
            <View className="items-center py-12">
              <CheckCircle size={64} color="#10B981" />
              <Text className="text-xl font-bold text-foreground dark:text-slate-100 mt-4">Ferdig!</Text>
            </View>
          ) : scanState === 'error' ? (
            <View className="items-center py-12 gap-4">
              <XCircle size={64} color="#EF4444" />
              <Text className="text-xl font-bold text-foreground dark:text-slate-100">Analyse feilet</Text>
              <Text className="text-muted-foreground dark:text-slate-400 text-center">
                Vi klarte ikke å lese kvitteringen. Prøv igjen med et klarere bilde.
              </Text>
              <Button onPress={reset} variant="outline" className="mt-2">
                <RefreshCw size={16} color="#6366F1" />
                {' '}Prøv igjen
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <TouchableOpacity
                onPress={pickFromCamera}
                className="bg-primary rounded-2xl p-6 items-center gap-3"
                activeOpacity={0.8}
              >
                <Camera size={40} color="#fff" />
                <Text className="text-white text-lg font-semibold">Ta bilde</Text>
                <Text className="text-white/70 text-sm text-center">
                  Bruk kameraet til å fotografere kvitteringen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickFromLibrary}
                className="bg-card dark:bg-slate-800 border border-border dark:border-slate-700 rounded-2xl p-6 items-center gap-3"
                activeOpacity={0.8}
              >
                <ImageIcon size={40} color="#6366F1" />
                <Text className="text-foreground dark:text-slate-100 text-lg font-semibold">Velg fra galleri</Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-sm text-center">
                  Velg et eksisterende bilde fra telefonens galleri
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPremium && scanState === 'idle' && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/premium')}
              className="mt-8 bg-primary/10 rounded-2xl p-4 flex-row items-center gap-3"
            >
              <Crown size={28} color="#6366F1" />
              <View className="flex-1">
                <Text className="text-foreground dark:text-slate-100 font-semibold">Kvittr Premium</Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-sm">Ubegrenset skanning og mer</Text>
              </View>
              <Text className="text-primary text-sm font-medium">Se mer →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
