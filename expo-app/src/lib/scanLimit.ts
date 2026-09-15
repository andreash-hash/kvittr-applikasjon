// Lifetime free-scan quota for signed-in accounts.
//
// NOTE ON THE COLUMN NAME: the quota used to be monthly, so the counter lives
// in profiles.scans_used_this_month with a companion scans_reset_date. The
// quota is now a lifetime one, so the counter is never reset and the date
// column is left untouched. Renaming the column would need a migration and a
// coordinated deploy; the semantics are documented here instead.

import { supabase } from './supabase';
import { ACCOUNT_FREE_SCANS } from './freeTier';

export const FREE_ACCOUNT_SCANS = ACCOUNT_FREE_SCANS;

export interface ScanLimitStatus {
  scansUsed: number;
  scansRemaining: number;
  canScan: boolean;
  isPremium: boolean;
}

const allowScan = (): ScanLimitStatus => ({
  scansUsed: 0,
  scansRemaining: ACCOUNT_FREE_SCANS,
  canScan: true,
  isPremium: false,
});

export const checkScanLimit = async (userId: string): Promise<ScanLimitStatus> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, scans_used_this_month')
      .eq('id', userId)
      .single();

    // A failed lookup should never look like a paywall to the user.
    if (error) return allowScan();

    if (profile.subscription_tier === 'premium') {
      return { scansUsed: 0, scansRemaining: Infinity, canScan: true, isPremium: true };
    }

    const scansUsed = profile.scans_used_this_month ?? 0;
    const scansRemaining = Math.max(0, ACCOUNT_FREE_SCANS - scansUsed);

    return { scansUsed, scansRemaining, canScan: scansRemaining > 0, isPremium: false };
  } catch {
    return allowScan();
  }
};

export const incrementScanCount = async (userId: string): Promise<void> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('scans_used_this_month, subscription_tier')
      .eq('id', userId)
      .single();

    // Premium is unlimited, so there is nothing to count.
    if (profile?.subscription_tier === 'premium') return;

    const currentCount = profile?.scans_used_this_month ?? 0;
    await supabase
      .from('profiles')
      .update({ scans_used_this_month: currentCount + 1 })
      .eq('id', userId);
  } catch {
    // Non-fatal
  }
};
