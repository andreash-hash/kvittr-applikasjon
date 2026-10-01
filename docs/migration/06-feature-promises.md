# 06 — Feature Promises vs. Delivered

## Website Accessibility Note

All five target URLs (`kvittr.app`, `kvittr.app/garanti`, `kvittr.app/bytterett`, `kvittr.app/gavekort`, `kvittr.app/kvitteringsapp`) returned **HTTP 403 Forbidden** when fetched programmatically. The server blocks non-browser requests (bot protection / Cloudflare).

The feature promises below are reconstructed from:
1. **In-app marketing copy** (Premium paywall, Settings screen, onboarding, banners)
2. **Task prompt description** ("The public site at kvittr.app promises…")
3. **DB schema and code logic** (what the app actually does)

Verify against the live site manually.

---

## Feature Promises (Inferred from In-App Copy and Task Description)

### Push Notifications

**Promise (site):** "Push notifications 7 and 3 days before expiry" (per task description)

**Promise (Settings UI string):** "Du mottar varsler 7 og 3 dager før utløp" (You will receive notifications 7 and 3 days before expiry)

**Promise (Premium paywall):** "Push-varsler 30 dager før utløp" (Push notifications 30 days before expiry)

**Delivered:** ❌ **Not working.** The `send-notification` Supabase edge function uses the FCM Legacy API (`https://fcm.googleapis.com/fcm/send`), which Google shut down in June 2024. All FCM Legacy calls return errors. Additionally, there is **no scheduler** that triggers the edge function — nothing calls it daily. Push notifications have never worked in production.

**Gap severity:** Critical. This is the most prominent advertised feature and it is completely broken.

---

### Warranty Tracking (Garanti)

**Promise:** Norwegian consumer law guarantees tracking. 2-year warranty for standard goods, 5 years for durable goods. Automatic calculation from purchase date.

**Delivered:** ✅ **Partially.** The warranty period is calculated by the n8n OCR workflow (not the app itself). The app correctly displays `warranty_until` and calculates countdown. The `shouldShowWarranty()` function correctly suppresses warranty for grocery stores. However:
- Warranty period calculation is opaque (inside n8n/AI prompt, not auditable from this repo).
- The `has_warranty` toggle in the UI lets users override, but the toggle label says "Har garanti / Varig forbruksvare" without distinguishing 2-year vs. 5-year — users cannot explicitly choose the duration.
- The `expiry_date` DB column has a buggy mapping in `storage.ts` (maps `gift_card_value` presence → `expiry_date = purchase_date`).

---

### Return Slip Tracking (Bytterett / Byttelapper)

**Promise:** Track return/exchange deadlines, get reminders before they expire.

**Delivered:** ✅ **Mostly.** `return_until` is displayed and countdown is shown. Expiry banners fire at 14 days. **Gap:** Return-slip notifications are subject to the same broken push notification system.

---

### Gift Card Tracking (Gavekort)

**Promise:** Track gift card balances and expiry dates, receive reminders before expiry.

**Delivered:** ✅ **Partially.** Gift cards are stored and displayed. Expiry countdown is shown. Remaining balance (`gift_card_balance`) is stored and displayed. **Gap:** `expiry_date` for gift cards is not reliably populated (buggy mapping in `storage.ts` described in `02-data-model.md`). Notifications are broken (same root cause). Gift card code (`gift_card_code`) is extracted by OCR but never shown in the UI.

---

### Receipt Scanning with AI OCR

**Promise:** Automatic extraction of shop name, product name, amount, and dates from a photo.

**Delivered:** ✅ **Working** when the n8n instance at `api.kvittr.app` is online. The app polls for completion and handles timeouts gracefully. Manual entry is available as fallback.

**Gap:** Single point of failure — if the Cloudflare Tunnel or n8n instance goes down, all scanning fails. No SLA monitoring observed.

---

### Cloud Storage and Cross-Device Sync

**Promise:** Receipts stored securely in the cloud, accessible across devices.

**Delivered:** ✅ Works for authenticated users via Supabase Postgres + Storage.

---

### Premium: Unlimited Scans

**Promise:** Free plan: 2 scans/month. Premium: unlimited.

**Delivered:** ✅ Enforced client-side via `profiles.scans_used_this_month`. **Gap:** Enforcement is client-side only with no server-side RLS enforcement on the `receipts` insert. A motivated user could bypass the limit by calling the Supabase API directly.

---

### RevenueCat In-App Purchase

**Promise:** Buy Premium via App Store / Google Play.

**Delivered:** ✅ iOS works (public key `appl_HmmhscVDvicXCGtVkIrgWWqRyBB`). ❌ **Android is not configured** — the Android RevenueCat key is the literal placeholder string `goog_YOUR_ANDROID_PUBLIC_KEY_HERE`. Google Play purchases will fail.

---

### Guest Mode

**Promise:** Try the app without an account (3 free scans).

**Delivered:** ✅ Guest mode works. Receipts stored in `localStorage`. Scan counter enforced locally.

---

### Dark Mode

**Promise:** (Implied by Settings screen)

**Delivered:** ✅ Three modes: light, dark, system.

---

## Summary of Gaps

| Feature | Status | Severity |
|---------|--------|----------|
| Push notifications (7 d / 3 d / 30 d before expiry) | ❌ Completely broken (FCM Legacy API dead + no scheduler) | Critical |
| Android RevenueCat / in-app purchase | ❌ Not configured (placeholder key) | High |
| Gift card `expiry_date` population | ⚠️ Buggy mapping in storage.ts | Medium |
| Gift card code display in UI | ⚠️ Extracted by OCR but not shown | Low |
| Scan limit server-side enforcement | ⚠️ Client-side only | Low |
| Warranty duration user control (2 yr vs 5 yr) | ⚠️ Toggle exists but doesn't distinguish 2/5 year | Low |
| Guide/affiliate content display | ⚠️ Generated by n8n but never shown in app | Low |
| Return slip / gift card notifications | ❌ Broken (same as push notifications) | Critical |
| n8n single point of failure | ⚠️ No fallback if Cloudflare/n8n goes down | Medium |
