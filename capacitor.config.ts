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
    buildNumber: '15',
    backgroundColor: '#F5F1E8',
    contentMode: 'center'
  }
};

export default config;
