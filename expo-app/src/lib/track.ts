// Fire-and-forget funnel events, written to public.app_events.
//
// The profiles table cannot answer "where do people drop off", because it only
// holds the end state. These events can. Tracking must never break or slow the
// app, so every failure is swallowed and nothing here is awaited by callers.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type TrackEvent =
  | 'scan_prompt_shown'
  | 'scan_prompt_accepted'
  | 'scan_prompt_dismissed'
  | 'scan_started'
  | 'scan_succeeded'
  | 'scan_failed'
  | 'signup_prompt_shown'
  | 'signup_completed'
  | 'paywall_shown'
  | 'purchase_completed';

const INSTALL_ID_KEY = 'kvittr_install_id';
let installIdPromise: Promise<string> | null = null;

function newInstallId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable per-install id, so events before a session exists can still be linked. */
function getInstallId(): Promise<string> {
  if (!installIdPromise) {
    installIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
        if (existing) return existing;
        const created = newInstallId();
        await AsyncStorage.setItem(INSTALL_ID_KEY, created);
        return created;
      } catch {
        return newInstallId();
      }
    })();
  }
  return installIdPromise;
}

// public.app_events is not part of the generated Database type, so the insert
// goes through a narrow structural cast instead of `any`.
type EventsClient = {
  from: (table: string) => { insert: (row: Record<string, unknown>) => PromiseLike<unknown> };
};

export function track(event: TrackEvent, props: Record<string, unknown> = {}): void {
  void (async () => {
    try {
      const installId = await getInstallId();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await (supabase as unknown as EventsClient).from('app_events').insert({
        user_id: session?.user?.id ?? null,
        event,
        props: { ...props, install_id: installId, platform: Platform.OS },
      });
    } catch {
      // Never surface tracking failures.
    }
  })();
}
