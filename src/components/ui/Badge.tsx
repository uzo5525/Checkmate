import { StyleSheet, View } from 'react-native';

import { colors, spacing, toneColors, type Tone } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeProps = {
  label: string;
  tone?: Tone | 'strong';
  icon?: IconName;
  size?: 'sm' | 'md';
};

export function Badge({ label, tone = 'neutral', icon, size = 'sm' }: BadgeProps) {
  const t = tone === 'strong' ? { fg: colors.onBrand, bg: colors.brandStrong } : toneColors[tone];
  return (
    <View style={[styles.base, size === 'md' && styles.md, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={size === 'md' ? 14 : 12} color={t.fg} /> : null}
      <Text variant="caption" bold style={[styles.text, { color: t.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  md: {},
  text: { fontSize: 11, lineHeight: 14 },
});
