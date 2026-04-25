import { isGroceryStore, shouldShowWarranty } from '../warrantyUtils';

describe('isGroceryStore', () => {
  it('returns false for undefined', () => {
    expect(isGroceryStore(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isGroceryStore('')).toBe(false);
  });

  it('matches rema case-insensitively', () => {
    expect(isGroceryStore('REMA 1000')).toBe(true);
    expect(isGroceryStore('Rema 1000 Majorstuen')).toBe(true);
  });

  it('matches kiwi', () => {
    expect(isGroceryStore('Kiwi Storo')).toBe(true);
  });

  it('matches coop', () => {
    expect(isGroceryStore('Coop Extra')).toBe(true);
  });

  it('matches meny', () => {
    expect(isGroceryStore('Meny Aker Brygge')).toBe(true);
  });

  it('matches bunnpris', () => {
    expect(isGroceryStore('Bunnpris')).toBe(true);
  });

  it('matches mat keyword', () => {
    expect(isGroceryStore('Vestlandsk mat og drikke')).toBe(true);
  });

  it('matches restaurant', () => {
    expect(isGroceryStore('Egon Restaurant')).toBe(true);
  });

  it('returns false for electronics store', () => {
    expect(isGroceryStore('Elkjøp')).toBe(false);
  });

  it('returns false for clothing store', () => {
    expect(isGroceryStore('H&M')).toBe(false);
  });

  it('returns false for appliance store', () => {
    expect(isGroceryStore('Power')).toBe(false);
  });
});

describe('shouldShowWarranty', () => {
  it('returns false for gift_card type', () => {
    expect(shouldShowWarranty(null, 'Elkjøp', 'gift_card')).toBe(false);
  });

  it('returns false for return_slip type', () => {
    expect(shouldShowWarranty(null, 'H&M', 'return_slip')).toBe(false);
  });

  it('returns true when has_warranty is explicitly true', () => {
    expect(shouldShowWarranty(true, 'Kiwi', 'receipt')).toBe(true);
  });

  it('returns false when has_warranty is explicitly false', () => {
    expect(shouldShowWarranty(false, 'Elkjøp', 'receipt')).toBe(false);
  });

  it('returns false for grocery store when has_warranty is null (2-yr standard goods)', () => {
    expect(shouldShowWarranty(null, 'REMA 1000', 'receipt')).toBe(false);
  });

  it('returns true for electronics store when has_warranty is null (5-yr durable goods)', () => {
    expect(shouldShowWarranty(null, 'Elkjøp', 'receipt')).toBe(true);
  });

  it('returns true for clothing store when has_warranty is null', () => {
    expect(shouldShowWarranty(null, 'H&M', 'receipt')).toBe(true);
  });

  it('returns true for appliances when has_warranty is null', () => {
    expect(shouldShowWarranty(null, 'Power', 'receipt')).toBe(true);
  });

  it('returns true for warranty type when has_warranty is null', () => {
    expect(shouldShowWarranty(null, 'Elkjøp', 'warranty')).toBe(true);
  });

  it('returns true for unknown shop when has_warranty is null', () => {
    expect(shouldShowWarranty(null, undefined, 'receipt')).toBe(true);
  });
});
