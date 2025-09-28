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
      backgroundColor: '#0a0e19'  // Match your app background
    },
    Haptics: {
      vibrationDuration: 50
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0e19',
      showSpinner: false
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;