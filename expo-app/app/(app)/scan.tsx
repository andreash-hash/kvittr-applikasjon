import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Camera, Image as ImageIcon, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { checkScanLimit, incrementScanCount } from '@/lib/scanLimit';
import { canGuestScan } from '@/lib/guestStorage';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useHaptics } from '@/hooks/useHaptics';

type ScanState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export default function ScanScreen() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { notification } = useHaptics();
  const queryClient = useQueryClient();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  // Holds a realtime channel so we can clean it up on unmount or retry.
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    return () => {
      realtimeChannel.current?.unsubscribe();
    };
  }, []);

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
    // Safety-net realtime subscription. The Gemini function is synchronous and
    // returns the final status, but if the connection drops mid-flight this
    // subscription catches the DB update so the UI stays responsive.
    realtimeChannel.current?.unsubscribe();

    const channel = supabase
      .channel(`receipt-status-${receiptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `id=eq.${receiptId}`,
        },
        (payload) => {
          const status = (payload.new as { processing_status?: string }).processing_status;
          if (status === 'completed') {
            channel.unsubscribe();
            queryClient.invalidateQueries({ queryKey: ['receipts'] });
            setScanState('done');
            notification('success');
            Toast.show({ type: 'success', text1: 'Kvittering analysert!' });
            setTimeout(() => router.replace(`/(app)/item/${receiptId}`), 1000);
          } else if (status === 'failed') {
            channel.unsubscribe();
            setScanState('error');
            notification('error');
            Toast.show({ type: 'error', text1: 'Analyse feilet', text2: 'Prøv igjen.' });
          }
        },
      )
      .subscribe();

    realtimeChannel.current = channel;
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
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

      setScanState('processing');

      // Invoke OCR function. It creates the receipt row, calls Gemini, and
      // returns { receipt_id, status } synchronously when OCR finishes.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'process-receipt-ocr',
        { body: { image_url: urlData.publicUrl, user_id: user.id } },
      );

      const receiptId = (fnData as { receipt_id?: string } | null)?.receipt_id;
      const ocrStatus = (fnData as { status?: string } | null)?.status;

      // Subscribe to realtime in case we need it (network hiccup, etc.)
      if (receiptId) subscribeToReceipt(receiptId);

      if (fnError) throw fnError;
      if (ocrStatus === 'failed') throw new Error('OCR processing failed');

      // Happy path — function returned 'completed' synchronously.
      realtimeChannel.current?.unsubscribe();
      realtimeChannel.current = null;

      await incrementScanCount(user.id);
      await queryClient.invalidateQueries({ queryKey: ['receipts'] });

      setScanState('done');
      notification('success');
      Toast.show({ type: 'success', text1: 'Kvittering analysert!' });

      setTimeout(() => {
        if (receiptId) {
          router.replace(`/(app)/item/${receiptId}`);
        } else {
          router.replace('/(app)/dashboard');
        }
      }, 1000);
    } catch (err) {
      // If we have a realtime subscription running, let it handle recovery.
      // Otherwise show the error immediately.
      if (!realtimeChannel.current) {
        setScanState('error');
        notification('error');
        Toast.show({ type: 'error', text1: 'Analyse feilet', text2: 'Prøv igjen.' });
      }
    }
  };

  const reset = () => {
    realtimeChannel.current?.unsubscribe();
    realtimeChannel.current = null;
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

  const isProcessing = scanState === 'uploading' || scanState === 'processing';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pb-8">
          <Text className="text-2xl font-bold text-foreground mt-6 mb-2">Skann kvittering</Text>
          <Text className="text-muted-foreground mb-8">
            Ta bilde av kvitteringen din. Kvittr leser ut all informasjon automatisk.
          </Text>

          {imageUri && (
            <View className="rounded-2xl overflow-hidden mb-6 bg-muted" style={{ height: 220 }}>
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
              <Text className="text-foreground font-medium mt-4">
                {scanState === 'uploading' ? 'Laster opp bilde…' : 'Analyserer kvittering…'}
              </Text>
              <Text className="text-muted-foreground text-sm mt-2 text-center">
                Dette kan ta noen sekunder
              </Text>
            </View>
          ) : scanState === 'done' ? (
            <View className="items-center py-12">
              <Text style={{ fontSize: 60 }}>✅</Text>
              <Text className="text-xl font-bold text-foreground mt-4">Ferdig!</Text>
            </View>
          ) : scanState === 'error' ? (
            <View className="items-center py-12 gap-4">
              <Text style={{ fontSize: 60 }}>❌</Text>
              <Text className="text-xl font-bold text-foreground">Analyse feilet</Text>
              <Text className="text-muted-foreground text-center">
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
                className="bg-card border border-border rounded-2xl p-6 items-center gap-3"
                activeOpacity={0.8}
              >
                <ImageIcon size={40} color="#6366F1" />
                <Text className="text-foreground text-lg font-semibold">Velg fra galleri</Text>
                <Text className="text-muted-foreground text-sm text-center">
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
              <Text style={{ fontSize: 28 }}>👑</Text>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">Kvittr Premium</Text>
                <Text className="text-muted-foreground text-sm">Ubegrenset skanning og mer</Text>
              </View>
              <Text className="text-primary text-sm font-medium">Se mer →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
