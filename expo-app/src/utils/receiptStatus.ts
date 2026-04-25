import type { Receipt, ReceiptStatus } from '../types/receipt';

// Ported verbatim from src/lib/storage.ts:calculateStatus in the Capacitor app.
export const calculateStatus = (receipt: Receipt): ReceiptStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (receipt.is_used === true) return 'used';
  if (receipt.type === 'gift_card' && receipt.remaining_value === 0) return 'used';

  if (receipt.warranty_until) {
    const warrantyDate = new Date(receipt.warranty_until);
    warrantyDate.setHours(0, 0, 0, 0);
    if (warrantyDate < today) return 'expired';
  }

  if (receipt.return_until) {
    const returnDate = new Date(receipt.return_until);
    returnDate.setHours(0, 0, 0, 0);
    if (returnDate < today) return 'expired';
  }

  // Legacy field fallback
  const expiryDate = receipt.expiry_date ?? receipt.warranty_expires ?? receipt.return_by;
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'expired';
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
