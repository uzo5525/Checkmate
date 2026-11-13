import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useDisplayStore } from '@/store/display';
import { fontFor } from '@/theme/fonts';
import { colors, fontSize, fontWeight, type ColorToken } from '@/theme/tokens';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'small' | 'caption';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
  bold?: boolean;
  center?: boolean;
};

const LINE_HEIGHT: Partial<Record<TextVariant, number>> = { title: 34, heading: 24, body: 22, label: 20, small: 21, caption: 18 };

export function Text({ variant = 'body', color = 'text', bold, center, style, ...rest }: TextProps) {
  // 화면 설정의 글자 크기 (1 = 기본)
  const scale = useDisplayStore((s) => s.fontScale);
  const scaled =
    scale !== 1
      ? { fontSize: Math.round(fontSize[variant] * scale), ...(LINE_HEIGHT[variant] ? { lineHeight: Math.round(LINE_HEIGHT[variant]! * scale) } : {}) }
      : null;
  const merged = StyleSheet.flatten([styles[variant], scaled, { color: colors[color] }, bold && styles.bold, center && styles.center, style]) as TextStyle;
  return <RNText style={[merged, fontFor(merged.fontWeight)]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize.display, fontWeight: fontWeight.heavy, letterSpacing: -1 },
  title: { fontSize: fontSize.title, lineHeight: 34, fontWeight: fontWeight.bold, letterSpacing: -0.8 },
  heading: { fontSize: fontSize.heading, lineHeight: 24, fontWeight: fontWeight.bold },
  body: { fontSize: fontSize.body, fontWeight: fontWeight.regular, lineHeight: 22 },
  label: { fontSize: fontSize.label, lineHeight: 20, fontWeight: fontWeight.semibold },
  small: { fontSize: fontSize.small, fontWeight: fontWeight.regular, lineHeight: 21 },
  caption: { fontSize: fontSize.caption, lineHeight: 18, fontWeight: fontWeight.regular },
  bold: { fontWeight: fontWeight.semibold },
  center: { textAlign: 'center' },
});
