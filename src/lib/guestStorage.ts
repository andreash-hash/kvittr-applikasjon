// Guest mode storage utility for receipts before signup

const GUEST_RECEIPTS_KEY = 'kvittr_guest_receipts';
const GUEST_SCAN_COUNT_KEY = 'kvittr_guest_scan_count';
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
  return Math.max(0, MAX_GUEST_SCANS - getGuestScanCount());
};

export const canGuestScan = (): boolean => {
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
