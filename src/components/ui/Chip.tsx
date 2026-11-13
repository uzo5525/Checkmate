import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <Text variant="small" style={{ color: selected ? colors.brand : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

// 선택지 묶음 (단일 선택)
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.group}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

// 시안의 "내 준비 / 함께 준비" 세그먼트. 선택 배경이 옆으로 미끄러지며 이동
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const [width, setWidth] = useState(0);
  const [pos] = useState(() => new Animated.Value(index));
  useEffect(() => {
    Animated.spring(pos, { toValue: index, useNativeDriver: Platform.OS !== 'web', speed: 18, bounciness: 4 }).start();
  }, [index, pos]);
  const itemWidth = width > 0 ? (width - spacing.xs * 2) / options.length : 0;

  return (
    <View style={styles.segment} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentThumb,
            { width: itemWidth, transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, itemWidth] }) }] },
          ]}
        />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, on && itemWidth === 0 && styles.segmentOn]}>
            <Text variant="label" style={{ color: on ? colors.onBrand : colors.textMuted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  segment: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: colors.brand },
  segmentThumb: {
    position: 'absolute',
    top: spacing.xs,
    bottom: spacing.xs,
    left: spacing.xs,
    borderRadius: 11,
    backgroundColor: colors.brand,
  },
});
