// 시안 글꼴 Pretendard. 앱에는 굵기별 파일을 넣어 두고, 굵기에 맞는 파일 이름을 고릅니다.
import * as Font from 'expo-font';
import type { TextStyle } from 'react-native';

export async function loadFonts(): Promise<void> {
  await Font.loadAsync({
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('../../assets/fonts/Pretendard-ExtraBold.otf'),
  });
}

/** 굵기 → 글꼴 스타일 (안드로이드는 파일마다 이름이 달라 fontWeight 를 함께 주면 가짜 굵기가 생김) */
export function fontFor(weight: TextStyle['fontWeight']): TextStyle {
  const w = Number(weight ?? 400);
  const file = w >= 800 ? 'ExtraBold' : w >= 700 ? 'Bold' : w >= 600 ? 'SemiBold' : w >= 500 ? 'Medium' : 'Regular';
  return { fontFamily: `Pretendard-${file}`, fontWeight: 'normal' };
}
