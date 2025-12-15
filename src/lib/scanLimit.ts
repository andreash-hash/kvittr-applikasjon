// Monthly scan limit utility for free accounts

import { supabase } from '@/integrations/supabase/client';

const FREE_MONTHLY_LIMIT = 2;
const RESET_DAYS = 30;

export interface ScanLimitStatus {
  scansUsed: number;
  scansRemaining: number;
  canScan: boolean;
  isPremium: boolean;
  resetDate: Date | null;
}

export const checkScanLimit = async (userId: string): Promise<ScanLimitStatus> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, scans_used_this_month, scans_reset_date')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Default to allowing scan if we can't fetch profile
      return {
        scansUsed: 0,
        scansRemaining: FREE_MONTHLY_LIMIT,
        canScan: true,
        isPremium: false,
        resetDate: null,
      };
    }

    const isPremium = profile.subscription_tier === 'premium';
    
    // Premium users have unlimited scans
    if (isPremium) {
      return {
        scansUsed: 0,
        scansRemaining: Infinity,
        canScan: true,
        isPremium: true,
        resetDate: null,
      };
    }

    // Check if we need to reset the monthly counter
    const resetDate = profile.scans_reset_date ? new Date(profile.scans_reset_date) : new Date();
    const daysSinceReset = Math.floor((Date.now() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let scansUsed = profile.scans_used_this_month || 0;
    
    if (daysSinceReset >= RESET_DAYS) {
      // Reset the counter
      scansUsed = 0;
      await supabase
        .from('profiles')
        .update({ 
          scans_used_this_month: 0, 
          scans_reset_date: new Date().toISOString() 
        })
        .eq('id', userId);
    }

    const scansRemaining = Math.max(0, FREE_MONTHLY_LIMIT - scansUsed);
    
    return {
      scansUsed,
      scansRemaining,
      canScan: scansRemaining > 0,
      isPremium: false,
      resetDate,
    };
  } catch (error) {
    console.error('Error checking scan limit:', error);
    return {
      scansUsed: 0,
      scansRemaining: FREE_MONTHLY_LIMIT,
      canScan: true,
      isPremium: false,
      resetDate: null,
    };
  }
};

export const incrementScanCount = async (userId: string): Promise<void> => {
  try {
    // First get current count
    const { data: profile } = await supabase
      .from('profiles')
      .select('scans_used_this_month, subscription_tier')
      .eq('id', userId)
      .single();

    // Don't increment for premium users
    if (profile?.subscription_tier === 'premium') {
      return;
    }

    const currentCount = profile?.scans_used_this_month || 0;
    
    await supabase
      .from('profiles')
      .update({ scans_used_this_month: currentCount + 1 })
      .eq('id', userId);
  } catch (error) {
    console.error('Error incrementing scan count:', error);
  }
};

export const FREE_MONTHLY_SCANS = FREE_MONTHLY_LIMIT;
