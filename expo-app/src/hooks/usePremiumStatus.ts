import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isMobileApp } from '../utils/platform';

export const usePremiumStatus = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const checkPremium = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setIsPremium(false);
        setUserId(null);
        return;
      }

      setUserId(session.user.id);

      if (isMobileApp()) {
        try {
          const Purchases = (await import('react-native-purchases')).default;
          const { customerInfo } = await Purchases.getCustomerInfo();
          const hasPremium = Object.keys(customerInfo.entitlements.active).length > 0;
          setIsPremium(hasPremium);
          return;
        } catch {
          // Fall through to Supabase check
        }
      }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', session.user.id)
        .single();
      setIsPremium(data?.subscription_tier === 'premium');
    } catch {
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  return { isPremium, loading, userId, refresh: checkPremium };
};
