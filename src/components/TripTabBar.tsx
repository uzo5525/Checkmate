// 여행 방 하단 탭 바. 선택한 탭으로 연한 알약 배경이 미끄러지듯 이동
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import { TRIP_TABS } from '@/features/tripTabs';
import { colors, fontWeight, radius } from '@/theme/tokens';

const PILL_W = 56;

export function TripTabBar({ state, navigateToTab }: BottomTabBarProps) {
  // 안드로이드 하단 시스템 바(홈·뒤로 버튼)와 겹치지 않도록 그 높이만큼 올림
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [pos] = useState(() => new Animated.Value(state.index));
  useEffect(() => {
    Animated.spring(pos, { toValue: state.index, useNativeDriver: Platform.OS !== 'web', speed: 16, bounciness: 5 }).start();
  }, [state.index, pos]);

  const tabW = (width - 30) / state.routes.length;
  const activeTab = TRIP_TABS.find((t) => t.name === state.routes[state.index]?.name);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && !activeTab?.highlight ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            { transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [(tabW - PILL_W) / 2, (tabW - PILL_W) / 2 + tabW] }) }] },
          ]}
        />
      ) : null}
      {state.routes.map((route, i) => {
        const tab = TRIP_TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        const color = focused ? colors.brand : colors.textMuted;
        const onPress = () => {
          if (!focused) navigateToTab(route.key);
        };
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.title} onPress={onPress} style={styles.tab}>
            {tab.highlight ? (
              <View style={[styles.circle, focused && styles.circleOn]}>
                <Icon name={tab.activeIcon} size={24} color={focused ? 'onBrand' : 'brand'} />
              </View>
            ) : (
              <View style={styles.iconBox}>
                <Icon name={focused ? tab.activeIcon : tab.icon} color={focused ? 'brand' : 'textMuted'} />
              </View>
            )}
            <Text variant="caption" style={{ color, fontWeight: focused ? fontWeight.bold : fontWeight.regular, fontSize: 11 }}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: 15,
  },
  pill: { position: 'absolute', top: 10, left: 15, width: PILL_W, height: 30, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 52 },
  iconBox: { width: PILL_W, height: 30, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 48,
    height: 48,
    marginTop: -16,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { backgroundColor: colors.brand },
});
