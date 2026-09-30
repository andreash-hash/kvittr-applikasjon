import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuestReceipt } from '../types/receipt';
import { GUEST_FREE_SCANS } from './freeTier';

const GUEST_RECEIPTS_KEY = 'kvittr_guest_receipts';
const GUEST_SCAN_COUNT_KEY = 'kvittr_guest_scan_count';
// Legacy key from when the guest quota reset monthly. No longer written; kept
// here only so clearGuestData still removes it from older installs.
const LEGACY_GUEST_SCAN_MONTH_KEY = 'kvittr_guest_scan_month';
const GUEST_PREMIUM_KEY = 'kvittr_guest_premium';
const FREE_GUEST_SCANS = GUEST_FREE_SCANS;

export const getGuestReceipts = async (): Promise<GuestReceipt[]> => {
  try {
    const json = await AsyncStorage.getItem(GUEST_RECEIPTS_KEY);
    return json ? (JSON.parse(json) as GuestReceipt[]) : [];
  } catch {
    return [];
  }
};

export const saveGuestReceipt = async (receipt: GuestReceipt): Promise<void> => {
  const existing = await getGuestReceipts();
  const updated = [receipt, ...existing];
  await AsyncStorage.setItem(GUEST_RECEIPTS_KEY, JSON.stringify(updated));
  const count = await getGuestScanCount();
  await AsyncStorage.setItem(GUEST_SCAN_COUNT_KEY, String(count + 1));
};

/**
 * Note: this deliberately does not decrement the scan counter. The quota
 * counts scans taken, not receipts currently held, so deleting a receipt is
 * not a way to earn another free scan.
 */
export const deleteGuestReceipt = async (id: string): Promise<void> => {
  const existing = await getGuestReceipts();
  const updated = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(GUEST_RECEIPTS_KEY, JSON.stringify(updated));
};

export const getGuestScanCount = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(GUEST_SCAN_COUNT_KEY);
  return val ? parseInt(val, 10) : 0;
};

export const getRemainingGuestScans = async (): Promise<number> => {
  const used = await getGuestScanCount();
  return Math.max(0, FREE_GUEST_SCANS - used);
};

export const canGuestScan = async (): Promise<boolean> => {
  if (await isGuestPremium()) return true;
  const remaining = await getRemainingGuestScans();
  return remaining > 0;
};

export const isGuestPremium = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(GUEST_PREMIUM_KEY);
  return val !== null;
};

export const setGuestPremium = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(GUEST_PREMIUM_KEY, token);
};

export const clearGuestData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    GUEST_RECEIPTS_KEY,
    GUEST_SCAN_COUNT_KEY,
    LEGACY_GUEST_SCAN_MONTH_KEY,
    GUEST_PREMIUM_KEY,
  ]);
};
