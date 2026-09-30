import { test, expect } from '@playwright/test';
import { mockSupabase, onboardAsGuest, pickReceiptFromGallery, storage } from './helpers';

test.describe('guest: onboarding, scan and free-tier limit', () => {
  test.beforeEach(async ({ context }) => { await mockSupabase(context); });

  test('onboarding ends on the scan screen as a guest', async ({ page }) => {
    await onboardAsGuest(page);
    await expect(page).toHaveURL(/\/scan/);
    await expect(page.getByText('Velg fra galleri', { exact: true })).toBeVisible();
  });

  test('first scan is saved locally and uses the single free guest scan', async ({ page }) => {
    await onboardAsGuest(page);
    await pickReceiptFromGallery(page);
    await expect(page.getByText('Kvittering lagret!')).toBeVisible();
    const s = await storage(page);
    expect(s['kvittr_guest_scan_count']).toBe('1');
    expect(JSON.parse(s['kvittr_guest_receipts'])).toHaveLength(1);
  });

  test('second scan is blocked and steers the guest to signup', async ({ page }) => {
    await onboardAsGuest(page);
    await pickReceiptFromGallery(page);
    await expect(page.getByText('Kvittering lagret!')).toBeVisible();

    await page.goto('/scan');
    const skip = page.getByText('Hopp over', { exact: true });
    if (await skip.first().isVisible().catch(() => false)) await skip.first().click();

    const pickerOpened = page.waitForEvent('filechooser', { timeout: 4000 }).then(() => true, () => false);
    await page.getByText('Velg fra galleri', { exact: true }).click();
    expect(await pickerOpened).toBe(false);
    await expect(page.getByText('Du har brukt din gratis skanning')).toBeVisible();
    expect((await storage(page))['kvittr_guest_scan_count']).toBe('1');
  });
});
