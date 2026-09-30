# 01 — Repo Inventory

## Routes (`src/pages/`)

| File | Path | Description |
|------|------|-------------|
| `Index.tsx` | `/` | Entry point: checks `localStorage.onboarding_completed`; if unset shows `<Onboarding />`; redirects to `/dashboard` in all other cases (guest or authenticated). |
| `Dashboard.tsx` | `/dashboard` | Main receipt list. Supports guest and authenticated modes. Provides category filters (alle / kvitteringer / gavekort / bytte / arkiv / expiring), search, pull-to-refresh, swipe-to-delete/archive, scan limit banners, and a "Skann ny" FAB. |
| `Scan.tsx` | `/scan` | Camera/gallery capture flow. Supports Capacitor native camera, mobile browser file-input, and desktop webcam. Compresses and enhances the image, uploads to Supabase Storage, creates a `receipts` row, fires the OCR webhook, and navigates to `/item/:id`. Enforces guest scan limits and free-user monthly caps. |
| `ItemDetail.tsx` | `/item/:id` | Receipt detail / edit view. Polls for OCR completion (2 s interval, 25 s timeout). Allows editing all fields. Shows warranty/return countdown. Supports image zoom via `<ImageViewer>`. Retry button re-fires the OCR webhook. |
| `Settings.tsx` | `/settings` | User settings: theme toggle (light/dark/system), push-notification toggle (Premium only, native only), notification timing (30 d / 7 d), subscription management via RevenueCat, password change, account deletion, privacy/terms links. |
| `Premium.tsx` | `/premium` | Upgrade / subscription screen. Loads RevenueCat offerings on native, purchases via `Purchases.purchasePackage`, syncs status to Supabase, shows customer centre. Blocks purchase on web. |
| `Login.tsx` | `/login` | Email + password login via Supabase Auth. Includes resend-verification-email option and password-reset dialog. |
| `Signup.tsx` | `/signup` | Account creation. Password strength validation (min 8 chars, upper, lower, digit). Shows confirmation email dialog. |
| `ResetPassword.tsx` | `/reset-password` | Password reset form (uses Supabase `updateUser`). |
| `VerifySuccess.tsx` | `/verify-success` | Confirmation screen shown after email verification. |
| `Success.tsx` | `/success?type=` | Transient 2-second green checkmark screen shown after saving a receipt/gift-card/return-slip. |
| `NotFound.tsx` | `*` | 404 fallback page. |
| `IconGenerator.tsx` | `/icon-generator` | Internal dev tool to render the 1024×1024 app icon as an HTML element (not a user-facing route). |

---

## Custom Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useNativePushNotifications.ts` | Detects native platform via Capacitor, checks whether an FCM token already exists in `profiles.fcm_token`, requests `@capacitor/push-notifications` permissions, registers with FCM/APNs, saves the token to Supabase, handles foreground notification display, and handles notification tap → deep-link to `/item/:id`. Also exposes `disableNotifications()` (clears token from DB). |
| `usePremiumStatus.ts` | Checks premium status: on native queries RevenueCat `getCustomerInfo()` (entitlements: `pro`, `premium`, `Premium`); on web queries `profiles.subscription_tier`. Falls back to Supabase if RevenueCat call fails. Returns `{ isPremium, loading, userId, refresh }`. |
| `useHaptics.ts` | Thin wrapper around `@capacitor/haptics`. Exports `impact(style)`, `notification(type)`, `selectionStart/Changed/End()`. No-ops on web. |
| `use-mobile.tsx` | Media-query hook: returns `true` when viewport width < 768 px. |
| `use-toast.ts` | Re-export of shadcn/ui toast hook. |

---

## Supabase Edge Functions (`supabase/functions/`)

### `send-notification`

**Trigger:** HTTP POST (no scheduler — must be called externally)

**Input (JSON body):**
```json
{
  "receipt_id": "uuid",   // optional
  "user_id": "uuid",      // required
  "message": "string",    // required — notification body
  "title": "string"       // optional, defaults to "Kvittr"
}
```

**Processing:**
1. Fetches `profiles.fcm_token` for `user_id`.
2. Calls the **FCM Legacy API** (`https://fcm.googleapis.com/fcm/send`) with `Authorization: key=<FIREBASE_SERVER_KEY>`.
3. On token-invalid errors (`InvalidRegistration`, `NotRegistered`, `MismatchSenderId`) clears the token in `profiles`.
4. If `receipt_id` is supplied, inserts a row into `notifications` with `notification_type = 'expiry_warning'` and `status = 'sent'`.

**Output (JSON):**
```json
{ "success": true, "message_id": "...", "multicast_id": "..." }
```

**Known defect:** Uses the FCM Legacy API which Google shut down in June 2024. All calls will fail. There is also **no scheduler** — this function is never invoked automatically.

---

### `delete-account`

**Trigger:** HTTP POST, must include `Authorization: Bearer <user_jwt>` header.

**Input:** No body required.

**Processing:**
1. Verifies user identity via Supabase `auth.getUser()` with the supplied JWT.
2. Uses service-role client to delete rows in: `receipts`, `notifications`, `user_settings`, `profiles` (in that order, all `WHERE user_id = $1`).
3. Calls `auth.admin.deleteUser(user.id)` to remove the auth record.

**Output (JSON):**
```json
{ "success": true, "message": "Account deleted successfully" }
```

---

## External Services

| Service | Integration point | Notes |
|---------|------------------|-------|
| **Supabase** (project `wdfxfhchugungurebbcc`) | `@supabase/supabase-js` v2, Auth, Postgres, Storage (`receipt-images`), Edge Functions, Realtime | Core backend |
| **Firebase / FCM** | `firebase` npm package (v12), `public/firebase-messaging-sw.js`, `src/lib/firebase.ts` | Web-push service worker + FCM token management. Firebase project: `kvittr-push` (ID `1:191789668682`). **Only used on web** — native uses Capacitor push. The FCM Legacy send API in `send-notification` edge function is dead since June 2024. |
| **RevenueCat** | `@revenuecat/purchases-capacitor` + `@revenuecat/purchases-capacitor-ui` | In-app purchases. iOS public key: `appl_HmmhscVDvicXCGtVkIrgWWqRyBB`. Android key: placeholder `goog_YOUR_ANDROID_PUBLIC_KEY_HERE` — **not configured**. Product ID: `kvittr.premium`. Entitlements checked: `pro`, `premium`, `Premium`. |
| **n8n (via `api.kvittr.app`)** | `fetch('https://api.kvittr.app/webhook/receipt-ocr', ...)` in `Scan.tsx` and `ItemDetail.tsx` | OCR processing webhook. See `05-n8n-workflows.md`. |
| **Capacitor** | `@capacitor/core`, `@capacitor/camera`, `@capacitor/push-notifications`, `@capacitor/haptics`, `@capacitor/filesystem`, `@capacitor/browser` | Native bridge. App ID: `app.kvittr`. iOS build number: 51. |
| **Lovable** | `lovable-tagger` devDependency, Lovable Supabase integration | The Lovable platform generated and maintains the web project. Build toolchain: Vite + React. |
| **Cloudflare** | `api.kvittr.app` is a Cloudflare-tunnelled domain pointing to the n8n instance | No direct SDK dependency; just a DNS/tunnel config. |
| **Gemini / ElevenLabs** | **Not found in codebase.** No imports, API calls, or references discovered. Possibly used inside the n8n workflow (not accessible in this repo). | Flag: confirm with backend team. |

---

## n8n Webhook URLs Referenced in Codebase

| URL | Files | Trigger |
|-----|-------|---------|
| `https://api.kvittr.app/webhook/receipt-ocr` | `src/pages/Scan.tsx:441`, `src/pages/ItemDetail.tsx:220` | POST after image upload (new scan) and on manual retry |

**Other `kvittr.app` references (non-n8n):**

| URL | Files | Purpose |
|-----|-------|---------|
| `https://kvittr.app/privacy` | `Settings.tsx:533`, (inferred from Premium.tsx) | Privacy policy page |
| `https://kvittr.app/terms` | `Settings.tsx:541`, `Premium.tsx:581` | Terms of service page |
| `https://wdfxfhchugungurebbcc.supabase.co/functions/v1/delete-account` | `Settings.tsx:143` | Supabase edge function (not n8n) |
