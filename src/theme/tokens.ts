// 디자인 토큰. 디자이너 시안 기준: 보라 포인트 + 짙은 보라 텍스트 + 연한 보라 면.
// 시안이 바뀌면 이 파일과 src/components/ui/ 만 교체하면 됩니다.
import { APP_CONFIG } from '@/config/app';

export const colors = {
  brand: APP_CONFIG.colors.brand, // 메인 보라 (버튼, 강조)
  brandSoft: APP_CONFIG.colors.brandSoft, // 연한 보라 면 (요약 카드, 선택 상태)
  brandMuted: '#E4D9F5', // 연보라 테두리·비활성 트랙
  brandStrong: '#5A3BA8', // D-day 배지 같은 진한 보라 포인트
  onBrand: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F5FA',
  border: '#EDE8F3',

  text: '#2D253C',
  textMuted: '#797183',
  textSubtle: '#A29BAD',

  success: '#7952D6',
  successSoft: '#F3EEFC',
  warning: '#E2622F',
  warningSoft: '#FDE7DB',
  danger: '#D9342B',
  dangerSoft: '#FDEFE8',
  info: '#7952D6',
  infoSoft: '#F3EEFC',

  tileChip: 'rgba(255,255,255,0.4)',

  heroFrom: '#9C7BE8',
  heroTo: '#5A3BA8',
  scanFrom: '#3D3350',
  scanTo: '#2D253C',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 9,
  md: 13,
  lg: 17,
  xl: 23,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 14,
  label: 14,
  heading: 17,
  title: 25,
  display: 40,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const layout = {
  screenPadding: 24,
  maxContentWidth: 560,
  hitSlop: 8,
  checkboxSize: 26,
  iconSize: 21,
  avatarSize: 30,
  tileIconSize: 30,
  heroHeight: 210,
  buttonHeight: 50,
} as const;

export const shadow = {
  card: {
    shadowColor: '#2D253C',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textMuted, bg: colors.surfaceMuted },
  brand: { fg: colors.brand, bg: colors.brandSoft },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
};
