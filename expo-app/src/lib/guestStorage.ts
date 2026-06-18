import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuestReceipt } from '../types/receipt';

const GUEST_RECEIPTS_KEY = 'kvittr_guest_receipts';
const GUEST_SCAN_COUNT_KEY = 'kvittr_guest_scan_count';
const GUEST_SCAN_MONTH_KEY = 'kvittr_guest_scan_month';
const GUEST_PREMIUM_KEY = 'kvittr_guest_premium';
const FREE_GUEST_SCANS = 2;

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function maybeResetMonthlyCount(): Promise<void> {
  const stored = await AsyncStorage.getItem(GUEST_SCAN_MONTH_KEY);
  const current = currentYearMonth();
  if (stored !== current) {
    await AsyncStorage.multiSet([
      [GUEST_SCAN_COUNT_KEY, '0'],
      [GUEST_SCAN_MONTH_KEY, current],
    ]);
  }
}

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
  await AsyncStorage.multiSet([
    [GUEST_SCAN_COUNT_KEY, String(count + 1)],
    [GUEST_SCAN_MONTH_KEY, currentYearMonth()],
  ]);
};

export const deleteGuestReceipt = async (id: string): Promise<void> => {
  const existing = await getGuestReceipts();
  const updated = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(GUEST_RECEIPTS_KEY, JSON.stringify(updated));
};

export const getGuestScanCount = async (): Promise<number> => {
  await maybeResetMonthlyCount();
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
    GUEST_SCAN_MONTH_KEY,
    GUEST_PREMIUM_KEY,
  ]);
};
