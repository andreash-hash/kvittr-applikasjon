# 03 — Warranty Logic Extraction

This document captures the Norwegian consumer-law warranty logic that must be ported verbatim to the Expo app. It is the core domain logic ("the moat") of Kvittr.

---

## Legal Basis

Norwegian consumer law:
- **Standard goods:** 2-year right of complaint (`reklamasjonsrett`) — *Forbrukerkjøpsloven § 27*
- **Durable goods** (appliances, electronics, vehicles, furniture): 5-year right of complaint — *Forbrukerkjøpsloven § 27 (2)*

The user toggle "Har garanti / Varig forbruksvare" in `ItemDetail.tsx` maps to `receipts.has_warranty`. When `true`, the app treats the item as a durable good with a 5-year warranty. When `false`, no warranty is shown. When `null`, automatic detection via `isGroceryStore()` determines whether to show warranty at all.

---

## 1. `isGroceryStore(shopName)` — `src/lib/utils.ts:8-18`

```typescript
export function isGroceryStore(shopName: string | undefined): boolean {
  if (!shopName) return false;

  const foodKeywords = [
    'rema', 'kiwi', 'coop', 'meny', 'bunnpris', 'joker', 'spar', 'europris',
    'extra', 'mega', 'prix', 'marked', 'big bite', 'restaurant', 'cafe', 'mat'
  ];

  const normalizedShop = shopName.toLowerCase();
  return foodKeywords.some(keyword => normalizedShop.includes(keyword));
}
```

**Purpose:** Grocery stores / food service do not sell goods with warranty under consumer law. If the shop name matches any keyword (case-insensitive substring match), warranty tracking is suppressed by default.

**Keywords covered:**
- Supermarket chains: Rema 1000, Kiwi, Coop (all variants), Meny, Bunnpris, Joker, Spar, Extra, Mega
- Discount stores: Europris
- Convenience / fast food: Big Bite
- Generic food indicators: restaurant, cafe, mat (food), prix (price), marked (market)

**Migration note:** This list should be extended. Notable omissions: `oda`, `kolonial`, `nille` (non-food but discount), `biltema` (auto/hardware — should probably NOT be excluded from warranty). Port the list exactly; extend in a follow-up PR.

---

## 2. `shouldShowWarranty(hasWarranty, shopName, receiptType)` — `src/lib/utils.ts:21-39`

```typescript
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
```

**Decision tree:**

```
receiptType === 'gift_card' OR 'return_slip'  →  false (never show warranty)
hasWarranty === true                           →  true  (user explicitly enabled)
hasWarranty === false                          →  false (user explicitly disabled)
hasWarranty === null/undefined
  isGroceryStore(shopName) === true            →  false (auto-suppress for food stores)
  isGroceryStore(shopName) === false           →  true  (default: show warranty)
```

---

## 3. Warranty Period Calculation

**The warranty period is NOT calculated in the React codebase.** There is no code in `src/` that derives `warranty_until` from `purchase_date` + product category. Instead, `warranty_until` is populated by the n8n OCR workflow (see `05-n8n-workflows.md`).

The n8n workflow calls an AI model (likely Gemini — not confirmed from this codebase) that reads the receipt image and:
1. Extracts `purchase_date`, `shop_name`, `product_name`, `amount`, `receipt_type`.
2. Applies Norwegian warranty rules to derive `warranty_until`:
   - Grocery / food → no warranty
   - Durable goods (electronics, appliances, furniture, vehicles) → `purchase_date + 5 years`
   - Standard goods → `purchase_date + 2 years`
3. Derives `return_until` (exchange deadline — typically 30 days per Norwegian retailer standard, but varies).
4. Writes the completed fields back to the `receipts` row via Supabase.

### What the frontend DOES for warranty dates:

**Display in `ItemDetail.tsx`** (lines 700-740):

```tsx
// Warranty countdown
const warrantyDate = new Date(receipt.warranty_until);
const daysRemaining = differenceInDays(warrantyDate, new Date());
const monthsRemaining = differenceInMonths(warrantyDate, new Date());

if (daysRemaining < 0) return 'Garanti utløpt';
if (monthsRemaining > 0) return `${monthsRemaining} måneder igjen`;
return `${daysRemaining} dager igjen`;
```

**Status calculation in `src/lib/storage.ts:calculateStatus`** (lines 96-140):

```typescript
export const calculateStatus = (receipt: Receipt): Receipt['status'] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (receipt.is_used === true) return 'used';

  if (receipt.type === 'gift_card' && receipt.remaining_value === 0) return 'used';

  // Warranty expiry → auto-archive
  if (receipt.warranty_until) {
    const warrantyDate = new Date(receipt.warranty_until);
    warrantyDate.setHours(0, 0, 0, 0);
    if (warrantyDate < today) return 'expired';
  }

  // Return deadline expiry → auto-archive
  if (receipt.return_until) {
    const returnDate = new Date(receipt.return_until);
    returnDate.setHours(0, 0, 0, 0);
    if (returnDate < today) return 'expired';
  }

  // Legacy field fallback
  const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 7) return 'expiring_soon';
  }

  return 'active';
};
```

**"Expiring soon" banner logic in `Dashboard.tsx`** (lines 249-290):

```typescript
// warranty_until within 60 days → show in expiring banner
if (receipt.warranty_until) {
  const daysUntilExpiry = differenceInDays(new Date(receipt.warranty_until), new Date());
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
}

// return_until within 14 days → show in expiring banner
if (receipt.return_until) {
  const daysUntilExpiry = differenceInDays(new Date(receipt.return_until), new Date());
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 14) return true;
}
```

**Push notification threshold** (from `Settings.tsx` UI):
- 30 days before expiry (flag: `warranty_notified_30d`)
- 7 days before expiry (flag: `warranty_notified_7d`)

Note: The Settings description string says "7 og 3 dager" but the toggles say 30 d and 7 d. The DB has columns for 30 d and 7 d. The 3-day figure in the UI copy appears to be a marketing/copy inconsistency. Clarify with product owner before implementing the scheduler.

---

## 4. Disclaimer Text (must keep in Expo)

From `ItemDetail.tsx:755-764`:

> Kvittr bruker AI for automatisk utlesing av kvitteringer. Kontroller alltid at informasjonen stemmer. Du er ansvarlig for å oppbevare original kvittering.
>
> **Garanti:** Automatisk 2 års reklamasjonsrett etter norsk lov, 5 år for varige varer. For byttelapper gjelder butikkens vilkår.
>
> Kvittr er ikke ansvarlig for feil i AI-analysen.

---

## 5. Summary: What the Expo App Must Implement

| Logic | Location in new app |
|-------|---------------------|
| `isGroceryStore(shopName)` | `src/utils/warrantyUtils.ts` — port verbatim |
| `shouldShowWarranty(hasWarranty, shopName, receiptType)` | Same file — port verbatim |
| `calculateStatus(receipt)` | `src/utils/receiptStatus.ts` — port verbatim |
| Dashboard expiry banner (60 d / 14 d thresholds) | `app/(tabs)/index.tsx` |
| Warranty countdown display (months → days) | `app/item/[id].tsx` |
| Norwegian warranty rules (2 yr / 5 yr) | Implemented in n8n OCR workflow — **not** in the app |
| Grocery store keyword list | Port to `warrantyUtils.ts`, plan for extension |
