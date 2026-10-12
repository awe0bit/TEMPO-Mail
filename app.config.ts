import type { ExpoConfig } from 'expo/config';

const projectId = process.env.EXPO_PROJECT_ID ?? 'bb103558-b77f-4df2-9287-3e35e349ccbc';

const config: ExpoConfig = {
  name: 'TEMPO Mail',
  slug: 'tempo-mail',
  owner: 'felixo1',
  version: '0.2.0',
  orientation: 'portrait',
  icon: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png',
  scheme: 'tempomail',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  runtimeVersion: 'native-2',
  ios: {
    bundleIdentifier: 'one.darker.tempomail',
    buildNumber: '2',
    deploymentTarget: '26.0',
    supportsTablet: true,
    icon: {
      light: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png',
      dark: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-dark.png',
      tinted: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-tinted.png'
    },
    infoPlist: {
      NSLocalNetworkUsageDescription: '连接你配置的自托管邮件服务器'
    }
  },
  plugins: [
    ['expo-router', { root: './App' }],
    'expo-secure-store',
    'expo-updates',
    ['expo-splash-screen', {
      backgroundColor: '#F7F7F9',
      image: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png',
      imageWidth: 176,
      dark: {
        backgroundColor: '#101012',
        image: './App/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-dark.png'
      }
    }]
  ],
  updates: {
    url: `https://u.expo.dev/${projectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 2500,
    requestHeaders: { 'expo-channel-name': 'production' }
  },
  extra: { eas: { projectId } },
  experiments: { typedRoutes: true }
};

export default config;
