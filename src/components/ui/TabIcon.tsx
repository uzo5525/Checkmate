import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

/**
 * 하단 탭 아이콘. 선택되면 연한 알약 배경이 부드럽게 커지며 나타남.
 * highlight = 가운데 "짐" 처럼 원형 배경 강조
 */
export function TabIcon({
  name,
  color,
  size,
  highlight,
  focused = false,
}: {
  name: IconName;
  color: string;
  size: number;
  highlight?: boolean;
  focused?: boolean;
}) {
  const [on] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    Animated.spring(on, { toValue: focused ? 1 : 0, useNativeDriver: Platform.OS !== 'web', speed: 16, bounciness: 6 }).start();
  }, [focused, on]);

  if (highlight) {
    return (
      <Animated.View style={[styles.circle, { transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
        <Icon name={name} color={colors.brand} size={size} />
      </Animated.View>
    );
  }
  return (
    <View style={styles.box}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { opacity: on, transform: [{ scaleX: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
      />
      <Icon name={name} color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  circle: {
    width: 48,
    height: 48,
    marginTop: -14,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
