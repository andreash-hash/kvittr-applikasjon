const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    multiRemove: jest.fn(async (ks: string[]) => { ks.forEach((k) => delete store[k]); }),
  },
}));

const mockInvoke = jest.fn();
jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } },
}));

const mockExists = jest.fn();
const mockDeleteImage = jest.fn(async (_u?: string) => {});
jest.mock('../guestImage', () => ({
  localImageExists: (u: string) => mockExists(u),
  deleteLocalImage: (u: string) => mockDeleteImage(u),
  persistGuestImage: async (u: string) => u,
}));

jest.mock('../receiptUpload', () => ({
  prepareImage: jest.fn(async (u: string) => u),
  uploadReceiptImage: jest.fn(async () => 'https://x/receipts/a.jpg'),
}));
jest.mock('../debugLog', () => ({ debugLog: jest.fn() }));

import { migrateGuestReceipts } from '../guestMigration';
import { getGuestReceipts, saveGuestReceipt, getGuestScanCount } from '../guestStorage';
import type { GuestReceipt } from '../../types/receipt';

const receipt = (id: string, image_url = `file:///doc/${id}.jpg`): GuestReceipt => ({
  id, type: 'receipt', shop_name: '', product_name: '', amount: 0,
  purchase_date: '2026-01-01T00:00:00Z', image_url, status: 'active',
  processing_status: 'local', created_at: '2026-01-01T00:00:00Z',
});

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockInvoke.mockReset().mockResolvedValue({ error: null });
  mockExists.mockReset().mockResolvedValue(true);
  mockDeleteImage.mockClear();
});

describe('migrateGuestReceipts', () => {
  it('is a no-op with nothing stored', async () => {
    expect(await migrateGuestReceipts('u1')).toEqual({ migrated: 0, lost: 0 });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('uploads + OCRs a receipt and removes it (and its image) locally', async () => {
    await saveGuestReceipt(receipt('g1'));
    expect(await migrateGuestReceipts('u1')).toEqual({ migrated: 1, lost: 0 });
    expect(mockInvoke).toHaveBeenCalledWith('process-receipt-ocr', expect.objectContaining({
      body: { image_url: 'https://x/receipts/a.jpg', user_id: 'u1' },
    }));
    expect(await getGuestReceipts()).toEqual([]);
    expect(mockDeleteImage).toHaveBeenCalledWith('file:///doc/g1.jpg');
  });

  it('keeps the receipt for a retry when the OCR call fails', async () => {
    await saveGuestReceipt(receipt('g1'));
    mockInvoke.mockResolvedValue({ error: new Error('boom') });
    expect(await migrateGuestReceipts('u1')).toEqual({ migrated: 0, lost: 0 });
    expect((await getGuestReceipts()).map((r) => r.id)).toEqual(['g1']);
  });

  it('drops receipts whose image is gone and reports them as lost', async () => {
    await saveGuestReceipt(receipt('g1'));
    mockExists.mockResolvedValue(false);
    expect(await migrateGuestReceipts('u1')).toEqual({ migrated: 0, lost: 1 });
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(await getGuestReceipts()).toEqual([]);
  });

  it('does not refund the free-scan quota when a receipt is deleted', async () => {
    await saveGuestReceipt(receipt('g1'));
    await migrateGuestReceipts('u1');
    expect(await getGuestScanCount()).toBe(1);
  });
});
