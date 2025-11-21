import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isGroceryStore(shopName: string | undefined): boolean {
  if (!shopName) return false;
  
  const groceryStores = [
    'rema', 'kiwi', 'coop', 'meny', 'bunnpris', 'joker', 'spar', 'europris',
    'extra', 'mega', 'prix', 'marked'
  ];
  
  const normalizedShop = shopName.toLowerCase();
  return groceryStores.some(store => normalizedShop.includes(store));
}
