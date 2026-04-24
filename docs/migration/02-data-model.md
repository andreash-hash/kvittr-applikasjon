# 02 — Data Model Snapshot

Source: `src/integrations/supabase/types.ts`  
Supabase project ref: `wdfxfhchugungurebbcc`

---

## Table: `profiles`

Linked 1-to-1 with `auth.users` via `id` (UUID).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL | FK → auth.users |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |
| `onboarding_completed` | boolean | NULL | Set to true after onboarding; synced from localStorage on login |
| `fcm_token` | text | NULL | **⚠️ FLAG** — FCM token for push notifications. Used by `send-notification` edge function. Stored by `useNativePushNotifications` hook. See duplication note below. |
| `subscription_tier` | text | NULL | Values observed: `'free'`, `'premium'`. Set by RevenueCat sync. |
| `subscription_status` | text | NULL | Values observed: `'active'`, `'expired'`. Set by RevenueCat sync. |
| `subscription_started_at` | timestamptz | NULL | Set on each RevenueCat sync when premium is active. |
| `subscription_expires_at` | timestamptz | NULL | Populated from RevenueCat `expirationDate`. |
| `scans_used_this_month` | integer | NULL | Rolling counter for free-tier monthly scan limit (max 2). |
| `scans_reset_date` | timestamptz | NULL | Date when `scans_used_this_month` was last reset to 0; resets every 30 days. |

---

## Table: `receipts`

Core table. Every scanned item (receipt, gift card, return slip).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL | |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `receipt_type` | text | NULL | **⚠️ FLAG** — DB column is `receipt_type`; the application code uses `type`. `storage.ts:getReceipts` maps `r.receipt_type → r.type`. Values: `'receipt'`, `'return_slip'`, `'gift_card'`, `'warranty'` (legacy). |
| `shop_name` | text | NULL | |
| `product_name` | text | NULL | |
| `amount` | numeric | NULL | Purchase amount in NOK |
| `purchase_date` | date | NULL | |
| `warranty_until` | date | NULL | End of warranty period. Derived by OCR/n8n. |
| `return_until` | date | NULL | Return/exchange deadline for `return_slip` type or receipt with `has_warranty`. |
| `expiry_date` | date | NULL | **⚠️ FLAG** — Legacy field. `storage.ts` maps `gift_card_value` (if truthy) to `expiry_date = purchase_date`, which is semantically wrong. Superseded by `return_until` for return slips. For gift cards, `expiry_date` is used in `ItemDetail.tsx` but not written back by `saveReceipt`. |
| `gift_card_value` | numeric | NULL | Original gift card face value (NOK). Mapped to `amount` via `storage.ts`. |
| `gift_card_balance` | numeric | NULL | Remaining balance (NOK). Mapped to `remaining_value`. |
| `gift_card_code` | text | NULL | **⚠️ FLAG** — Card code/PIN. Populated by OCR but never displayed in UI. Appears unused. |
| `has_warranty` | boolean | NULL | User override for warranty display. `null` = auto-detect via `isGroceryStore()`. |
| `status` | text | NULL | Values: `'active'`, `'expiring_soon'`, `'expired'`, `'used'`. Calculated client-side by `calculateStatus()` in `storage.ts`; written to DB on save. |
| `is_used` | boolean | NULL | Manual "mark as used" flag (gift cards, return slips). |
| `processing_status` | text | NULL | Values: `'pending'`, `'completed'`, `'failed'`. Set to `'pending'` on upload; updated by n8n OCR webhook. |
| `image_url` | text | NOT NULL | Public URL in Supabase Storage bucket `receipt-images`. |
| `raw_ocr_data` | jsonb | NULL | Raw OCR JSON returned by n8n/Gemini. Not displayed in UI. |
| `archived` | boolean | NULL | **⚠️ FLAG** — Appears unused in current code. Archiving is done via `is_used = true` instead. Likely legacy. |
| `category` | text | NULL | Product category from OCR. Used internally; not displayed in UI. Potentially relevant for warranty period logic. |
| `notes` | text | NULL | Free-text notes. Not exposed in current UI. |
| `maintenance_priority` | text | NULL | **⚠️ FLAG** — Not used in any UI code. Likely legacy or planned feature. |
| `guide_generated` | boolean | NULL | **⚠️ FLAG** — Relates to `guides` table content generation. No UI code references this. Likely automated by n8n. |
| `guide_url` | text | NULL | **⚠️ FLAG** — Same as above. Not displayed. |
| `used_date` | date | NULL | **⚠️ FLAG** — Date item was marked as used. Never populated in current code. |
| `updated_at` | timestamptz | NULL | |
| `warranty_notified_7d` | boolean | NULL | **⚠️ FLAG (see below)** |
| `warranty_notified_30d` | boolean | NULL | **⚠️ FLAG (see below)** |

---

## Table: `notifications`

Log of sent push notifications.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL | |
| `user_id` | uuid | NOT NULL | |
| `receipt_id` | uuid | NULL | FK → receipts.id |
| `sent_at` | timestamptz | NULL | |
| `notification_type` | text | NULL | Value written by edge function: `'expiry_warning'` |
| `status` | text | NULL | Value written by edge function: `'sent'` |
| `type` | text | NULL | **⚠️ FLAG** — Duplicate of `notification_type`. Both columns exist; only `notification_type` is written by current code. `type` appears unused. |

---

## Table: `user_settings`

Per-user notification preferences.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `user_id` | uuid | NOT NULL | PK |
| `created_at` | timestamptz | NULL | |
| `notification_enabled` | boolean | NULL | Whether push notifications are enabled |
| `notification_time` | text | NULL | Preferred time of day for notifications (e.g. `"09:00"`) |
| `push_token` | text | NULL | **⚠️ FLAG** — See duplication note below |

---

## Table: `guides`

SEO content / affiliate guides. Appears to be generated by n8n automation.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL | |
| `product_category` | text | NOT NULL | |
| `product_name` | text | NULL | |
| `brand` | text | NULL | |
| `content` | text | NULL | Article/guide text |
| `affiliate_links` | jsonb | NULL | Affiliate URL mapping |
| `views` | integer | NULL | Analytics counter |
| `clicks` | integer | NULL | Affiliate click counter |
| `conversions` | integer | NULL | Affiliate conversion counter |
| `created_at` | timestamptz | NULL | |

**Note:** No app screen reads from or writes to `guides`. It is written by n8n workflows and likely served by a separate web frontend or SEO site.

---

## DB Functions

| Function | Signature | Notes |
|----------|-----------|-------|
| `delete_user_account` | `() → void` | Exists in schema but the `delete-account` edge function bypasses it, performing deletes directly with the service-role key. Likely a legacy or duplicate implementation. |

---

## Flags and Inconsistencies

### `warranty_notified_7d` vs `warranty_notified_30d`

The columns on `receipts` are `warranty_notified_7d` and `warranty_notified_30d`.

- The landing page and `Settings.tsx` UI state the notification timing as **7 and 3 days** before expiry ("Du mottar varsler 7 og 3 dager før utløp").
- The `Premium.tsx` paywall lists **"Push-varsler 30 dager før utløp"** as a Premium feature.
- The `Settings.tsx` notification settings panel shows toggles for **30-day** and **7-day** alerts.
- The DB column `warranty_notified_30d` aligns with Settings/Premium (30 d), not the 3-day figure mentioned in the Settings description string.
- **The `send-notification` edge function is never called by a scheduler**, so both columns are effectively never set. They represent intent, not reality.
- **Recommendation for Expo migration:** Replace `warranty_notified_30d` with `warranty_notified_3d` to match the Settings UI copy. Add a scheduler (Supabase `pg_cron` or n8n) that fires daily, queries receipts expiring in exactly 7 and 3 days, checks that the corresponding notified flag is false, sends the Expo push, and sets the flag.

### `profiles.fcm_token` vs `user_settings.push_token`

Two separate columns store push tokens:

- `profiles.fcm_token` — written by `useNativePushNotifications.ts` and `PushNotificationService.ts`. Read by `send-notification` edge function.
- `user_settings.push_token` — exists in the DB schema but **no app code reads or writes it**. It is referenced only in the `delete-account` edge function (which deletes the whole `user_settings` row).

**Recommendation for Expo migration:** Drop `user_settings.push_token`. Add `profiles.expo_push_token` (text, nullable) to replace `profiles.fcm_token`. Remove `profiles.fcm_token` once all users have migrated.

### `receipt_type` vs `type`

The DB column is `receipt_type`; every other layer of the app (TypeScript interface, UI, filter logic) uses `type`. The mapping happens silently in `storage.ts:getReceipts`. This is a persistent source of confusion. Consider renaming the DB column to `type` in a migration (rename only, no data change needed).

### Legacy/Duplicate Fields on `receipts`

| Field | Status |
|-------|--------|
| `archived` | Unused; archiving done via `is_used = true` |
| `maintenance_priority` | Unused in UI |
| `guide_generated` / `guide_url` | Backend-only; no UI exposure |
| `used_date` | Never populated |
| `gift_card_code` | Populated by OCR; never displayed |
| `expiry_date` (DB column) | Superseded by `return_until`; legacy mapping in `storage.ts` is buggy (maps `gift_card_value` presence → `expiry_date = purchase_date`) |
| `notifications.type` | Duplicate of `notification_type`; never written |
