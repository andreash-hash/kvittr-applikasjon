jest.mock('../supabase', () => ({ supabase: {} }));

import { evaluateScanLimit } from '../scanLimit';

describe('evaluateScanLimit', () => {
  it('lets an anonymous user take the first scan', () => {
    const status = evaluateScanLimit(0, false, true);
    expect(status.canScan).toBe(true);
    expect(status.scansRemaining).toBe(1);
  });

  it('asks an anonymous user for an account after the first scan', () => {
    const status = evaluateScanLimit(1, false, true);
    expect(status.canScan).toBe(false);
    expect(status.blockedReason).toBe('needs_account');
  });

  it('lets an account take its second scan', () => {
    const status = evaluateScanLimit(1, false, false);
    expect(status.canScan).toBe(true);
    expect(status.scansRemaining).toBe(1);
  });

  it('shows the paywall on the third scan', () => {
    const status = evaluateScanLimit(2, false, false);
    expect(status.canScan).toBe(false);
    expect(status.blockedReason).toBe('needs_premium');
  });

  it('keeps counting across the anonymous to account switch', () => {
    // Same user id, same counter: 1 scan used anonymously leaves 1 for the account.
    expect(evaluateScanLimit(1, false, true).blockedReason).toBe('needs_account');
    expect(evaluateScanLimit(1, false, false).canScan).toBe(true);
  });

  it('never blocks premium users', () => {
    expect(evaluateScanLimit(50, true, false).canScan).toBe(true);
    expect(evaluateScanLimit(50, true, true).canScan).toBe(true);
  });
});
