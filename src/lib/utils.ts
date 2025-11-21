import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isGroceryStore(shopName: string | undefined): boolean {
  if (!shopName) return false;
  
  const foodKeywords = [
    'rema', 'kiwi', 'coop', 'meny', 'bunnpris', 'joker', 'spar', 'europris',
    'extra', 'mega', 'prix', 'marked', 'big bite', 'restaurant', 'cafe', 'mat'
  ];
  
  const normalizedShop = shopName.toLowerCase();
  return foodKeywords.some(keyword => normalizedShop.includes(keyword));
}

// Check if receipt should show warranty info
// Returns true if warranty tracking should be shown
export function shouldShowWarranty(
  hasWarranty: boolean | null | undefined,
  shopName: string | undefined,
  receiptType: string
): boolean {
  // Gift cards and return slips never have warranty
  if (receiptType === 'gift_card' || receiptType === 'return_slip') {
    return false;
  }
  
  // If has_warranty is explicitly set, respect user's choice
  if (hasWarranty === true) return true;
  if (hasWarranty === false) return false;
  
  // If null/undefined, use automatic detection
  // Hide warranty for grocery stores by default
  return !isGroceryStore(shopName);
}
