// Lifetime free-scan quota for signed-in users, anonymous or not.
//
// NOTE ON THE COLUMN NAME: the quota used to be monthly, so the counter lives
// in profiles.scans_used_this_month with a companion scans_reset_date. The
// quota is now a lifetime one, so the counter is never reset and the date
// column is left untouched. Renaming the column would need a migration and a
// coordinated deploy; the semantics are documented here instead.
//
// The counter is shared by the anonymous user and the account it later becomes
// (same user id), so a person gets GUEST_FREE_SCANS before adding an email and
// TOTAL_FREE_SCANS in all.

import { supabase } from './supabase';
import { GUEST_FREE_SCANS, TOTAL_FREE_SCANS } from './freeTier';

export const FREE_ACCOUNT_SCANS = TOTAL_FREE_SCANS;

export type ScanBlockReason = 'needs_account' | 'needs_premium';

export interface ScanLimitStatus {
  scansUsed: number;
  scansRemaining: number;
  canScan: boolean;
  isPremium: boolean;
  /** Why the scan is blocked. Absent when canScan is true. */
  blockedReason?: ScanBlockReason;
}

/**
 * Pure quota decision, kept separate from the database read so it can be tested.
 *  - Premium is never blocked.
 *  - An anonymous user may scan until GUEST_FREE_SCANS is used, then needs an account.
 *  - An account may scan until TOTAL_FREE_SCANS is used, then needs Premium.
 */
export function evaluateScanLimit(
  scansUsed: number,
  isPremium: boolean,
  isAnonymous: boolean,
): ScanLimitStatus {
  if (isPremium) {
    return { scansUsed, scansRemaining: Infinity, canScan: true, isPremium: true };
  }

  const cap = isAnonymous ? GUEST_FREE_SCANS : TOTAL_FREE_SCANS;
  const scansRemaining = Math.max(0, cap - scansUsed);
  if (scansRemaining > 0) {
    return { scansUsed, scansRemaining, canScan: true, isPremium: false };
  }
  return {
    scansUsed,
    scansRemaining: 0,
    canScan: false,
    isPremium: false,
    blockedReason: isAnonymous ? 'needs_account' : 'needs_premium',
  };
}

// A failed lookup should never look like a paywall to the user.
const allowScan = (): ScanLimitStatus => ({
  scansUsed: 0,
  scansRemaining: GUEST_FREE_SCANS,
  canScan: true,
  isPremium: false,
});

export const checkScanLimit = async (
  userId: string,
  isAnonymous = false,
): Promise<ScanLimitStatus> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, scans_used_this_month')
      .eq('id', userId)
      .single();

    if (error) return allowScan();

    return evaluateScanLimit(
      profile.scans_used_this_month ?? 0,
      profile.subscription_tier === 'premium',
      isAnonymous,
    );
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
