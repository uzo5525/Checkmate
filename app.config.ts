import type { ExpoConfig } from 'expo/config';

import { APP_CONFIG } from './src/config/app.ts';

const config: ExpoConfig = {
  name: APP_CONFIG.name,
  slug: APP_CONFIG.slug,
  version: APP_CONFIG.version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_CONFIG.scheme,
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: APP_CONFIG.iosBundleId },
  android: {
    package: APP_CONFIG.androidPackage,
    versionCode: APP_CONFIG.versionCode,
    adaptiveIcon: {
      backgroundColor: APP_CONFIG.colors.brandSoft,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // readygo://join/<code> 딥링크
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: APP_CONFIG.scheme, host: 'join' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: { output: 'single', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    // 지도: 맵 ID 없이 기본 지도만 사용 (무료 SKU). 키는 이 앱(패키지+서명)과 Maps SDK에만 쓰이도록 제한됨
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
    ['expo-notifications', { color: APP_CONFIG.colors.brand }],
    // 구글 지도 앱 등에서 "공유 → Checkmate"로 장소 받기 (안드로이드 텍스트 공유만)
    ['expo-share-intent', { androidIntentFilters: ['text/*'], disableIOS: true }],
    // 릴리스 빌드 코드 축소(R8)가 WorkManager(알림이 사용)의 Room DB 구현 클래스를 지워 시작 시 크래시 → 유지
    [
      'expo-build-properties',
      {
        android: {
          extraProguardRules: [
            '-keep class androidx.work.impl.WorkDatabase_Impl { *; }',
            '-keep class * extends androidx.room.RoomDatabase { <init>(); }',
          ].join('\n'),
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: APP_CONFIG.colors.splashBackground,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: { typedRoutes: false, reactCompiler: true },
  owner: 'uzo5525',
  extra: {
    eas: { projectId: '4b6eb091-887b-4185-a469-8f6e04302f9e' },
  },
};

export default config;
