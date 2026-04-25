import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuestReceipt } from '../types/receipt';

const GUEST_RECEIPTS_KEY = 'kvittr_guest_receipts';
const GUEST_SCAN_COUNT_KEY = 'kvittr_guest_scan_count';
const GUEST_PREMIUM_KEY = 'kvittr_guest_premium';
const FREE_GUEST_SCANS = 3;

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
  await AsyncStorage.multiRemove([GUEST_RECEIPTS_KEY, GUEST_SCAN_COUNT_KEY, GUEST_PREMIUM_KEY]);
};
