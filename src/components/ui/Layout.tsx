import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing, type SpacingToken } from '@/theme/tokens';

type StackProps = {
  children?: ReactNode;
  gap?: SpacingToken;
  direction?: 'row' | 'column';
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: boolean;
  padding?: SpacingToken;
};

// 화면에서 레이아웃 스타일을 직접 쓰지 않도록 하는 간단한 스택.
export function Stack({ children, gap = 'sm', direction = 'column', align, justify, wrap, flex, padding }: StackProps) {
  return (
    <View
      style={{
        flexDirection: direction,
        gap: spacing[gap],
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
        flex: flex ? 1 : undefined,
        padding: padding ? spacing[padding] : undefined,
      }}>
      {children}
    </View>
  );
}

export function Row(props: Omit<StackProps, 'direction'>) {
  return <Stack align="center" {...props} direction="row" />;
}

export function Spacer({ size = 'md' }: { size?: SpacingToken }) {
  return <View style={{ height: spacing[size] }} />;
}

export function Grow({ children }: { children?: ReactNode }) {
  return <View style={styles.grow}>{children}</View>;
}

/** 가로 스크롤 목록 (투표 카드 등) */
export function HScroll({ children, gap = 'md' }: { children?: ReactNode; gap?: SpacingToken }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[gap] }}>
      {children}
    </ScrollView>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
