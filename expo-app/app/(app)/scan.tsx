import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Camera, Image as ImageIcon, RefreshCw, CheckCircle, XCircle, Crown, PencilLine } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { checkScanLimit, incrementScanCount } from '@/lib/scanLimit';
import { canGuestScan, saveGuestReceipt } from '@/lib/guestStorage';
import { prepareImage, uploadReceiptImage } from '@/lib/receiptUpload';
import { persistGuestImage } from '@/lib/guestImage';
import { ScanWalkthrough } from '@/components/ScanWalkthrough';
import { hasSeenScanWalkthrough, markScanWalkthroughSeen } from '@/lib/scanWalkthroughState';
import { ensureScanSession } from '@/lib/session';
import { parseOcrError, failure, type OcrFailure } from '@/lib/ocrErrors';
import { markScanPromptCompleted } from '@/lib/scanPromptState';
import { track } from '@/lib/track';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useHaptics } from '@/hooks/useHaptics';
import { debugLog } from '@/lib/debugLog';
import type { GuestReceipt } from '@/types/receipt';

type ScanState = 'idle' | 'uploading' | 'processing' | 'waiting' | 'done' | 'error';

/** What is needed to run OCR again on an image that is already uploaded. */
interface OcrAttempt {
  imageUrl: string;
  receiptId: string | null;
  userId: string;
}

const OCR_TIMEOUT_MS = 45_000;
const FUNCTION_TIMEOUT_MS = 30_000;

export default function ScanScreen() {
  const { isPremium } = usePremiumStatus();
  const { autostart } = useLocalSearchParams<{ autostart?: string }>();
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { notification } = useHaptics();
  const queryClient = useQueryClient();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [failureInfo, setFailureInfo] = useState<OcrFailure | null>(null);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ocrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanStateRef = useRef<ScanState>('idle');
  const lastAttemptRef = useRef<OcrAttempt | null>(null);
  // A retry after a timeout must not charge the free quota a second time.
  const countedReceiptsRef = useRef<Set<string>>(new Set());
  const autostartedRef = useRef(false);
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  useFocusEffect(
    useCallback(() => {
      if (scanStateRef.current === 'done' || scanStateRef.current === 'error') {
        realtimeChannel.current?.unsubscribe();
        realtimeChannel.current = null;
        if (ocrTimeoutRef.current) {
          clearTimeout(ocrTimeoutRef.current);
          ocrTimeoutRef.current = null;
        }
        setScanState('idle');
        setImageUri(null);
        setFailureInfo(null);
        lastAttemptRef.current = null;
      }
    }, []),
  );

  useEffect(() => {
    return () => {
      realtimeChannel.current?.unsubscribe();
      if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    };
  }, []);

  // Coach the very first scan, unless the user just said "Skann nå": they have
  // already decided, and the camera opens straight away.
  useEffect(() => {
    if (autostart || autostartedRef.current) return;
    let cancelled = false;
    hasSeenScanWalkthrough().then((seen) => {
      if (!cancelled && !seen) setShowWalkthrough(true);
    });
    return () => { cancelled = true; };
  }, [autostart]);

  // "Skann nå" on the first screen lands here with autostart=camera.
  useEffect(() => {
    if (autostart !== 'camera' || autostartedRef.current) return;
    autostartedRef.current = true;
    markScanWalkthroughSeen().catch(() => null);
    router.setParams({ autostart: undefined });
    pickFromCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  const clearWaiting = () => {
    if (ocrTimeoutRef.current) {
      clearTimeout(ocrTimeoutRef.current);
      ocrTimeoutRef.current = null;
    }
    realtimeChannel.current?.unsubscribe();
    realtimeChannel.current = null;
  };

  const finishSuccess = (id: string | null) => {
    debugLog('scan: finishSuccess', { receiptId: id });
    clearWaiting();
    lastAttemptRef.current = null;
    setScanState('done');
    notification('success');
    track('scan_succeeded');
    markScanPromptCompleted().catch(() => null);
    // The result screen is the payoff: it shows the warranty date the user came for.
    setTimeout(() => {
      if (id) {
        router.replace(`/(app)/scan-result?id=${id}`);
      } else {
        router.replace('/(app)/dashboard');
      }
    }, 500);
  };

  const finishError = (info: OcrFailure) => {
    debugLog('scan: finishError', { kind: info.kind, code: info.code, receiptId: info.receiptId });
    clearWaiting();
    // Keep the receipt id so retry and manual entry can reuse the same row.
    if (info.receiptId && lastAttemptRef.current) {
      lastAttemptRef.current = { ...lastAttemptRef.current, receiptId: info.receiptId };
    }
    setFailureInfo(info);
    setScanState('error');
    notification('error');
    track('scan_failed', { kind: info.kind, code: info.code ?? null });
    Toast.show({ type: 'error', text1: 'Analyse feilet', text2: info.message });
  };

  const checkCanScan = async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      if (isPremium) return true;
      const status = await checkScanLimit(session.user.id, !!session.user.is_anonymous);
      if (status.canScan) return true;

      if (status.blockedReason === 'needs_account') {
        track('signup_prompt_shown', { source: 'scan_limit' });
        Toast.show({
          type: 'info',
          text1: 'Du har brukt din gratis skanning',
          text2: 'Lag en gratis konto for å skanne én til.',
        });
        router.push('/(auth)/signup');
      } else {
        track('paywall_shown', { source: 'scan_limit' });
        router.push('/(app)/premium');
      }
      return false;
    }

    // No session yet: a new install may scan. Only the legacy local-guest
    // counter can say no here (an old install that already used its guest scan).
    if (!(await canGuestScan())) {
      track('signup_prompt_shown', { source: 'legacy_guest_limit' });
      Toast.show({
        type: 'info',
        text1: 'Du har brukt din gratis skanning',
        text2: 'Opprett gratis konto for én til.',
      });
      router.push('/(auth)/signup');
      return false;
    }
    return true;
  };

  const subscribeToReceipt = (receiptId: string) => {
    debugLog('scan: subscribeToReceipt (waiting for realtime)', { receiptId });
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
          debugLog('scan: realtime update', { receiptId, processing_status: ps });
          if (ps === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            finishSuccess(receiptId);
          } else if (ps === 'failed') {
            finishError(failure('unreadable', { receiptId }));
          }
        },
      )
      .subscribe();

    realtimeChannel.current = channel;

    // If the realtime event never arrives, look at the row once. Treating a
    // timeout as success would send the user to an empty receipt.
    ocrTimeoutRef.current = setTimeout(async () => {
      debugLog('scan: OCR timeout fired — checking row', { receiptId });
      const { data } = await supabase
        .from('receipts')
        .select('processing_status')
        .eq('id', receiptId)
        .single();
      if (data?.processing_status === 'completed') {
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        finishSuccess(receiptId);
      } else {
        finishError(failure('timeout', { receiptId }));
      }
    }, OCR_TIMEOUT_MS);
  };

  /** Runs OCR on an image that is already uploaded. Safe to call again for a retry. */
  const runOcr = async (imageUrl: string, receiptId: string | null, userId: string) => {
    lastAttemptRef.current = { imageUrl, receiptId, userId };
    setScanState('processing');
    debugLog('scan: invoking OCR edge function', { userId, retry: !!receiptId });

    const abortCtrl = new AbortController();
    const fnTimeoutId = setTimeout(() => {
      debugLog('scan: edge function timeout — aborting');
      abortCtrl.abort();
    }, FUNCTION_TIMEOUT_MS);

    let fnData: unknown;
    let fnError: unknown;
    try {
      const result = await supabase.functions.invoke('process-receipt-ocr', {
        body: { image_url: imageUrl, user_id: userId, ...(receiptId ? { receipt_id: receiptId } : {}) },
        signal: abortCtrl.signal,
      });
      fnData = result.data;
      fnError = result.error;
    } catch (thrown) {
      fnError = thrown;
    } finally {
      clearTimeout(fnTimeoutId);
    }

    debugLog('scan: OCR edge function returned', {
      fnData: JSON.stringify(fnData)?.slice(0, 200),
      hasError: !!fnError,
    });

    if (fnError) {
      finishError(await parseOcrError(fnError));
      return;
    }

    const newReceiptId = (fnData as { receipt_id?: string } | null)?.receipt_id ?? receiptId;
    const ocrStatus = (fnData as { status?: string } | null)?.status;
    debugLog('scan: OCR result parsed', { receiptId: newReceiptId, ocrStatus });

    if (ocrStatus === 'failed') {
      finishError(failure('unreadable', { receiptId: newReceiptId }));
      return;
    }

    if (lastAttemptRef.current) {
      lastAttemptRef.current = { ...lastAttemptRef.current, receiptId: newReceiptId };
    }

    // Only a successful analysis uses up a free scan, and only once per receipt.
    if (!newReceiptId || !countedReceiptsRef.current.has(newReceiptId)) {
      await incrementScanCount(userId);
      if (newReceiptId) countedReceiptsRef.current.add(newReceiptId);
      debugLog('scan: scan count incremented');
    }

    if (ocrStatus === 'completed' || !newReceiptId) {
      await queryClient.invalidateQueries({ queryKey: ['receipts'] });
      finishSuccess(newReceiptId);
      return;
    }

    debugLog('scan: entering waiting state', { receiptId: newReceiptId });
    setScanState('waiting');
    subscribeToReceipt(newReceiptId);
  };

  /**
   * Fallback for when anonymous sign-in is unavailable: keep the image on the
   * device and analyse it after signup. This is how every guest scan used to work.
   */
  const saveGuestLocally = async (uri: string) => {
    debugLog('scan: anonymous sign-in unavailable — saving locally');
    setScanState('uploading');
    setImageUri(uri);
    try {
      const compressedUri = await persistGuestImage(await prepareImage(uri));
      setImageUri(compressedUri);
      const guestReceipt: GuestReceipt = {
        id: `guest-${Date.now()}`,
        type: 'receipt',
        shop_name: '',
        product_name: '',
        amount: 0,
        purchase_date: new Date().toISOString(),
        image_url: compressedUri,
        status: 'active',
        processing_status: 'local',
        created_at: new Date().toISOString(),
      };
      await saveGuestReceipt(guestReceipt);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setScanState('done');
      notification('success');
      Toast.show({ type: 'success', text1: 'Kvittering lagret!' });
      markScanPromptCompleted().catch(() => null);
      setTimeout(() => {
        Alert.alert(
          'Fint! Nå er kvitteringen trygg',
          'Opprett gratis konto, så leser vi av butikk, beløp og garantitid automatisk – og du får én skanning til.',
          [
            {
              text: 'Senere',
              style: 'cancel',
              onPress: () => router.replace('/(app)/dashboard'),
            },
            {
              text: 'Opprett konto',
              onPress: () => router.replace('/(auth)/signup'),
            },
          ],
        );
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      debugLog('scan: guest save error', { msg });
      finishError(failure('unknown', { message: msg }));
    }
  };

  const processImage = async (uri: string) => {
    track('scan_started');
    setFailureInfo(null);
    setScanState('uploading');
    setImageUri(uri);

    try {
      // New users have no account yet. Sign them in anonymously so the scan
      // runs through the same OCR pipeline as everyone else's.
      const scanSession = await ensureScanSession();
      if (!scanSession) {
        await saveGuestLocally(uri);
        return;
      }
      const { userId } = scanSession;
      debugLog('scan: session ready', { userId, anonymous: scanSession.isAnonymous });

      const compressedUri = await prepareImage(uri);
      setImageUri(compressedUri);
      debugLog('scan: image compressed', { compressedUri: compressedUri.slice(0, 80) });

      debugLog('scan: upload start', { bucket: 'receipts' });
      const publicUrl = await uploadReceiptImage(userId, compressedUri);
      debugLog('scan: upload done', { publicUrl: publicUrl.slice(0, 80) });

      await runOcr(publicUrl, null, userId);
    } catch (err: unknown) {
      debugLog('scan: UNCAUGHT ERROR', {
        msg: err instanceof Error ? err.message : String(err),
        name: (err as { name?: string })?.name,
      });
      finishError(await parseOcrError(err));
    }
  };

  const reset = () => {
    clearWaiting();
    lastAttemptRef.current = null;
    setScanState('idle');
    setImageUri(null);
    setFailureInfo(null);
    debugLog('scan: reset to idle');
  };

  const retry = async () => {
    const attempt = lastAttemptRef.current;
    if (!attempt) {
      reset();
      return;
    }
    // Same uploaded image, same receipt row, no new quota check: the first
    // attempt already passed it and a failed attempt costs nothing.
    setFailureInfo(null);
    track('scan_started', { retry: true });
    await runOcr(attempt.imageUrl, attempt.receiptId, attempt.userId);
  };

  const enterManually = () => {
    const receiptId = failureInfo?.receiptId ?? lastAttemptRef.current?.receiptId ?? null;
    if (receiptId) {
      router.replace(`/(app)/item/${receiptId}`);
    } else {
      reset();
    }
  };

  const pickerFailure = (label: string, err: unknown): OcrFailure => {
    const msg = err instanceof Error ? err.message : String(err);
    debugLog(`scan: PICKER ERROR (${label})`, { msg });
    return failure('unknown', { message: `${label}: ${msg}` });
  };

  const pickFromCamera = async () => {
    debugLog('scan: pickFromCamera called');
    try {
      if (!(await checkCanScan())) {
        debugLog('scan: checkCanScan blocked camera pick');
        return;
      }

      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      debugLog('scan: camera permission', { status: permResult.status });
      if (permResult.status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Kameratilgang er påkrevd' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0].uri);
      } else {
        debugLog('scan: camera cancelled or no asset', { canceled: result.canceled });
      }
    } catch (err: unknown) {
      finishError(pickerFailure('Kamerafeil', err));
    }
  };

  const pickFromLibrary = async () => {
    debugLog('scan: pickFromLibrary called');
    try {
      if (!(await checkCanScan())) {
        debugLog('scan: checkCanScan blocked library pick');
        return;
      }

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      debugLog('scan: library permission', { status: permResult.status });
      if (permResult.status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Bildegalleri-tilgang er påkrevd' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImage(result.assets[0].uri);
      } else {
        debugLog('scan: gallery cancelled or no asset', { canceled: result.canceled });
      }
    } catch (err: unknown) {
      finishError(pickerFailure('Galleri-feil', err));
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
                {failureInfo?.message ?? 'Noe gikk galt under analysen. Prøv igjen.'}
              </Text>
              <Button onPress={retry} className="mt-2 self-stretch" accessibilityLabel="Prøv igjen">
                <RefreshCw size={16} color="#fff" />
                <Text className="text-white font-semibold ml-2">Prøv igjen</Text>
              </Button>
              {(failureInfo?.receiptId ?? lastAttemptRef.current?.receiptId) ? (
                <Button
                  onPress={enterManually}
                  variant="outline"
                  className="self-stretch"
                  accessibilityLabel="Skriv inn manuelt"
                >
                  <PencilLine size={16} color="#6366F1" />
                  <Text className="text-primary font-semibold ml-2">Skriv inn manuelt</Text>
                </Button>
              ) : null}
              <Button onPress={reset} variant="ghost" accessibilityLabel="Ta nytt bilde">
                Ta nytt bilde
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <TouchableOpacity
                onPress={pickFromCamera}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Ta bilde"
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
                accessible
                accessibilityRole="button"
                accessibilityLabel="Velg fra galleri"
                className="bg-card dark:bg-slate-800 border border-border dark:border-slate-700 rounded-2xl p-6 items-center gap-3"
                activeOpacity={0.8}
              >
                <ImageIcon size={40} color="#6366F1" />
                <Text className="text-foreground dark:text-slate-100 text-lg font-semibold">Velg fra galleri</Text>
                <Text className="text-muted-foreground dark:text-slate-400 text-sm text-center">
                  Velg et eksisterende bilde fra telefonens galleri
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowWalkthrough(true)} className="py-2">
                <Text className="text-muted-foreground dark:text-slate-400 text-sm text-center underline">
                  Hvordan skanner jeg?
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

      <ScanWalkthrough
        visible={showWalkthrough}
        onStart={() => {
          setShowWalkthrough(false);
          pickFromCamera();
        }}
        onDismiss={() => setShowWalkthrough(false)}
      />
    </SafeAreaView>
  );
}
