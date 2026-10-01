# 04 — External Dependencies to Replace

## Package Replacements

| Current (Lovable / Capacitor) | Replace with (Expo) | Notes |
|-------------------------------|---------------------|-------|
| `@capacitor/push-notifications` | `expo-notifications` | Expo handles FCM/APNs token registration and delivery. No Firebase SDK or service account required. Token type changes from FCM token to Expo Push Token (format `ExponentPushToken[...]`). |
| `@capacitor/camera` | `expo-camera` + `expo-image-picker` | `expo-image-picker` for gallery access; `expo-camera` for custom viewfinder if needed. Simplest path: use `ImagePicker.launchCameraAsync()` and `ImagePicker.launchImageLibraryAsync()`. |
| `@capacitor/filesystem` | `expo-file-system` | File read/write, temp directory access. |
| `@capacitor/haptics` | `expo-haptics` | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`, etc. API surface nearly identical. |
| `@capacitor/browser` | `expo-web-browser` or `Linking.openURL()` | For opening privacy/terms links. `WebBrowser.openBrowserAsync(url)` for in-app browser. |
| `@capacitor/core` (platform detection) | `Platform` from `react-native` | `Platform.OS === 'ios'` / `'android'` replaces `Capacitor.getPlatform()`. |
| Firebase FCM Legacy API (`fcm.googleapis.com/fcm/send`) | Expo Push Service (`https://exp.host/--/api/v2/push/send`) | No OAuth2 service accounts. Accepts `{ to: "ExponentPushToken[...]", title, body, data }`. Simple HTTPS POST from Supabase edge function. |
| `react-router-dom` (v6) | `expo-router` (file-based routing) | Map current routes to Expo Router file structure. See folder structure in `08-replit-spec.md`. |
| Tailwind CSS + shadcn/ui | NativeWind v4 + custom React Native components | See shadcn component inventory below. |
| Lovable platform | Expo + Replit | |
| Codemagic CI/CD builds | EAS Build (`eas build`) | `eas.json` already exists in the repo (Capacitor version); replace contents for Expo. |
| `@revenuecat/purchases-capacitor` + `@revenuecat/purchases-capacitor-ui` | `react-native-purchases` + `react-native-purchases-ui` | RevenueCat's official React Native SDK. Same public keys apply. iOS: `appl_HmmhscVDvicXCGtVkIrgWWqRyBB`. Android key must be obtained from RevenueCat dashboard (currently a placeholder in the Capacitor app). |
| `browser-image-compression` | `expo-image-manipulator` | `ImageManipulator.manipulateAsync(uri, actions, { compress: 0.8 })` for resizing/compressing before upload. |
| `firebase` npm package + `firebase-messaging-sw.js` | Remove entirely | Web push via Firebase is replaced by Expo Push Service for native. No web-push needed for the mobile-only Expo app. |
| `framer-motion` | `react-native-reanimated` + `react-native-gesture-handler` | Animations and gesture handling. Included with Expo SDK. |
| `react-hook-form` | `react-hook-form` | Compatible with React Native as-is. Keep. |
| `@tanstack/react-query` | `@tanstack/react-query` | Compatible as-is. Keep. |
| `date-fns` | `date-fns` | Compatible as-is. Keep. |
| `@supabase/supabase-js` | `@supabase/supabase-js` v2 | Compatible as-is. Use `AsyncStorage` adapter for React Native session persistence. |
| `lucide-react` | `lucide-react-native` | Drop-in replacement for icon components in React Native. |
| `sonner` (toast) | `react-native-toast-message` or custom | No React Native port of Sonner. Implement a simple toast overlay. |

---

## shadcn/ui Components Currently Used

Every component below must be replaced with a React Native equivalent. NativeWind handles styling; component logic needs native re-implementation.

| shadcn component | Used in | React Native replacement |
|-----------------|---------|--------------------------|
| `Button` | Everywhere | Custom `<TouchableOpacity>` or `<Pressable>` with NativeWind styles |
| `Input` | Login, Signup, Settings, ItemDetail, Dashboard | `<TextInput>` with NativeWind |
| `Card` / `CardContent` / `CardHeader` / `CardTitle` | Dashboard, ItemDetail, Settings, Premium | `<View>` with NativeWind card styles |
| `Label` | ItemDetail, Settings | `<Text>` |
| `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` | ItemDetail (type picker) | `<Picker>` from `@react-native-picker/picker` or custom modal picker |
| `Switch` | Settings (push toggle, notification timing) | `<Switch>` from `react-native` |
| `Badge` | ItemDetail (grocery-store badge) | Styled `<View>` + `<Text>` |
| `Alert` / `AlertDescription` | ItemDetail | Styled `<View>` |
| `AlertDialog` + sub-components | Settings (delete account confirm) | `Alert.alert()` from `react-native` or `react-native-modal` |
| `Dialog` / `DialogContent` | Settings (password change), Premium (sync dialog) | `react-native-modal` |
| `Separator` | Settings | `<View style={{ height: 1 }}>` |
| `Toaster` / toast system | Throughout | Custom toast or `react-native-toast-message` |
| `Tooltip` | App root provider | Not needed on mobile |
| `Accordion` / `Collapsible` | Not actively used in current pages | Skip |
| `ScrollArea` | Not actively used | `<ScrollView>` |
| `Tabs` | Not actively used | `<View>` with custom tab logic |

---

## Build Configuration Changes

| Item | Current | Expo equivalent |
|------|---------|----------------|
| Build tool | Vite + Capacitor | EAS Build |
| `capacitor.config.ts` | Defines app ID, iOS scheme, push opts | `app.json` / `app.config.ts` in Expo |
| `app.json` (Capacitor) | Minimal | Full Expo config: `expo.ios.bundleIdentifier = "app.kvittr"`, `expo.android.package = "app.kvittr"` |
| iOS build number | 51 (in `capacitor.config.ts`) | `expo.ios.buildNumber = "52"` (increment for first Expo build) |
| Push notification entitlement | `PushNotifications` Capacitor plugin config | `expo.ios.entitlements["aps-environment"] = "production"` |
| `eas.json` | Exists (Capacitor) | Replace with Expo EAS JSON |

---

## Environment Variable Changes

| Variable removed | Reason |
|-----------------|--------|
| `FIREBASE_SERVER_KEY` (Supabase secret) | FCM Legacy API removed; replaced by Expo Push Service (no key needed) |
| Firebase `apiKey`, `appId`, `messagingSenderId`, `projectId` etc. | Firebase SDK removed entirely |
| VAPID key | Web push removed |

| New variable | Where used |
|-------------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase JS client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase JS client |
| RevenueCat iOS key (hardcoded → env) | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| RevenueCat Android key | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
