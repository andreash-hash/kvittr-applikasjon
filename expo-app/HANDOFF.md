# Kvittr Expo App — Handoff Document

## Status

All application code is complete. The app is ready for dependency installation,
local testing, and EAS build submission.

**Branch:** `claude/kvittr-migration-audit-IKz5U`

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI (for edge functions): `npm install -g supabase`

### Setup

```bash
cd expo-app
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
# EXPO_PUBLIC_RC_IOS_KEY (existing), EXPO_PUBLIC_RC_ANDROID_KEY (new — get from RC dashboard)

npm install
```

### Run on device / simulator

```bash
npx expo start          # opens Expo Go / dev client
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
```

> Push notifications require a physical device with Expo Dev Client
> (not Expo Go) because `expo-notifications` uses native modules.

### Run tests

```bash
npm test                # Jest with jest-expo preset
npm test -- --watch    # watch mode
```

---

## Database Migration

The migration file at `supabase/migrations/20260424000000_expo_push_migration.sql`
must be applied to the production Supabase project before the app ships.

```bash
# From expo-app/ directory (or repo root with --project-dir flag)
supabase db push --project-ref wdfxfhchugungurebbcc
```

What the migration does:
- Adds `profiles.expo_push_token` (replaces dead `fcm_token`)
- Adds 6 notification-flag columns to `receipts` (prevents duplicate pushes)
- Enables `pg_cron` and `pg_net` extensions
- Registers cron job `kvittr-daily-notifications` running at `08:00 Oslo` daily

---

## Deploy Edge Functions

```bash
supabase functions deploy send-expo-push --project-ref wdfxfhchugungurebbcc
supabase functions deploy process-receipt-ocr --project-ref wdfxfhchugungurebbcc
supabase functions deploy delete-account --project-ref wdfxfhchugungurebbcc
```

Set secrets in Supabase dashboard (Settings → Edge Functions → Secrets):
- `N8N_WEBHOOK_URL` — keep existing n8n URL during transition period

---

## Trigger Builds

### Development build (device testing)

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production build

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

> **iOS:** Uses existing `app.kvittr` bundle ID and existing Apple certificate.
> Build number is `52` (must be > 51, the last Capacitor build).

> **Android:** Fresh Play Console listing. `versionCode: 1`, package `app.kvittr`.
> Requires signing key setup in EAS (run `eas credentials` interactively).

### Submit to stores (do NOT run without explicit approval)

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## Known Issues / Next Steps

### Critical (must fix before launch)

1. **Android RevenueCat key** — `EXPO_PUBLIC_RC_ANDROID_KEY` is a placeholder.
   Get the real key from [RevenueCat dashboard](https://app.revenuecat.com) →
   Projects → Kvittr → Apps → Android. Set in `.env` and in EAS secrets.

2. **FCM → Expo push token migration** — existing users have `fcm_token` set but
   `expo_push_token` will be NULL until they open the new app. The daily cron
   job skips users without a valid `ExponentPushToken[…]` token, so no
   notifications until first open. No data loss, but users need to open the app
   once after update.

3. **RevenueCat iOS entitlement ID** — `showPaywallUI` in `src/lib/revenuecat.ts`
   shows the default paywall. Confirm the entitlement identifier matches
   what's configured in RevenueCat (currently assumed `premium`).

### Non-critical

4. **n8n → inline OCR** — `process-receipt-ocr` edge function currently proxies
   to the existing n8n webhook. Replace with direct GPT-4o Vision call when n8n
   is retired.

5. **Gift card remaining value** — n8n must write `gift_card_balance` back to DB.
   If n8n currently writes a different column name, update `storage.ts:30`
   (`remaining_value: r.gift_card_balance`).

6. **Deep link scheme** — `kvittr://` is configured in `app.config.ts`. Test
   `kvittr://verify-success` and `kvittr://reset-password` with a physical device
   after installing the dev build.

7. **EAS project ID** — `app.config.ts` has a placeholder `extra.eas.projectId`.
   Run `eas init` once to link the project and get the real UUID.

---

## File Structure

```
expo-app/
├── app/                        # expo-router screens
│   ├── _layout.tsx             # root layout (QueryClient, SafeArea, Toast)
│   ├── index.tsx               # onboarding gate → dashboard
│   ├── success.tsx             # post-payment confirmation
│   ├── verify-success.tsx      # email verification confirmation
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── reset-password.tsx
│   └── (app)/
│       ├── _layout.tsx         # tab navigator + push registration
│       ├── dashboard.tsx       # receipt list with filter tabs
│       ├── scan.tsx            # camera / gallery upload
│       ├── settings.tsx
│       ├── premium.tsx         # paywall screen
│       └── item/[id].tsx       # receipt detail
├── src/
│   ├── components/
│   │   ├── ui/                 # Button, Input, Card
│   │   ├── Logo.tsx
│   │   ├── Onboarding.tsx
│   │   ├── ReceiptCard.tsx
│   │   └── SwipeableCard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   useHaptics.ts
│   │   ├── usePremiumStatus.ts
│   │   └── usePushNotifications.ts
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client (AsyncStorage adapter)
│   │   ├── storage.ts          # Supabase CRUD (receipt_type→type mapping)
│   │   ├── guestStorage.ts     # AsyncStorage guest data
│   │   ├── scanLimit.ts        # FREE_MONTHLY_SCANS=2 gate
│   │   └── revenuecat.ts       # RC SDK wrapper
│   ├── types/
│   │   ├── database.ts         # Full DB TypeScript interface
│   │   └── receipt.ts          # Receipt, GuestReceipt
│   ├── utils/
│   │   ├── warrantyUtils.ts    # isGroceryStore, shouldShowWarranty (verbatim port)
│   │   ├── receiptStatus.ts    # calculateStatus, isExpiringSoon
│   │   ├── platform.ts         # isMobileApp, getMobilePlatform
│   │   └── __tests__/
│   │       └── warrantyUtils.test.ts
│   └── global.css              # NativeWind entry
├── supabase/
│   ├── migrations/
│   │   └── 20260424000000_expo_push_migration.sql
│   └── functions/
│       ├── send-expo-push/index.ts        # replaces FCM send-notification
│       ├── process-receipt-ocr/index.ts   # proxies to n8n, creates pending row
│       └── delete-account/index.ts
├── app.config.ts               # bundleId: app.kvittr, buildNumber: 52, versionCode: 1
├── eas.json
├── tailwind.config.js
├── babel.config.js
├── tsconfig.json
└── package.json
```
