import { test, expect } from '@playwright/test';
import { mockSupabase, onboardAsGuest, pickReceiptFromGallery, storage, navigate } from './helpers';

test('guest receipt is uploaded + OCR-processed after login, then removed locally', async ({ page, context }) => {
  const calls = await mockSupabase(context);
  await onboardAsGuest(page);
  await pickReceiptFromGallery(page);
  await expect(page.getByText('Kvittering lagret!')).toBeVisible();
  expect(JSON.parse((await storage(page))['kvittr_guest_receipts'])).toHaveLength(1);

  calls.length = 0;
  await navigate(page, '/login');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('test@example.com');
  await inputs.nth(1).fill('Passord123!');
  await page.getByText('Logg inn', { exact: true }).last().click();

  await expect.poll(() => calls.some((c) => c.path.includes('/functions/v1/process-receipt-ocr')), { timeout: 20_000 }).toBe(true);
  expect(calls.some((c) => c.path.includes('/storage/v1/object/receipts'))).toBe(true);
  await expect.poll(async () => (await storage(page))['kvittr_guest_receipts']).toBe('[]');
});
