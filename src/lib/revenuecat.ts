import { supabase } from '@/integrations/supabase/client';
import { isMobileApp, getMobilePlatform } from '@/utils/platform';

// Public API keys for RevenueCat (NOT secret keys - those start with sk_)
// iOS public key should start with 'appl_'
// Android public key should start with 'goog_'
const REVENUECAT_IOS_KEY = 'appl_HmmhscVDvicXCGtVkIrgWWqRyBB';
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_ANDROID_PUBLIC_KEY_HERE'; // Replace with your actual Android public key

// Guard against re-adding listeners / re-configuring multiple times
let rcListenerAdded = false;
let rcLastAppUserId: string | undefined;

export const initializeRevenueCat = async (userId?: string) => {
  if (!isMobileApp()) {
    console.log('RevenueCat: Skipping initialization on web');
    return false;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    // Use platform-specific public API keys
    const platform = getMobilePlatform();
    const apiKey = platform === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

    // Ensure configured (can be false on cold starts in TestFlight)
    const configuredResult = await Purchases.isConfigured().catch(() => ({ isConfigured: false }));

    if (!configuredResult.isConfigured) {
      console.log(`RevenueCat: Configuring for ${platform}`);

      await Purchases.configure({
        apiKey,
        appUserID: userId || undefined,
      });

      console.log('✅ RevenueCat configured successfully');
    } else if (userId && userId !== rcLastAppUserId) {
      // Associate RevenueCat user with the logged-in Supabase user
      try {
        await Purchases.logIn({ appUserID: userId });
      } catch (e) {
        console.warn('RevenueCat: logIn failed (continuing)', e);
      }
    }

    // Enable verbose logs to help TestFlight debugging (no-op if enum import fails)
    try {
      const { LOG_LEVEL } = await import('@revenuecat/purchases-typescript-internal-esm');
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    } catch {
      // ignore
    }

    if (!rcListenerAdded) {
      await Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
        console.log('RevenueCat: Customer info updated', customerInfo);
        await syncSubscriptionStatus();
      });
      rcListenerAdded = true;
    }

    rcLastAppUserId = userId;

    // Initial sync
    await syncSubscriptionStatus(userId);

    return true;
  } catch (error) {
    console.error('❌ RevenueCat initialization failed:', error);
    return false;
  }
};

export const syncSubscriptionStatus = async (userId?: string) => {
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }
  
  if (!userId) {
    console.log('RevenueCat: No user ID for sync');
    return;
  }

  if (!isMobileApp()) {
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active['pro'] !== undefined;
    
    const expirationDate = customerInfo.entitlements.active['pro']?.expirationDate;
    
    await supabase
      .from('profiles')
      .update({
        subscription_status: isPremium ? 'active' : 'expired',
        subscription_tier: isPremium ? 'premium' : 'free',
        subscription_started_at: isPremium ? new Date().toISOString() : null,
        subscription_expires_at: expirationDate || null
      })
      .eq('id', userId);
      
    console.log('RevenueCat: Subscription synced -', isPremium ? 'Premium' : 'Free');
  } catch (error) {
    console.error('RevenueCat: Sync failed:', error);
  }
};

export const getOfferings = async () => {
  if (!isMobileApp()) {
    return null;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const result = await Purchases.getOfferings();
    return result.current;
  } catch (error) {
    console.error('RevenueCat: Failed to fetch offerings:', error);
    return null;
  }
};

export const purchasePackage = async (packageType: 'MONTHLY' | 'ANNUAL' | 'LIFETIME', offerings: any) => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  
  const selectedPackage = offerings?.availablePackages?.find(
    (pkg: any) => pkg.packageType === packageType
  );
  
  if (!selectedPackage) {
    console.error('RevenueCat: Package not found', { packageType, availablePackages: offerings?.availablePackages });
    throw new Error('PACKAGE_NOT_FOUND');
  }

  try {
    console.log('RevenueCat: Attempting purchase', { packageType, package: selectedPackage.identifier });
    const result = await Purchases.purchasePackage({
      aPackage: selectedPackage
    });
    console.log('RevenueCat: Purchase successful', result.customerInfo.entitlements);
    return result.customerInfo.entitlements.active['pro'] !== undefined;
  } catch (error: any) {
    console.error('RevenueCat purchase error:', {
      code: error.code,
      message: error.message,
      underlyingError: error.underlyingErrorMessage,
      userCancelled: error.userCancelled,
      fullError: JSON.stringify(error)
    });
    throw error;
  }
};

export const restorePurchases = async () => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.restorePurchases();
  
  return customerInfo.entitlements.active['pro'] !== undefined;
};

export const showPaywallUI = async (offerings?: any) => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  await initializeRevenueCat();

  const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui');
  const result = await RevenueCatUI.presentPaywall({
    offering: offerings,
  });

  return result;
};

export const showCustomerCenterUI = async () => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  await initializeRevenueCat();

  const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui');
  await RevenueCatUI.presentCustomerCenter();
};

export const handleRevenueCatError = (error: any): string => {
  // Log full error for debugging
  console.error('RevenueCat handleError:', {
    code: error.code,
    message: error.message,
    underlyingError: error.underlyingErrorMessage,
    readableError: error.readableErrorCode,
    fullError: JSON.stringify(error)
  });

  const errorCode = error.code || error.readableErrorCode || error.message;
  
  switch (errorCode) {
    case 'PURCHASE_CANCELLED':
    case 1:
      return 'cancelled';
    case 'NETWORK_ERROR':
    case 10:
      return 'Sjekk internettforbindelsen';
    case 'STORE_PROBLEM':
    case 2:
      return 'Problem med App Store. Prøv igjen senere.';
    case 'INVALID_CREDENTIALS':
    case 11:
      return 'Konfigurasjonsfeil. Kontakt support.';
    case 'PLATFORM_NOT_SUPPORTED':
      return 'Kjøp kun tilgjengelig i iOS/Android-appen';
    case 'PACKAGE_NOT_FOUND':
      return 'Produkt ikke tilgjengelig';
    case 'CONFIGURATION_ERROR':
    case 23:
      return 'Produkter ikke konfigurert i App Store. Kontakt support.';
    case 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE':
    case 7:
      return 'Dette produktet er ikke tilgjengelig for kjøp akkurat nå.';
    case 'INVALID_RECEIPT':
    case 5:
      return 'Ugyldig kvittering. Prøv igjen.';
    default:
      // Return more specific error if available
      if (error.message) {
        return `Feil: ${error.message}`;
      }
      return 'Noe gikk galt. Prøv igjen.';
  }
};
