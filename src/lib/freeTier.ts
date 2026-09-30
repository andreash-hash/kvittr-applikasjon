/**
 * Single source of truth for the free tier.
 *
 * The funnel is deliberately: scan once as a guest (no account, no payment),
 * scan a second time after creating a free account, then Premium.
 *
 * Both quotas are LIFETIME, not monthly. The point of the free tier is to let
 * someone see that the app works — not to be a usable free plan.
 *
 * Keep these numbers in sync with the pricing copy on kvittr.app
 * (PricingSection.tsx and the Kvitteringsapp FAQ).
 */

/** Scans allowed before the user has an account. */
export const GUEST_FREE_SCANS = 1;

/** Additional scans unlocked by creating a free account. */
export const ACCOUNT_FREE_SCANS = 1;

/** Total free scans across the whole journey, guest + account. */
export const TOTAL_FREE_SCANS = GUEST_FREE_SCANS + ACCOUNT_FREE_SCANS;
