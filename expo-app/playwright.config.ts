import { defineConfig } from '@playwright/test';

// Web e2e for Kvittr: runs the real Expo app in a browser (react-native-web)
// against a mocked Supabase. Covers app logic and UI flows — NOT native-only
// things (camera, push, StoreKit); those belong to the iOS simulator job.
const PORT = 8081;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: `npx expo start --web --port ${PORT} --clear`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      E2E_WEB: '1',
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_SUPABASE_URL: 'https://mock.supabase.test',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
});
