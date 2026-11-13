import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { Text } from './Text';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  meta?: ReactNode;
  onPress?: () => void;
  muted?: boolean;
  /** 시안처럼 밑줄로 구분한 넓은 행 */
  boxed?: boolean;
};

export function ListItem({ title, subtitle, left, right, meta, onPress, muted, boxed }: ListItemProps) {
  const content = (
    <>
      {left ? <View>{left}</View> : null}
      <View style={styles.body}>
        <Text variant="label" color={muted ? 'textSubtle' : 'text'} style={muted ? styles.strike : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </>
  );
  const style = [styles.row, boxed && styles.boxed];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  boxed: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strike: { textDecorationLine: 'line-through' },
  pressed: { opacity: 0.6 },
});
