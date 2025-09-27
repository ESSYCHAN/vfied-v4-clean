import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vfied.app',
  appName: 'VFIED',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Haptics: {
      vibrationDuration: 50
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#7c3aed'
    }
  }
};

export default config;