import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadow, spacing, toneColors, type Tone } from '@/theme/tokens';

export type CardProps = {
  children: ReactNode;
  tone?: Tone | 'default';
  onPress?: () => void;
  padded?: boolean | 'sm';
  elevated?: boolean;
  dashed?: boolean;
  gap?: 'xs' | 'sm' | 'md';
};

export function Card({ children, tone = 'default', onPress, padded = true, elevated, dashed, gap = 'sm' }: CardProps) {
  const toneStyle =
    tone === 'default'
      ? styles.default
      : { backgroundColor: toneColors[tone].bg, borderColor: dashed ? colors.brandMuted : toneColors[tone].bg };
  const style = [
    styles.base,
    { gap: spacing[gap] },
    toneStyle,
    padded === true && styles.padded,
    padded === 'sm' && styles.paddedSm,
    elevated && styles.elevated,
    dashed && styles.dashed,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, borderWidth: 1 },
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  padded: { padding: 18 },
  paddedSm: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  elevated: { ...shadow.card, borderColor: colors.surface },
  dashed: { borderStyle: 'dashed', borderWidth: 1.5 },
  pressed: { opacity: 0.8 },
});
