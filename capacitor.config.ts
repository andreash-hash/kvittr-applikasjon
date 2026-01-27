import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kvittr',
  appName: 'Kvittr',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    scheme: 'App',
    buildNumber: '50',
    backgroundColor: '#F5F1E8',
    contentMode: 'center',
    // Ensure iOS push entitlements are available in cloud/native builds
    path: 'ios/App/App/App.entitlements'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
