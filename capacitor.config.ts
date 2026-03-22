import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.audynox.app',
  appName: 'Audynox',
  webDir: 'build',
  server: {
    // For development, use your local dev server URL.
    // Comment this out for production builds.
    // url: 'http://YOUR_LOCAL_IP:3000',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
