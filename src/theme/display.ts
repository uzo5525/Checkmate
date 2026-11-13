// 화면 설정 (글자 크기·다크 모드·고대비·테마 색). 색은 앱 시작 때 colors 에 적용 (src/boot/Gate.tsx).
// 화면들의 StyleSheet 가 처음 불릴 때 색이 정해지므로, 색 설정을 바꾸면 앱을 다시 열어야 반영됨 (웹은 자동 새로고침).
import { Appearance } from 'react-native';

import { colors, toneColors } from './tokens';

export type Accent = 'blue' | 'green' | 'purple' | 'orange';

export type DisplaySettings = {
  fontScale: number; // 1 = 기본
  dark: boolean;
  highContrast: boolean;
  accent: Accent;
};

export const DEFAULT_DISPLAY: DisplaySettings = { fontScale: 1, dark: Appearance.getColorScheme() === 'dark', highContrast: false, accent: 'purple' };
export const DISPLAY_STORAGE_KEY = 'readygo-display-v2';

export const FONT_SCALES = [
  { value: 1, label: '보통' },
  { value: 1.15, label: '크게' },
  { value: 1.3, label: '더 크게' },
  { value: 1.5, label: '아주 크게' },
];

export const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: 'purple', label: '보라', color: '#7952D6' },
  { value: 'blue', label: '파랑', color: '#2F8CEB' },
  { value: 'green', label: '초록', color: '#139A64' },
  { value: 'orange', label: '주황', color: '#E2702A' },
];

// 강조색별 [기본, 밝은 면(라이트), 밝은 면(다크), 그라데이션 시작, 끝]
const ACCENT_SET: Record<Accent, { light: string; dark: string; softLight: string; softDark: string; heroFrom: string; heroTo: string }> = {
  blue: { light: '#2F8CEB', dark: '#5AA6F5', softLight: '#EAF3FE', softDark: '#1C3152', heroFrom: '#5AA6F2', heroTo: '#2F6FD6' },
  green: { light: '#139A64', dark: '#3CC48C', softLight: '#E4F6EE', softDark: '#173A2E', heroFrom: '#3CC48C', heroTo: '#0E7C50' },
  purple: { light: '#7952D6', dark: '#BC9AFF', softLight: '#F3EEFC', softDark: '#352745', heroFrom: '#9C7BE8', heroTo: '#5A3BA8' },
  orange: { light: '#E2702A', dark: '#F5975A', softLight: '#FDEEE3', softDark: '#43291A', heroFrom: '#F5975A', heroTo: '#C9561A' },
};

const LIGHT = {
  brandMuted: '#E4D9F5',
  brandStrong: '#5A3BA8',
  onBrand: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F5FA',
  border: '#EDE8F3',
  text: '#2D253C',
  textMuted: '#797183',
  textSubtle: '#A29BAD',
  tileChip: 'rgba(255,255,255,0.4)',
  warning: '#E2622F',
  warningSoft: '#FDE7DB',
  danger: '#D9342B',
  dangerSoft: '#FDEFE8',
  scanFrom: '#3D3350',
  scanTo: '#2D253C',
};

const DARK: typeof LIGHT = {
  brandMuted: '#48365D',
  brandStrong: '#BC9AFF',
  onBrand: '#FFFFFF',
  background: '#181D27',
  surface: '#181D27',
  surfaceMuted: '#242C39',
  border: '#333C4C',
  text: '#F2F5FB',
  textMuted: '#AAB4C4',
  textSubtle: '#7F8A9C',
  tileChip: 'rgba(255,255,255,0.08)',
  warning: '#FF8A5B',
  warningSoft: '#3A2418',
  danger: '#FF6B63',
  dangerSoft: '#3A1D1B',
  scanFrom: '#242C39',
  scanTo: '#181D27',
};

/** 설정을 colors / toneColors 에 적용 (앱 시작 시 한 번) */
export function applyDisplay(s: DisplaySettings) {
  const base = s.dark ? DARK : LIGHT;
  const a = ACCENT_SET[s.accent] ?? ACCENT_SET.purple;
  const brand = s.dark ? a.dark : a.light;
  const soft = s.dark ? a.softDark : a.softLight;
  const next: Record<string, string> = {
    ...base,
    brand,
    brandSoft: soft,
    success: brand,
    successSoft: soft,
    info: brand,
    infoSoft: soft,
    heroFrom: a.heroFrom,
    heroTo: a.heroTo,
  };
  // 다크 모드 연보라 위에는 흰 글자가 안 보여서 짙은 글자
  if (s.dark && s.accent === 'purple') next.onBrand = '#271443';
  if (s.highContrast) {
    Object.assign(
      next,
      s.dark
        ? { text: '#FFFFFF', textMuted: '#E5E7EB', textSubtle: '#C7CDD8', border: '#8A97AD', background: '#000000', surface: '#0B0F17' }
        : { text: '#000000', textMuted: '#1F2937', textSubtle: '#3B4556', border: '#5B6578' },
    );
  }
  Object.assign(colors as Record<string, string>, next);
  // 배지 등에서 쓰는 톤 색도 다시 계산
  Object.assign(toneColors, {
    neutral: { fg: colors.textMuted, bg: colors.surfaceMuted },
    brand: { fg: colors.brand, bg: colors.brandSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    info: { fg: colors.info, bg: colors.infoSoft },
  });
}

/** zustand persist 로 저장된 값 꺼내기 */
export function parseStoredDisplay(raw: string | null): DisplaySettings {
  try {
    const state = raw ? JSON.parse(raw)?.state : null;
    return { ...DEFAULT_DISPLAY, ...(state ?? {}) };
  } catch {
    return DEFAULT_DISPLAY;
  }
}
