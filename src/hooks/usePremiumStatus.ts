import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isMobileApp } from '@/utils/platform';

export const usePremiumStatus = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const checkPremium = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        setIsPremium(false);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      if (isMobileApp()) {
        // Check via RevenueCat on native
        try {
          const { Purchases } = await import('@revenuecat/purchases-capacitor');
          const { customerInfo } = await Purchases.getCustomerInfo();
          const hasPremium = customerInfo.entitlements.active['pro'] !== undefined;
          setIsPremium(hasPremium);
        } catch (error) {
          console.error('RevenueCat check failed, falling back to Supabase:', error);
          // Fallback to Supabase
          const { data } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', session.user.id)
            .single();
          setIsPremium(data?.subscription_tier === 'premium');
        }
      } else {
        // Check via Supabase for web
        const { data } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', session.user.id)
          .single();
        setIsPremium(data?.subscription_tier === 'premium');
      }
    } catch (error) {
      console.error('Premium check failed:', error);
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
