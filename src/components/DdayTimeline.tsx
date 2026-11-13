// 시안 02: D-30 · D-14 · D-7 · D-1 가로 타임라인. 현재 구간 위에 비행기 아이콘.
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { Bucket } from '@/lib/checklist';
import { colors, radius, spacing } from '@/theme/tokens';

type Point = { bucket: Bucket; total: number; done: number; current: boolean };

export function DdayTimeline({ points, selected, onSelect }: { points: Point[]; selected: Bucket; onSelect: (b: Bucket) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      {points.map((p) => {
        const on = p.bucket === selected;
        const complete = p.total > 0 && p.done === p.total;
        return (
          <Pressable
            key={p.bucket}
            accessibilityRole="button"
            accessibilityLabel={`D-${p.bucket} ${p.done}/${p.total}`}
            onPress={() => onSelect(p.bucket)}
            style={styles.point}>
            <View style={styles.plane}>{p.current ? <Icon name="plane" size={22} color="brand" /> : null}</View>
            <View style={[styles.dot, complete && styles.dotDone, on && styles.dotOn]} />
            <Text variant="small" bold={on} color={on ? 'text' : 'textMuted'}>
              D-{p.bucket}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const DOT = 14;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  line: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: 26 + DOT / 2 + spacing.xs - 1,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brandMuted,
  },
  point: { alignItems: 'center', gap: spacing.xs, minWidth: 48 },
  plane: { height: 26, justifyContent: 'flex-end' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    backgroundColor: colors.brandMuted,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.brand },
  dotOn: { backgroundColor: colors.brand, transform: [{ scale: 1.3 }] },
});
