import { summarizeScanResult, formatDateNb } from '../scanResult';
import type { Receipt } from '../../types/receipt';

const TODAY = new Date(2026, 10, 5); // 5 Nov 2026, local time

function receipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: 'r1',
    user_id: 'u1',
    type: 'receipt',
    shop_name: 'Elkjøp',
    product_name: 'Støvsuger',
    amount: 2990,
    purchase_date: '2026-11-05',
    image_url: '',
    status: 'active',
    created_at: '2026-11-05T10:00:00Z',
    ...overrides,
  };
}

describe('formatDateNb', () => {
  it('writes Norwegian month names', () => {
    expect(formatDateNb('2029-03-14')).toBe('14. mars 2029');
    expect(formatDateNb('2026-12-01')).toBe('1. desember 2026');
  });

  it('does not shift the day for a date-only string', () => {
    expect(formatDateNb('2027-01-01')).toBe('1. januar 2027');
  });
});

describe('summarizeScanResult', () => {
  it('leads with the warranty date and the time left', () => {
    const s = summarizeScanResult(receipt({ warranty_until: '2031-11-05' }), TODAY);
    expect(s.label).toBe('Garanti til');
    expect(s.headline).toBe('5. november 2031');
    expect(s.detail).toBe('Ca. 5 år igjen');
    expect(s.tone).toBe('good');
  });

  it('flags a warranty that ends within 30 days', () => {
    const s = summarizeScanResult(receipt({ warranty_until: '2026-11-20' }), TODAY);
    expect(s.tone).toBe('soon');
    expect(s.detail).toBe('15 dager igjen');
  });

  it('says plainly when the warranty has run out', () => {
    const s = summarizeScanResult(receipt({ warranty_until: '2026-10-01' }), TODAY);
    expect(s.label).toBe('Garantien utløp');
    expect(s.tone).toBe('expired');
  });

  it('falls back to the return window when there is no warranty', () => {
    const s = summarizeScanResult(receipt({ return_until: '2026-11-19' }), TODAY);
    expect(s.label).toBe('Bytterett til');
    expect(s.detail).toBe('14 dager igjen');
  });

  it('explains why there is no warranty, using the model reasoning when present', () => {
    const s = summarizeScanResult(
      receipt({ warranty_reasoning: 'Dagligvarer har ikke reklamasjonsrett.' }),
      TODAY,
    );
    expect(s.label).toBe('Ingen garanti');
    expect(s.headline).toBeNull();
    expect(s.detail).toBe('Dagligvarer har ikke reklamasjonsrett.');
  });

  it('handles gift cards by their expiry date', () => {
    const s = summarizeScanResult(receipt({ type: 'gift_card', expiry_date: '2027-05-05' }), TODAY);
    expect(s.label).toBe('Gavekort gyldig til');
    expect(s.headline).toBe('5. mai 2027');
  });

  it('handles return slips by their valid-until date', () => {
    const s = summarizeScanResult(receipt({ type: 'return_slip', return_until: '2026-11-06' }), TODAY);
    expect(s.label).toBe('Gyldig til');
    expect(s.detail).toBe('1 dag igjen');
    expect(s.tone).toBe('soon');
  });
});
