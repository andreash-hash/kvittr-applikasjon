// Guest mode storage utility for receipts and premium before signup

const GUEST_RECEIPTS_KEY = 'kvittr_guest_receipts';
const GUEST_SCAN_COUNT_KEY = 'kvittr_guest_scan_count';
const GUEST_PREMIUM_KEY = 'kvittr_guest_premium';
const MAX_GUEST_SCANS = 3;

export interface GuestReceipt {
  id: string;
  type: 'receipt' | 'gift_card' | 'return_slip';
  shop_name: string;
  product_name: string;
  amount: number;
  purchase_date: string;
  image_url: string; // Base64 data URL for guest mode
  status: string;
  processing_status: string;
  created_at: string;
}

export interface GuestPremium {
  isPremium: boolean;
  purchaseDate: string;
  transactionId?: string;
}

export const getGuestReceipts = (): GuestReceipt[] => {
  try {
    const stored = localStorage.getItem(GUEST_RECEIPTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveGuestReceipt = (receipt: GuestReceipt): void => {
  const receipts = getGuestReceipts();
  receipts.unshift(receipt);
  localStorage.setItem(GUEST_RECEIPTS_KEY, JSON.stringify(receipts));
  incrementGuestScanCount();
};

export const getGuestScanCount = (): number => {
  try {
    const count = localStorage.getItem(GUEST_SCAN_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
};

export const getRemainingGuestScans = (): number => {
  // Premium guests get unlimited scans
  if (isGuestPremium()) {
    return Infinity;
  }
  return Math.max(0, MAX_GUEST_SCANS - getGuestScanCount());
};

export const canGuestScan = (): boolean => {
  // Premium guests can always scan
  if (isGuestPremium()) {
    return true;
  }
  return getGuestScanCount() < MAX_GUEST_SCANS;
};

const incrementGuestScanCount = (): void => {
  const currentCount = getGuestScanCount();
  localStorage.setItem(GUEST_SCAN_COUNT_KEY, String(currentCount + 1));
};

export const clearGuestData = (): void => {
  localStorage.removeItem(GUEST_RECEIPTS_KEY);
  localStorage.removeItem(GUEST_SCAN_COUNT_KEY);
};

export const hasGuestReceipts = (): boolean => {
  return getGuestReceipts().length > 0;
};

// Guest Premium functions
export const getGuestPremium = (): GuestPremium | null => {
  try {
    const stored = localStorage.getItem(GUEST_PREMIUM_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const isGuestPremium = (): boolean => {
  const premium = getGuestPremium();
  return premium?.isPremium === true;
};

export const setGuestPremium = (transactionId?: string): void => {
  const premium: GuestPremium = {
    isPremium: true,
    purchaseDate: new Date().toISOString(),
    transactionId,
  };
  localStorage.setItem(GUEST_PREMIUM_KEY, JSON.stringify(premium));
};

export const clearGuestPremium = (): void => {
  localStorage.removeItem(GUEST_PREMIUM_KEY);
};

export const hasGuestData = (): boolean => {
  return hasGuestReceipts() || isGuestPremium();
};
