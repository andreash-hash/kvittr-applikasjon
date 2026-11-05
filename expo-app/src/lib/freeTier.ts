/**
 * Single source of truth for the free tier.
 *
 * The funnel is deliberately: scan once with no account and no payment (the
 * person is signed in anonymously behind the scenes), scan a second time after
 * adding an email and password, then Premium.
 *
 * Both quotas are LIFETIME, not monthly, and they share one counter: the
 * anonymous user and the account it becomes are the same user id, so the
 * profile's scan counter simply keeps counting. The point of the free tier is
 * to let someone see that the app works, not to be a usable free plan.
 *
 * Keep these numbers in sync with the pricing copy on kvittr.app.
 */

/** Scans allowed before the user has added an email (also the legacy local-guest quota). */
export const GUEST_FREE_SCANS = 1;

/** Additional scans unlocked by creating a free account. */
export const ACCOUNT_FREE_SCANS = 1;

/** Total free scans across the whole journey, guest + account. */
export const TOTAL_FREE_SCANS = GUEST_FREE_SCANS + ACCOUNT_FREE_SCANS;
