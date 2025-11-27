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
    buildNumber: '2'
  }
};

export default config;
