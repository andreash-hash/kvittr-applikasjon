import { ExpoConfig, ConfigContext } from 'expo/config';

  export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Kvittr',
    slug: 'kvittr-ccode',
    version: '1.5.9',
    scheme: 'kvittr',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      backgroundColor: '#0F1729',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.kvittr',
      buildNumber: '120',
      backgroundColor: '#0F1729',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          'Kvittr trenger kameratilgang for å scanne kvitteringer.',
        NSPhotoLibraryUsageDescription:
          'Kvittr trenger tilgang til bilder for å laste opp kvitteringer.',
        NSPhotoLibraryAddUsageDescription:
          'Kvittr trenger tilgang til å lagre bilder.',
      },
      entitlements: {
        'aps-environment': 'production',
        'com.apple.developer.associated-domains': ['applinks:kvittr.app'],
      },
    },
    android: {
      package: 'app.kvittr',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F1729',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#6366F1',
          sounds: ['./assets/notification-sound.wav'],
          androidMode: 'default',
          androidCollapsedTitle: 'Kvittr varsler',
          iosDisplayInForeground: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Kvittr trenger tilgang til bilder for å laste opp kvitteringer.',
          cameraPermission:
            'Kvittr trenger kameratilgang for å scanne kvitteringer.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Kvittr trenger kameratilgang for å scanne kvitteringer.',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '15.1',
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '9a9f44ff-d636-4619-a7aa-a04072918a34',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    updates: {
      url: 'https://u.expo.dev/9a9f44ff-d636-4619-a7aa-a04072918a34',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  });
