import { StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

/** 닉네임 첫 글자 원형 아바타. name 이 없으면 사람 아이콘 */
export function Avatar({ name, size = layout.avatarSize }: { name?: string | null; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
      {name ? (
        <Text variant={size > 36 ? 'label' : 'small'} bold color="brandStrong">
          {name.trim().slice(0, 1)}
        </Text>
      ) : (
        <Icon name="person" size={size * 0.55} color="brand" />
      )}
    </View>
  );
}

export function AvatarStack({ names, max = 5 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <View style={styles.stack}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} />
      ))}
      {names.length > max ? (
        <Text variant="caption" color="textMuted">
          +{names.length - max}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
