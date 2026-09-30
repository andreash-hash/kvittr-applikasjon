import type { Receipt, ReceiptStatus } from '../types/receipt';

/**
 * Compute the display status of a receipt.
 *
 * KEY RULE: a receipt with a still-valid warranty is valuable even if the
 * 30-day return window has closed. Warranty takes priority over return right.
 *
 *   warranty_until in the future  → 'active' (or 'expiring_soon')
 *   warranty_until in the past    → 'warranty_expired'
 *   no warranty, return_until past→ 'return_expired'   (calm — not alarming red)
 *   gift card past expiry_date    → 'gift_card_expired'
 */
export const calculateStatus = (receipt: Receipt): ReceiptStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (receipt.is_used === true) return 'used';
  if (receipt.type === 'gift_card' && receipt.remaining_value === 0) return 'used';

  // ── Gift card path ──────────────────────────────────────────────────────────
  if (receipt.type === 'gift_card') {
    const expiryStr = receipt.expiry_date ?? receipt.warranty_expires ?? receipt.return_by;
    if (expiryStr) {
      const expiry = new Date(expiryStr);
      expiry.setHours(0, 0, 0, 0);
      if (expiry < today) return 'gift_card_expired';
      const daysUntil = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil <= 7) return 'expiring_soon';
    }
    return 'active';
  }

  // ── Regular receipts: warranty is the primary value indicator ───────────────
  //
  // If warranty_until is set and in the future the receipt is STILL VALUABLE.
  // The return window may have closed, but that is a lesser concern — do NOT
  // show a scary red "Utløpt" badge just because 30 days have passed.
  if (receipt.warranty_until) {
    const warrantyDate = new Date(receipt.warranty_until);
    warrantyDate.setHours(0, 0, 0, 0);

    if (warrantyDate < today) return 'warranty_expired';

    // Warranty valid — expiring soon within 30 days?
    const daysUntil = Math.ceil(
      (warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 30) return 'expiring_soon';

    // Warranty valid and not expiring soon — receipt is active regardless of
    // whether return_until has passed.
    return 'active';
  }

  // ── No warranty — check return right ────────────────────────────────────────
  if (receipt.return_until) {
    const returnDate = new Date(receipt.return_until);
    returnDate.setHours(0, 0, 0, 0);

    if (returnDate < today) return 'return_expired';

    const daysUntil = Math.ceil(
      (returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 7) return 'expiring_soon';
    return 'active';
  }

  // ── Legacy field fallback (expiry_date / warranty_expires / return_by) ──────
  const expiryDate = receipt.expiry_date ?? receipt.warranty_expires ?? receipt.return_by;
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil < 0) return 'warranty_expired';
    if (daysUntil <= 7) return 'expiring_soon';
  }

  return 'active';
};

// Dashboard banner thresholds (ported from Dashboard.tsx)
export const isExpiringSoon = (receipt: Receipt): boolean => {
  if (receipt.warranty_until) {
    const days = Math.ceil(
      (new Date(receipt.warranty_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days >= 0 && days <= 60) return true;
  }
  if (receipt.return_until) {
    const days = Math.ceil(
      (new Date(receipt.return_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days >= 0 && days <= 14) return true;
  }
  return false;
};
