import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vfied.app',
  appName: 'VFIED',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f0f23'
    },
    Haptics: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f23',
      showSpinner: false,
      launchAutoHide: true
    }
  },
  ios: {
    contentInset: 'automatic'
    // Remove this line: scheme: 'VFIED'
  }
};

export default config;