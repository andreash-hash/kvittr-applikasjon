import { supabase } from '@/integrations/supabase/client';
import { isMobileApp, getMobilePlatform } from '@/utils/platform';

// Production key for iOS, test key for development/Android
const REVENUECAT_IOS_KEY = 'sk_gqPlXeqZSVAvxwlWbYHLsHbHRYnDd';
const REVENUECAT_TEST_KEY = 'test_xCaycFXDGXUFhHvJzrMTDkZEtPg';

export const initializeRevenueCat = async (userId?: string) => {
  if (!isMobileApp()) {
    console.log('RevenueCat: Skipping initialization on web');
    return false;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    
    // Use production key for iOS, test key for other platforms
    const platform = getMobilePlatform();
    const apiKey = platform === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_TEST_KEY;
    
    console.log(`RevenueCat: Configuring for ${platform} with ${platform === 'ios' ? 'production' : 'test'} key`);
    
    // Configure RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined
    });
    
    console.log('✅ RevenueCat configured successfully');
    
    // Add customer info update listener
    await Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
      console.log('RevenueCat: Customer info updated', customerInfo);
      await syncSubscriptionStatus(userId);
    });
    
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
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    
    const expirationDate = customerInfo.entitlements.active['premium']?.expirationDate;
    
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
    throw new Error('PACKAGE_NOT_FOUND');
  }

  const result = await Purchases.purchasePackage({
    aPackage: selectedPackage
  });

  return result.customerInfo.entitlements.active['premium'] !== undefined;
};

export const restorePurchases = async () => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.restorePurchases();
  
  return customerInfo.entitlements.active['premium'] !== undefined;
};

export const showPaywallUI = async (offerings?: any) => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui');
  const result = await RevenueCatUI.presentPaywall({
    offering: offerings
  });
  
  return result;
};

export const showCustomerCenterUI = async () => {
  if (!isMobileApp()) {
    throw new Error('PLATFORM_NOT_SUPPORTED');
  }

  const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui');
  await RevenueCatUI.presentCustomerCenter();
};

export const handleRevenueCatError = (error: any): string => {
  switch (error.code || error.message) {
    case 'PURCHASE_CANCELLED':
      return 'cancelled';
    case 'NETWORK_ERROR':
      return 'Sjekk internettforbindelsen';
    case 'STORE_PROBLEM':
      return 'Problem med App Store. Prøv igjen senere.';
    case 'INVALID_CREDENTIALS':
      return 'Konfigurasjonsfeil. Kontakt support.';
    case 'PLATFORM_NOT_SUPPORTED':
      return 'Kjøp kun tilgjengelig i iOS/Android-appen';
    case 'PACKAGE_NOT_FOUND':
      return 'Produkt ikke tilgjengelig';
    default:
      return 'Noe gikk galt. Prøv igjen.';
  }
};
