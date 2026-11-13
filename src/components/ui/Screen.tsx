import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tinted?: boolean;
  /** 섹션마다 간격이 다른 화면은 false 로 끄고 직접 여백을 줌 */
  gap?: boolean;
};

export function Screen({ children, scroll = true, edges = ['bottom'], footer, refreshing, onRefresh, tinted, gap = true }: ScreenProps) {
  // 화면 전환 시 살짝 떠오르며 나타나기 (240ms)
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [enter]);
  const motion = { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
  const body = <Animated.View style={[styles.content, !gap && styles.noGap, motion]}>{children}</Animated.View>;
  return (
    <SafeAreaView style={[styles.root, tinted && styles.tinted]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{body}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tinted: { backgroundColor: colors.surfaceMuted },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    padding: layout.screenPadding,
    gap: spacing.lg,
  },
  noGap: { gap: 0 },
  footer: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
});
