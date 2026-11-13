// 앱 시작 게이트: 저장된 화면 설정(다크 모드·고대비·테마 색)을 먼저 적용한 뒤 라우터를 불러옴.
// 화면 모듈의 StyleSheet 가 이 다음에 만들어져야 색이 반영되므로, 여기서는 UI 컴포넌트를 import 하지 않음.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type ComponentType } from 'react';

import { applyDisplay, DISPLAY_STORAGE_KEY, parseStoredDisplay } from '@/theme/display';
import { loadFonts } from '@/theme/fonts';

export function Gate() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(DISPLAY_STORAGE_KEY)
      .catch(() => null)
      .then(async (raw) => {
        applyDisplay(parseStoredDisplay(raw));
        await loadFonts().catch(() => undefined);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { App: RouterApp } = require('expo-router/build/qualified-entry');
        if (alive) setApp(() => RouterApp);
      });
    return () => {
      alive = false;
    };
  }, []);

  return App ? <App /> : null;
}
