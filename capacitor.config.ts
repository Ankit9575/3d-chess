import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurelia.chess3d',
  appName: 'Aurelia 3D Chess',
  webDir: 'dist',
  android: {
    backgroundColor: '#121215',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
