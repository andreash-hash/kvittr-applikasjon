# Kvittr Expo App — Handoff Document

**Branch:** `claude/kvittr-migration-audit-IKz5U`
**Last updated:** 2026-04-27

---

## Production Status

| Component | Status | Notes |
|---|---|---|
| DB migration `20260424000000` | ✅ Applied | expo_push_token, notification flags, indexes |
| DB migration `20260425000000` | ✅ Applied | Completes 9 notification flags, renames gift_card_ columns |
| Edge fn `send-expo-push` | ✅ Deployed | Smoke test: `{"sent":0,"queued":0,"updated":0}` ✓ |
| Edge fn `process-receipt-ocr` | ⚠️ Needs redeploy | Rewritten to call Gemini directly (commit `8b2f4fe`) |
| Edge fn `delete-account` | ✅ Deployed | |
| pg_cron job `kvittr-daily-notifications` | ✅ Active | Runs 08:00 UTC daily |
| Supabase Vault secret `supabase_service_role_key` | ✅ Set | Used by cron job |
| `GEMINI_API_KEY` Supabase secret | ❌ Not yet set | **Must set before redeploying process-receipt-ocr** |

---

## What's Left Before Launch

### Must-do (in order)

**1. Set GEMINI_API_KEY in Supabase edge function secrets**
```powershell
supabase secrets set GEMINI_API_KEY=<your_key> --project-ref wdfxfhchugungurebbcc
```
Get the key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**2. Redeploy process-receipt-ocr** (after setting the secret)
```powershell
supabase functions deploy process-receipt-ocr --project-ref wdfxfhchugungurebbcc
```

**3. Set Android RevenueCat key**
- Get from RevenueCat dashboard → Projects → Kvittr → Apps → Android
- Add to `.env` as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- Add as EAS secret: `eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value <key>`

**4. EAS production build — iOS**
```powershell
eas build --profile production --platform ios
```
Uses bundle ID `app.kvittr`, build number `52` (> 51, the last Capacitor build).

**5. EAS production build — Android**
```powershell
eas build --profile production --platform android
```
Fresh Play Console listing. versionCode `1`, package `app.kvittr`.
Run `eas credentials` first to set up Android signing key.

**6. Submit to stores (explicit approval required before running)**
```powershell
eas submit --platform ios --latest
eas submit --platform android --latest
```

**7. Android closed testing setup**
- Create app in Google Play Console with package `app.kvittr`
- Upload AAB from step 5
- Create closed testing track, add internal testers

### Non-blocking but track before GA

- **RevenueCat entitlement ID** — `showPaywallUI` in `src/lib/revenuecat.ts` uses the
  default paywall. Confirm entitlement identifier matches RC dashboard (assumed `premium`).
- **FCM → Expo token migration** — existing users have `fcm_token` set but
  `expo_push_token` is NULL until first open of the new app. No notifications until
  first launch. No data loss.
- **Deep link smoke test** — after first dev build, test `kvittr://verify-success`
  and `kvittr://reset-password` on a physical device.
- **gift_card_balance column name** — `storage.ts:31` reads `r.gift_card_balance`.
  Confirm n8n (legacy) was writing to `gift_card_balance`; Gemini now writes it
  correctly from `gift_card_value`.

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI: download binary from https://github.com/supabase/cli/releases

### Setup
```bash
cd expo-app
cp .env.example .env
# Fill in: EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
npm install
```

### Run
```bash
npx expo start           # Metro bundler
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
```

> Push notifications and RevenueCat require a physical device with Expo Dev Client
> (not Expo Go). Build a dev client first: `eas build --profile development`.

### Tests
```bash
npm test
# 22 passing — warrantyUtils (isGroceryStore, shouldShowWarranty)
```

---

## Supabase Setup (already done — for reference)

### Migrations applied
```
supabase/migrations/
  20251106155626_…   (Lovable original)
  20251127103255_…   (Lovable original)
  20251202225533_…   (Lovable original)
  20251215211557_…   (Lovable original)
  20260424000000_expo_push_migration.sql          ✅ applied (e2e5a0d)
  20260425000000_complete_notification_flags.sql  ✅ applied (87d6c45)
```

### Edge functions deployed
```bash
supabase functions deploy send-expo-push --project-ref wdfxfhchugungurebbcc
supabase functions deploy process-receipt-ocr --project-ref wdfxfhchugungurebbcc  # redeploy needed
supabase functions deploy delete-account --project-ref wdfxfhchugungurebbcc
```

### Secrets required
| Secret | Where set | Status |
|---|---|---|
| `SUPABASE_URL` | auto-injected | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected | ✅ |
| `SUPABASE_ANON_KEY` | auto-injected | ✅ |
| `supabase_service_role_key` (Vault) | SQL editor | ✅ |
| `GEMINI_API_KEY` | Supabase secrets | ❌ needs setting |

---

## Architecture

```
expo-app/
├── app/                          # expo-router file-based routing
│   ├── _layout.tsx               # QueryClient, SafeArea, Toast, Android channel setup
│   ├── index.tsx                 # Onboarding gate → dashboard
│   ├── success.tsx               # Post-payment confirmation
│   ├── verify-success.tsx        # Email verification
│   ├── +not-found.tsx
│   ├── (auth)/                   # login, signup, reset-password
│   └── (app)/                    # Tab navigator
│       ├── _layout.tsx           # Tabs + push token registration
│       ├── dashboard.tsx         # Receipt list, filter tabs, swipe-to-delete
│       ├── scan.tsx              # Camera/gallery → Gemini OCR → item detail
│       ├── item/[id].tsx         # Receipt detail with realtime status
│       ├── settings.tsx
│       └── premium.tsx           # RevenueCat paywall
├── src/
│   ├── components/ui/            # Button, Input, Card
│   ├── components/               # Logo, Onboarding, ReceiptCard, SwipeableCard
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useHaptics.ts
│   │   ├── usePremiumStatus.ts
│   │   └── usePushNotifications.ts  # Expo push token, Android channel, deep-link
│   ├── lib/
│   │   ├── supabase.ts           # Client with AsyncStorage adapter
│   │   ├── storage.ts            # CRUD (receipt_type→type mapping)
│   │   ├── guestStorage.ts       # AsyncStorage guest mode
│   │   ├── scanLimit.ts          # Free tier gate (2 scans/month)
│   │   └── revenuecat.ts         # RevenueCat SDK wrapper
│   ├── types/                    # database.ts, receipt.ts
│   └── utils/
│       ├── warrantyUtils.ts      # isGroceryStore, shouldShowWarranty (verbatim port)
│       ├── receiptStatus.ts      # calculateStatus, isExpiringSoon
│       └── __tests__/warrantyUtils.test.ts
└── supabase/                     # now in repo root /supabase/, not here
```

```
supabase/                         # root-level (CLI reads this automatically)
├── config.toml                   # project_id + function registrations
├── migrations/                   # 4 Lovable + 2 Expo migrations
└── functions/
    ├── send-expo-push/           # Daily notification dispatch (Expo Push API)
    ├── process-receipt-ocr/      # Gemini 2.0 Flash vision OCR
    ├── delete-account/           # Hard-delete with storage cleanup
    └── send-notification/        # Legacy FCM (kept, not deployed)
```

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| `expo-notifications` + Expo Push Service | FCM Legacy API dead since June 2024 |
| Gemini 2.0 Flash for OCR | Replaces n8n webhook; direct, no extra infra |
| `AsyncStorage` auth adapter | Replaces `localStorage` (not available in RN) |
| `receipt_type` → `type` mapping in `storage.ts` | DB column name preserved, TS interface normalised |
| `pg_cron` + `pg_net` for scheduler | Replaces missing Capacitor notification scheduler |
| Vault for service role key in cron | Never stores secrets in plaintext SQL |
| Bundle ID `app.kvittr` unchanged | iOS live update — must match App Store record |
| Android `versionCode: 1` | Fresh Play Console listing |
| EAS projectId `9a9f44ff-d636-4619-a7aa-a04072918a34` | Set via `eas init` on 2026-04-27 |
