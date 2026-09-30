# Web e2e (Playwright)

Runs the real Expo app in Chromium via react-native-web against a **mocked
Supabase** (no network, no secrets). Verifies app logic and UI flows:
onboarding, guest scan + free-tier limit, signup validation, premium screen,
guest→account migration.

It does **not** cover native-only behaviour (camera, push, StoreKit/RevenueCat,
real file system) — that is the iOS simulator job (`.github/workflows/ios-sim.yml`).

```
npm ci
npx playwright install chromium        # once
npm run e2e                            # starts Expo web on :8081 itself
# sandbox with a preinstalled browser:
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e
```

The harness is enabled only by `E2E_WEB=1` (set by `playwright.config.ts`); see
`metro.config.js`, `app.config.ts`, `tailwind.config.js`. Native builds ignore it.
