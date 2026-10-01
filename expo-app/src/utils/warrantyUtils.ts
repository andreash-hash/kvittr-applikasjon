// Ported verbatim from src/lib/utils.ts in the Capacitor app.
// Do NOT modify the keyword list without a dedicated PR and tests.

export function isGroceryStore(shopName: string | undefined): boolean {
  if (!shopName) return false;

  const foodKeywords = [
    'rema',
    'kiwi',
    'coop',
    'meny',
    'bunnpris',
    'joker',
    'spar',
    'europris',
    'extra',
    'mega',
    'prix',
    'marked',
    'big bite',
    'restaurant',
    'cafe',
    'mat',
  ];

  const normalizedShop = shopName.toLowerCase();
  return foodKeywords.some((keyword) => normalizedShop.includes(keyword));
}

export function shouldShowWarranty(
  hasWarranty: boolean | null | undefined,
  shopName: string | undefined,
  receiptType: string,
): boolean {
  if (receiptType === 'gift_card' || receiptType === 'return_slip') {
    return false;
  }
  if (hasWarranty === true) return true;
  if (hasWarranty === false) return false;
  return !isGroceryStore(shopName);
}
