import path from 'path';
import type { BrowserContext, Page, Route } from '@playwright/test';

export const MOCK = 'https://mock.supabase.test';
export const RECEIPT_IMAGE = path.join(__dirname, 'fixtures', 'receipt.png');
export const USER_ID = '11111111-1111-1111-1111-111111111111';

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
  sub: USER_ID, role: 'authenticated', aud: 'authenticated', exp: 4102444800,
})}.sig`;
const USER = {
  id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const SESSION = {
  access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
  refresh_token: 'mock-refresh', user: USER,
};

export interface SupabaseCall { method: string; path: string; body?: string | null }

/** Mocks every Supabase request; returns the live list of calls for asserting. */
export async function mockSupabase(ctx: BrowserContext): Promise<SupabaseCall[]> {
  const calls: SupabaseCall[] = [];
  await ctx.route(`${MOCK}/**`, (route: Route) => {
    const req = route.request();
    const p = req.url().replace(MOCK, '');
    calls.push({ method: req.method(), path: p, body: req.method() === 'POST' ? req.postData() : null });
    const single = (req.headers()['accept'] || '').includes('pgrst.object');
    let body: unknown = {};
    if (p.includes('/auth/v1/token')) body = SESSION;
    else if (p.includes('/auth/v1/user')) body = USER;
    else if (p.includes('/storage/v1/object/') && ['POST', 'PUT'].includes(req.method())) body = { Key: 'receipts/x', Id: 'x' };
    else if (p.includes('/functions/v1/')) body = { ok: true };
    else if (p.includes('/rest/v1/profiles')) {
      const profile = { id: USER_ID, onboarding_completed: true, is_premium: false, scans_used_this_month: 0 };
      body = single ? profile : [profile];
    } else if (p.includes('/rest/v1/')) body = single ? null : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

export const storage = (page: Page) =>
  page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, String(localStorage.getItem(k))])));

/** Fresh install -> walk the 5 onboarding slides -> "Fortsett som gjest" -> /scan. */
export async function onboardAsGuest(page: Page) {
  await page.goto('/');
  await page.getByText('Kom i gang', { exact: true }).first().waitFor();
  for (let i = 0; i < 4; i++) {
    await page.getByText('Kom i gang', { exact: true }).or(page.getByText('Neste', { exact: true })).first().click();
    await page.waitForTimeout(600);
  }
  await page.getByText('Fortsett som gjest', { exact: true }).click();
  await page.waitForURL('**/scan');
  const skip = page.getByText('Hopp over', { exact: true });
  if (await skip.first().isVisible().catch(() => false)) await skip.first().click();
}

export async function pickReceiptFromGallery(page: Page) {
  const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
  await page.getByText('Velg fra galleri', { exact: true }).click();
  await (await chooser).setFiles(RECEIPT_IMAGE);
}

/** Client-side navigation: a reload would invalidate the guest image's blob: URI on web. */
export const navigate = (page: Page, to: string) =>
  page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, to);
