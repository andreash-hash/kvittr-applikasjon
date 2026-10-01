import { test, expect } from '@playwright/test';
import { mockSupabase, onboardAsGuest } from './helpers';

test.describe('signup + premium screen', () => {
  test('signup shows inline hints and never calls Supabase on invalid input', async ({ page, context }) => {
    const calls = await mockSupabase(context);
    await onboardAsGuest(page);
    await page.goto('/signup');
    const inputs = page.locator('input');
    await inputs.nth(0).fill('test@example.com');
    await inputs.nth(1).fill('Passord123!');
    await inputs.nth(2).fill('Annet456!');
    await expect(page.getByText('Passordene stemmer ikke')).toBeVisible();
    await inputs.nth(1).fill('kort');
    await inputs.nth(2).fill('kort');
    await expect(page.getByText('Passordet må være minst 8 tegn')).toBeVisible();
    expect(calls.filter((c) => c.path.includes('/auth/v1/signup'))).toHaveLength(0);
  });

  test('premium screen renders for a guest without crashing', async ({ page, context }) => {
    await mockSupabase(context);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await onboardAsGuest(page);
    await page.goto('/premium');
    await expect(page.getByText(/premium/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
