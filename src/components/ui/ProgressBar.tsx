import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export function ProgressBar({ value, height = 5, onTint }: { value: number; height?: number; onTint?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height }, onTint && styles.onTint]}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  onTint: { backgroundColor: colors.brandMuted },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand },
});
