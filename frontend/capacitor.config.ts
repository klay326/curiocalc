import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.curiocalc.app',
  appName: 'CurioCalc',
  webDir: 'mobile-dist',
  server: {
    // Load the live site — web deploys automatically update the app
    url: 'https://curiocalc.org',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['curiocalc.org', 'api.curiocalc.org'],
  },
  ios: {
    backgroundColor: '#09090b',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#09090b',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#09090b',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
