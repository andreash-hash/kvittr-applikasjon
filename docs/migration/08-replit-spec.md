# 08 — Replit Handoff Spec

A self-contained guide for a junior developer with Replit access to build the new Kvittr Expo app.

---

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Expo SDK | Latest stable (≥ 53) |
| Language | TypeScript | ^5.x |
| Navigation | expo-router (file-based) | v4+ |
| Styling | NativeWind v4 | v4.x |
| Database / Auth | Supabase JS v2 | ^2.x |
| Push notifications | expo-notifications | Latest |
| Camera / gallery | expo-image-picker | Latest |
| File system | expo-file-system | Latest |
| Image manipulation | expo-image-manipulator | Latest |
| Haptics | expo-haptics | Latest |
| In-app browser | expo-web-browser | Latest |
| In-app purchases | react-native-purchases + react-native-purchases-ui | ^8.x |
| HTTP / data fetching | @tanstack/react-query v5 | ^5.x |
| Forms | react-hook-form | ^7.x |
| Date utilities | date-fns | ^3.x |
| Icons | lucide-react-native | Latest |
| Toast | react-native-toast-message | ^2.x |
| Storage (AsyncStorage) | @react-native-async-storage/async-storage | ^2.x |
| Build | EAS Build | Latest CLI |

---

## Folder Structure

```
kvittr-expo/
├── app/                          # expo-router pages (file-based routing)
│   ├── _layout.tsx               # Root layout: providers, RevenueCat init, push setup
│   ├── index.tsx                 # Entry: check onboarding → /dashboard
│   ├── (auth)/
│   │   ├── login.tsx             # Login screen
│   │   ├── signup.tsx            # Sign-up screen
│   │   └── reset-password.tsx    # Password reset
│   ├── (app)/
│   │   ├── _layout.tsx           # Authenticated layout (redirect to login if no session)
│   │   ├── dashboard.tsx         # Main receipt list
│   │   ├── scan.tsx              # Camera / gallery capture
│   │   ├── item/
│   │   │   └── [id].tsx          # Receipt detail / edit
│   │   ├── settings.tsx          # Settings screen
│   │   └── premium.tsx           # Upgrade screen
│   ├── success.tsx               # 2-second success screen
│   ├── verify-success.tsx        # Email verification confirmation
│   └── +not-found.tsx            # 404 fallback
├── src/
│   ├── components/               # Reusable components
│   │   ├── ReceiptCard.tsx
│   │   ├── SwipeableCard.tsx
│   │   ├── PullToRefresh.tsx
│   │   ├── Logo.tsx
│   │   ├── Onboarding.tsx
│   │   └── ui/                   # Button, Input, Card, etc. (NativeWind-based)
│   ├── hooks/
│   │   ├── usePushNotifications.ts   # Expo-native push hook (replaces useNativePushNotifications)
│   │   ├── usePremiumStatus.ts       # Port from Capacitor version
│   │   └── useHaptics.ts             # Port from Capacitor version (use expo-haptics)
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client with AsyncStorage adapter
│   │   ├── revenuecat.ts             # react-native-purchases wrapper
│   │   ├── storage.ts                # Receipt CRUD (port from Capacitor version)
│   │   ├── guestStorage.ts           # AsyncStorage-based guest receipts
│   │   └── scanLimit.ts              # Monthly scan limit (port verbatim)
│   ├── utils/
│   │   ├── warrantyUtils.ts          # isGroceryStore + shouldShowWarranty (port verbatim)
│   │   ├── receiptStatus.ts          # calculateStatus (port verbatim)
│   │   └── platform.ts               # isMobileApp, getMobilePlatform
│   └── types/
│       └── receipt.ts                # Receipt, GuestReceipt interfaces
├── supabase/
│   └── functions/                # Existing edge functions (unchanged for now)
│       ├── send-notification/    # UPDATE: use Expo Push Service (see below)
│       └── delete-account/       # Unchanged
├── assets/                       # App icons, splash screens
├── app.json                      # Expo config (see below)
├── eas.json                      # EAS Build config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
└── .env                          # Environment variables
```

---

## `app.json` Skeleton

```json
{
  "expo": {
    "name": "Kvittr",
    "slug": "kvittr",
    "version": "1.0.0",
    "scheme": "kvittr",
    "orientation": "portrait",
    "ios": {
      "bundleIdentifier": "app.kvittr",
      "buildNumber": "52",
      "backgroundColor": "#F5F1E8",
      "infoPlist": {
        "NSCameraUsageDescription": "Kvittr trenger kameratilgang for å scanne kvitteringer.",
        "NSPhotoLibraryUsageDescription": "Kvittr trenger tilgang til bilder for å laste opp kvitteringer."
      },
      "entitlements": {
        "aps-environment": "production",
        "com.apple.developer.associated-domains": ["applinks:kvittr.app"]
      }
    },
    "android": {
      "package": "app.kvittr",
      "adaptiveIcon": { "foregroundImage": "./assets/icon.png" },
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      ["expo-image-picker", {
        "photosPermission": "Kvittr trenger tilgang til bilder."
      }],
      "react-native-purchases"
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#6366F1"
    }
  }
}
```

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://wdfxfhchugungurebbcc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_HmmhscVDvicXCGtVkIrgWWqRyBB
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<get from RevenueCat dashboard>
```

**What is NOT needed (removed from Capacitor version):**
- Firebase API key, project ID, app ID, messaging sender ID
- VAPID key
- `FIREBASE_SERVER_KEY` Supabase secret

---

## Supabase Client Setup

`src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './types'; // copy types.ts from Capacitor repo

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

## Expo Push Notification Registration Flow

This replaces `useNativePushNotifications.ts` from the Capacitor app.

`src/hooks/usePushNotifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  // Only works on physical devices
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get Expo Push Token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '<your-expo-project-id>', // from app.json or EAS
  });

  const expoPushToken = tokenData.data; // "ExponentPushToken[...]"

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Save to Supabase profiles.expo_push_token
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ expo_push_token: expoPushToken })
      .eq('id', user.id);
  }

  return expoPushToken;
};

export const useNotificationDeepLink = () => {
  // Handle notification tap → navigate to receipt
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const receiptId = response.notification.request.content.data?.receipt_id;
      if (receiptId) {
        router.push(`/item/${receiptId}`);
      }
    });
    return () => subscription.remove();
  }, []);
};
```

**Database change required:**
```sql
-- Run in Supabase SQL editor
ALTER TABLE profiles ADD COLUMN expo_push_token text;
```

---

## Updated `send-notification` Edge Function

Replace the FCM Legacy API call with the Expo Push Service:

```typescript
// supabase/functions/send-notification/index.ts (NEW)
const expoToken = profileData.expo_push_token;
if (!expoToken) {
  return new Response(JSON.stringify({ error: 'No Expo push token' }), { status: 404 });
}

const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: expoToken,
    title: title || 'Kvittr',
    body: message,
    data: receipt_id ? { receipt_id } : {},
    sound: 'default',
    badge: 1,
  }),
});

const expoData = await expoResponse.json();
// Check expoData.data.status === 'ok'
```

No authentication header needed for Expo Push Service — the `ExponentPushToken` itself is the credential.

---

## RevenueCat Setup

`src/lib/revenuecat.ts` (simplified):

```typescript
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

export const initializeRevenueCat = async (userId?: string) => {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  await Purchases.configure({ apiKey, appUserID: userId });
};

export const syncSubscriptionStatus = async (userId: string) => {
  const { customerInfo } = await Purchases.getCustomerInfo();
  const activeEntitlements = customerInfo.entitlements.active;
  const isPremium = Object.keys(activeEntitlements).length > 0;
  const expirationDate = Object.values(activeEntitlements)[0]?.expirationDate;

  await supabase.from('profiles').update({
    subscription_tier: isPremium ? 'premium' : 'free',
    subscription_status: isPremium ? 'active' : 'expired',
    subscription_expires_at: expirationDate ?? null,
  }).eq('id', userId);
};
```

---

## Warranty Logic (Copy Verbatim)

See `docs/migration/03-warranty-logic.md` for the full source.

Create `src/utils/warrantyUtils.ts` with exactly:

```typescript
export function isGroceryStore(shopName: string | undefined): boolean {
  if (!shopName) return false;
  const foodKeywords = [
    'rema', 'kiwi', 'coop', 'meny', 'bunnpris', 'joker', 'spar', 'europris',
    'extra', 'mega', 'prix', 'marked', 'big bite', 'restaurant', 'cafe', 'mat'
  ];
  return foodKeywords.some(kw => shopName.toLowerCase().includes(kw));
}

export function shouldShowWarranty(
  hasWarranty: boolean | null | undefined,
  shopName: string | undefined,
  receiptType: string
): boolean {
  if (receiptType === 'gift_card' || receiptType === 'return_slip') return false;
  if (hasWarranty === true) return true;
  if (hasWarranty === false) return false;
  return !isGroceryStore(shopName);
}
```

Create `src/utils/receiptStatus.ts` with the `calculateStatus` function from `src/lib/storage.ts:96-140` (see `03-warranty-logic.md`, section 3).

---

## Data Model Reference

See `docs/migration/02-data-model.md` for the full schema.

Key points for the new app:
- DB column is `receipt_type`, TypeScript interface uses `type` — keep the same mapping in `storage.ts`.
- Prefer `warranty_until` and `return_until` over legacy fields (`expiry_date`, `warranty_expires`, `return_by`).
- `profiles.expo_push_token` (new column — add migration) replaces `profiles.fcm_token`.
- `user_settings.push_token` — ignore entirely, do not read or write.

---

## Route Mapping (react-router-dom → expo-router)

| Old route | New file |
|-----------|----------|
| `/` | `app/index.tsx` |
| `/login` | `app/(auth)/login.tsx` |
| `/signup` | `app/(auth)/signup.tsx` |
| `/reset-password` | `app/(auth)/reset-password.tsx` |
| `/dashboard` | `app/(app)/dashboard.tsx` |
| `/scan` | `app/(app)/scan.tsx` |
| `/item/:id` | `app/(app)/item/[id].tsx` |
| `/settings` | `app/(app)/settings.tsx` |
| `/premium` | `app/(app)/premium.tsx` |
| `/success` | `app/success.tsx` |
| `/verify-success` | `app/verify-success.tsx` |
| `/icon-generator` | Delete — dev tool only |

---

## Notification Scheduler (Must Build — Currently Missing)

The current app has **no scheduler**. You must add one before launch. Simplest approach using Supabase `pg_cron`:

```sql
-- Install pg_cron in Supabase dashboard (Database → Extensions)
SELECT cron.schedule(
  'send-expiry-notifications',
  '0 7 * * *',  -- daily at 07:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://wdfxfhchugungurebbcc.supabase.co/functions/v1/send-notification',
    headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}',
    body := to_jsonb(row_to_json(r))
  )
  FROM (
    SELECT r.id AS receipt_id, r.user_id,
           'Garanti for ' || r.shop_name || ' utløper om 7 dager!' AS message
    FROM receipts r
    JOIN profiles p ON p.id = r.user_id
    WHERE p.subscription_tier = 'premium'
      AND p.expo_push_token IS NOT NULL
      AND r.warranty_notified_7d IS NOT TRUE
      AND r.warranty_until::date = CURRENT_DATE + INTERVAL '7 days'
  ) r
  $$
);
```

Repeat for 3-day window (`warranty_notified_3d` — add column), and for `return_until`.

---

## EAS Build Configuration (`eas.json`)

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Key Differences from the Capacitor App

1. **No Firebase SDK** — remove all imports of `firebase/*` and `firebase-messaging-sw.js`.
2. **No Capacitor** — remove all `import('@capacitor/*')` dynamic imports.
3. **AsyncStorage instead of localStorage** — all `localStorage.setItem/getItem` calls must become `await AsyncStorage.setItem/getItem`.
4. **`window.location.href` navigation** — replace with `router.push()` from expo-router throughout.
5. **CSS classes** — Tailwind class strings work with NativeWind on React Native components, but `<div>`, `<span>`, `<p>`, `<button>`, `<input>` must all become `<View>`, `<Text>`, `<Pressable>`, `<TextInput>` etc.
6. **`safe-area-inset-*` CSS env vars** — replace with `useSafeAreaInsets()` from `react-native-safe-area-context`.
7. **`differenceInDays`, `format`, `nb` locale from date-fns** — import the same way; works in RN.
8. **Image compression** — replace `browser-image-compression` with `expo-image-manipulator`.
9. **Webcam modal** — delete entirely; not applicable to mobile.
