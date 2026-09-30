import { Platform } from 'react-native';
import { supabase } from './supabase';
import { debugLog } from './debugLog';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_HmmhscVDvicXCGtVkIrgWWqRyBB';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const initializeRevenueCat = async (userId?: string): Promise<boolean> => {
  try {
    const Purchases = (await import('react-native-purchases')).default;
    const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

    if (!apiKey) {
      console.error('### RC CONFIGURE: missing API key for', Platform.OS);
      return false;
    }

    console.log(`### RC CONFIGURE: apiKey=${apiKey.slice(0, 8)}... userId=${userId ?? 'anonymous'}`);
    await Purchases.configure({ apiKey, appUserID: userId });
    console.log(`### RC CONFIGURE: configure done userId=${userId ?? 'anonymous'}`);

    if (userId) {
      try {
        await Purchases.logIn(userId);
        console.log(`### RC CONFIGURE: logIn success userId=${userId}`);
      } catch (e: any) {
        // logIn after configure is a no-op if already logged in as same user
        console.log('### RC CONFIGURE: logIn note (may already be set):', e?.message);
      }
    }

    return true;
  } catch (error: any) {
    console.error('### RC CONFIGURE: init FAILED', JSON.stringify(error), error?.message);
    return false;
  }
};

// Syncs RC entitlements → Supabase profiles.subscription_tier/status.
// Called in THREE places: (1) paywall PURCHASED/RESTORED, (2) addCustomerInfoUpdateListener,
// (3) unconditionally at app launch if user is signed in.
// Safe to call with no userId — skips silently.
export const syncSubscriptionStatus = async (userId: string): Promise<void> => {
  if (!userId) {
    debugLog('sync: skipped', { reason: 'no userId' });
    return;
  }
  debugLog('sync: start', { userId, ts: Date.now() });
  try {
    const Purchases = (await import('react-native-purchases')).default;
    const customerInfo = await Purchases.getCustomerInfo();

    const activeEntitlements = customerInfo.entitlements.active;
    const entitlementKeys = Object.keys(activeEntitlements);
    const isPremium = entitlementKeys.length > 0;
    const activeEntry = Object.values(activeEntitlements)[0];
    const expirationDate = activeEntry?.expirationDate ?? null;

    debugLog('sync: RC customerInfo', {
      originalAppUserId: customerInfo.originalAppUserId,
      activeEntitlements: entitlementKeys,
      isPremium,
      expiresAt: expirationDate ?? 'null',
    });

    const updatePayload = {
      subscription_tier: isPremium ? 'premium' : 'free',
      subscription_status: isPremium ? 'active' : 'expired',
      subscription_started_at: isPremium ? new Date().toISOString() : null,
      subscription_expires_at: expirationDate,
    };

    debugLog('sync: writing Supabase', {
      userId,
      tier: updatePayload.subscription_tier,
      status: updatePayload.subscription_status,
    });

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);

    if (error) {
      debugLog('sync: Supabase FAILED', {
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
      });
    } else {
      debugLog('sync: Supabase OK', { userId, tier: updatePayload.subscription_tier });
    }
  } catch (error: any) {
    debugLog('sync: EXCEPTION', { userId, message: error?.message, full: JSON.stringify(error) });
  }
};

export const getOfferings = async () => {
  try {
    const Purchases = (await import('react-native-purchases')).default;
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  const Purchases = (await import('react-native-purchases')).default;
  const { customerInfo } = await Purchases.restorePurchases();
  return Object.keys(customerInfo.entitlements.active).length > 0;
};

// FIX: RevenueCatUI is a DEFAULT export — must use .default, not named destructuring.
// { RevenueCatUI } = import(...) always returns undefined because exports.default = RevenueCatUI.
// Returns the resolved PAYWALL_RESULT (PURCHASED / CANCELLED / NOT_PURCHASED / RESTORED).
// Only throws on real failures — cancellation resolves with CANCELLED, not an exception.
export const showPaywallUI = async (): Promise<unknown> => {
  const RevenueCatUI = (await import('react-native-purchases-ui')).default;
  console.log('### RC PAYWALL: presentPaywall start');
  const result = await RevenueCatUI.presentPaywall();
  console.log('### RC PAYWALL: presentPaywall resolved result=', JSON.stringify(result));
  return result;
};

export const showCustomerCenterUI = async (): Promise<void> => {
  // FIX: same default-export correction as showPaywallUI
  const RevenueCatUI = (await import('react-native-purchases-ui')).default;
  await RevenueCatUI.presentCustomerCenter();
};

export const handleRevenueCatError = (error: unknown): string => {
  const e = error as { code?: number | string; message?: string; userCancelled?: boolean };

  if (e.userCancelled) return 'cancelled';

  switch (e.code) {
    case 1:
    case 'PURCHASE_CANCELLED':
      return 'cancelled';
    case 10:
    case 'NETWORK_ERROR':
      return 'Sjekk internettforbindelsen og prøv igjen.';
    case 2:
    case 'STORE_PROBLEM':
      return 'Problem med App Store. Prøv igjen senere.';
    case 7:
    case 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE':
      return 'Produktet er ikke tilgjengelig akkurat nå.';
    case 'PLATFORM_NOT_SUPPORTED':
      return 'Kjøp kun tilgjengelig i iOS/Android-appen.';
    default:
      return e.message ? `Feil: ${e.message}` : 'Noe gikk galt. Prøv igjen.';
  }
};
