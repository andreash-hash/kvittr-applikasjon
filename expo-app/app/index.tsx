import React, { useEffect, useState, useRef } from 'react';
import { View, Animated } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Logo } from '@/components/Logo';
import { ScanNowPrompt } from '@/components/ScanNowPrompt';
import { supabase } from '@/lib/supabase';
import { getGuestScanCount } from '@/lib/guestStorage';
import {
  shouldShowScanPrompt,
  recordScanPromptDismissed,
  markScanPromptCompleted,
} from '@/lib/scanPromptState';
import { track } from '@/lib/track';

// Kept in sync for older code paths that still read it.
const ONBOARDING_KEY = 'kvittr_onboarding_completed';
const FADE_IN_MS  = 700;
const HOLD_MS     = 1200;
const FADE_OUT_MS = 600;

type Destination = 'dashboard' | 'scan-prompt';

export default function IndexScreen() {
  const [showScanPrompt, setShowScanPrompt] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // Hide native splash (solid dark bg, no image) and start our
    // JS fade-in simultaneously — seamless handoff.
    SplashScreen.hideAsync();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start();

    // Minimum display time: fade-in + hold
    const minTimePromise = new Promise<void>(resolve =>
      setTimeout(resolve, FADE_IN_MS + HOLD_MS),
    );

    // Decide where to go. Runs unconditionally before any routing so the
    // destination screen always starts with session state already resolved.
    const destinationPromise: Promise<Destination> = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!cancelled) setUserId(user?.id ?? null);

      // Already scanned, or dismissed the prompt twice: never show it again.
      if (!(await shouldShowScanPrompt())) return 'dashboard';

      // Older installs that scanned as a local guest have clearly used the app.
      if (!user && (await getGuestScanCount()) > 0) {
        await markScanPromptCompleted();
        return 'dashboard';
      }

      // A full account that already has scans does not need the nudge. Anonymous
      // users and accounts that never scanned still get it.
      if (user && !user.is_anonymous) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('scans_used_this_month')
          .eq('id', user.id)
          .single();
        if ((profile?.scans_used_this_month ?? 0) > 0) {
          await markScanPromptCompleted();
          return 'dashboard';
        }
      }

      return 'scan-prompt';
    })();

    // Wait for both: minimum display time AND the routing decision.
    Promise.all([minTimePromise, destinationPromise]).then(([, destination]) => {
      if (cancelled) return;

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        if (destination === 'scan-prompt') {
          setShowScanPrompt(true);
          track('scan_prompt_shown');
        } else {
          router.replace('/(app)/dashboard');
        }
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The scan prompt replaces the slide onboarding on cold start. Marking the
  // old flags keeps profiles.onboarding_completed and the legacy local key
  // consistent for anything that still reads them.
  const markOnboardingSeen = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      if (userId) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', userId);
      }
    } catch {
      // Non-fatal: the prompt state itself is tracked separately.
    }
  };

  const handleScanNow = async () => {
    track('scan_prompt_accepted');
    await markOnboardingSeen();
    setShowScanPrompt(false);
    router.replace({ pathname: '/(app)/scan', params: { autostart: 'camera' } });
  };

  const handleLater = async () => {
    track('scan_prompt_dismissed');
    await recordScanPromptDismissed();
    await markOnboardingSeen();
    setShowScanPrompt(false);
    router.replace('/(app)/dashboard');
  };

  // Rendered AFTER init resolves, not as an early return, so session state is
  // already settled when the prompt appears.
  if (showScanPrompt) {
    return <ScanNowPrompt onScanNow={handleScanNow} onLater={handleLater} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-slate-900">
      <Animated.View style={{ opacity: fadeAnim }}>
        <Logo size="splash" />
      </Animated.View>
    </View>
  );
}
