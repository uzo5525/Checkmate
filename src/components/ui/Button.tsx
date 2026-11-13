import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'dashed';
  size?: 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        variant === 'ghost' && styles.ghost,
        variant === 'dashed' && styles.dashed,
        { backgroundColor: v.bg, borderColor: v.border },
        full && styles.full,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : icon ? (
          <Icon name={icon} color={v.fg} size={iconSize} />
        ) : null}
        <Text variant={size === 'sm' ? 'small' : 'label'} bold style={{ color: v.fg }}>
          {title}
        </Text>
        {iconRight ? <Icon name={iconRight} color={v.fg} size={iconSize - 2} /> : null}
      </View>
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  soft: { bg: colors.brandSoft, fg: colors.brand, border: colors.brandSoft },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.dangerSoft },
  dashed: { bg: colors.brandSoft, fg: colors.brand, border: colors.brandMuted },
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: 11 },
  ghost: { paddingHorizontal: spacing.xs },
  dashed: { borderStyle: 'dashed', borderWidth: 1.5 },
  full: { alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
