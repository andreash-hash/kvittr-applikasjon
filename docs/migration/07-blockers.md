# 07 — Migration Blockers

## 1. RevenueCat SDK Swap

**Current:** `@revenuecat/purchases-capacitor` + `@revenuecat/purchases-capacitor-ui`  
**Target:** `react-native-purchases` + `react-native-purchases-ui`

**What stays the same:**
- iOS public API key: `appl_HmmhscVDvicXCGtVkIrgWWqRyBB` — unchanged; already in App Store Connect.
- Entitlement identifiers: check for `pro`, `premium`, `Premium` (any active entitlement) — keep the same check logic.
- Product ID: `kvittr.premium` — unchanged in App Store Connect and Google Play Console.
- `syncSubscriptionStatus()` logic writing to `profiles` table — port verbatim.

**What must be done:**
- Obtain the Android RevenueCat public key from the RevenueCat dashboard (the Capacitor app has a placeholder: `goog_YOUR_ANDROID_PUBLIC_KEY_HERE`). This is a blocker for Android Premium purchases.
- Replace all `Purchases.configure({ apiKey, appUserID })` with the React Native SDK equivalent `Purchases.configure({ apiKey, appUserID })` (API is nearly identical).
- Replace `RevenueCatUI.presentPaywall()` / `presentCustomerCenter()` with `RevenueCatUI.presentPaywallIfNeeded()` / `RevenueCatUI.presentCustomerCenter()` from `react-native-purchases-ui`.
- Add native module setup in `app.json` (Expo config plugin or bare workflow setup for RevenueCat).

**Risk:** Medium. The React Native SDK is mature and well-documented. The main risk is the missing Android key and ensuring the Expo config plugin is set up correctly for EAS Build.

---

## 2. Deep Links / Universal Links

**Current behaviour:** When a user taps a push notification, `useNativePushNotifications.ts` reads `notification.data.receipt_id` and navigates via `window.location.href = /item/${data.receipt_id}`.

**Expo equivalent:**  
In Expo Router, deep links map to file-based routes. `app/item/[id].tsx` corresponds to the path `kvittr://item/<id>` (custom scheme) or `https://kvittr.app/item/<id>` (universal link).

**What must be done:**
1. Configure `expo.scheme = "kvittr"` in `app.json` for custom URL scheme.
2. Configure Universal Links (iOS) and App Links (Android) pointing to `https://kvittr.app/item/[id]`.
3. The notification payload from the Expo Push Service must include `data: { receipt_id: "<uuid>" }`.
4. In the Expo notification handler, use `router.push(\`/item/${data.receipt_id}\`)` on notification tap.
5. Ensure the `kvittr.app` domain hosts the Apple App Site Association file (`/.well-known/apple-app-site-association`) and Android Asset Links file (`/.well-known/assetlinks.json`).

**Risk:** Medium. Universal link setup requires a deployed web server change at `kvittr.app`. If this is a Cloudflare Pages or similar static site, the association files need to be added.

**Backward compatibility:** Existing users who tap notifications from the old app must still land in the right place. Since the deep link scheme changes from Capacitor's `com.kvittr.app://` to `kvittr://` (or universal links), this is a one-time break. Because push notifications were never working, there are no existing notification deep links to break.

---

## 3. Existing User Data and FCM Tokens

**The problem:** Production Supabase has `profiles.fcm_token` populated with FCM device tokens for all users who enabled push notifications. These tokens are:
1. Useless for Expo Push Service (which uses Expo Push Tokens, not raw FCM tokens).
2. Invalid after the FCM Legacy API was shut down in June 2024.
3. Potentially stale even for FCM v1 API (tokens expire and rotate).

**Migration plan:**
1. **Do not attempt to migrate FCM tokens.** They cannot be converted to Expo Push Tokens.
2. Add a new column `profiles.expo_push_token` (text, nullable).
3. On first launch of the new Expo app:
   - Call `Notifications.getExpoPushTokenAsync()` from `expo-notifications`.
   - Save the returned `ExponentPushToken[...]` to `profiles.expo_push_token`.
4. Update `send-notification` edge function to read `expo_push_token` instead of `fcm_token`.
5. After migration is stable (all active users on new app version), run a SQL migration to `DROP COLUMN profiles.fcm_token`.
6. **Notify users** in the new app's onboarding/settings screen that they should re-enable push notifications if they had them previously.

**No production data is lost** — receipt data, subscriptions, and user accounts are unaffected.

---

## 4. App Store / Play Store Submission

**Requirement:** Must keep bundle ID `app.kvittr` and submit as an **update** to the existing listing, not a new app. The existing review history, ratings, and subscriber base must be preserved.

**What this means:**
- `app.json` must have `expo.ios.bundleIdentifier = "app.kvittr"` and `expo.android.package = "app.kvittr"`.
- The iOS build number must increment past the current Capacitor build number of **51**: set `expo.ios.buildNumber = "52"` (or higher).
- The Android `versionCode` must increment past whatever the current Play Store value is (check Play Console for the current `versionCode` — it is not in this repo).
- EAS Build must be configured with the correct Apple Team ID and distribution certificate.
- The Apple App Site Association file for Universal Links must be signed by the same team.

**Risk:** Low if bundle IDs match exactly. The main risk is Apple App Review potentially requiring a review of the Expo SDK migration as a "significant change." Budget 1-2 weeks for review.

**Google Play:** Android FCM key (RevenueCat placeholder) must be resolved before any Android build can process in-app purchases.

---

## 5. Capacitor Plugins Without Expo Equivalents

| Plugin | Status |
|--------|--------|
| `@capacitor/browser` | Replaced by `expo-web-browser` |
| `@capacitor/haptics` | Replaced by `expo-haptics` |
| `@capacitor/filesystem` | Replaced by `expo-file-system` — **check if any filesystem writes are actually used** (code uses Supabase Storage for images; local filesystem usage not found in reviewed code) |

---

## 6. Guest Mode with Local Storage

**Current:** Guest receipts stored in `localStorage` as JSON.  
**Expo:** `localStorage` does not exist in React Native. Must use `AsyncStorage` (`@react-native-async-storage/async-storage`) or `expo-secure-store` for the guest receipt data.

**Impact:** `src/lib/guestStorage.ts` must be rewritten to use `AsyncStorage`. The data structure can stay the same.

---

## 7. WebcamModal (Desktop)

`src/components/WebcamModal.tsx` renders a webcam preview for desktop browsers. In Expo (React Native), there is no "desktop" mode — the camera is always the device camera. This component can be deleted entirely.

---

## 8. n8n Dependency and Cloudflare Tunnel

If the n8n Cloudflare Tunnel goes offline, all OCR processing stops and every new scan sits at `processing_status = 'pending'` forever. Before launch of the Expo app, migrate OCR to a Supabase Edge Function (see `05-n8n-workflows.md`) to eliminate this external dependency.

---

## 9. Missing Android RevenueCat Key

**This is a launch blocker for Android.** The current codebase has:
```typescript
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_ANDROID_PUBLIC_KEY_HERE';
```
Go to the RevenueCat dashboard → Apps → Android → Copy the public API key before building.
