// 화면 설정 카드: 글자 크기(바로 반영) · 다크 모드 · 고대비 · 테마 색(다시 열면 반영, 웹은 자동 새로고침)
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Card, Chip, Grow, Icon, Notice, Row, Stack, Text } from '@/components/ui';
import { useDisplayStore } from '@/store/display';
import { ACCENTS, FONT_SCALES, type DisplaySettings } from '@/theme/display';
import { colors, radius, spacing } from '@/theme/tokens';

export function DisplaySettingsCard() {
  const d = useDisplayStore();
  const [pendingRestart, setPendingRestart] = useState(false);

  // 색 관련 설정: 저장 후 웹은 새로고침, 앱은 다시 열 때 적용
  const setColor = (patch: Partial<DisplaySettings>) => {
    d.set(patch);
    if (Platform.OS === 'web') setTimeout(() => window.location.reload(), 200);
    else setPendingRestart(true);
  };

  const toggleRow = (label: string, desc: string, value: boolean, onChange: (v: boolean) => void) => (
    <Row gap="md">
      <Grow>
        <Text variant="label">{label}</Text>
        <Text variant="small" color="textMuted">
          {desc}
        </Text>
      </Grow>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.surface} accessibilityLabel={label} />
    </Row>
  );

  return (
    <Card>
      <Row gap="sm">
        <Icon name="settings" color="brand" />
        <Text variant="heading">화면 설정</Text>
      </Row>

      <Stack gap="sm">
        <Text variant="label">글자 크기</Text>
        <Row gap="sm" wrap>
          {FONT_SCALES.map((f) => (
            <Chip key={f.value} label={f.label} selected={d.fontScale === f.value} onPress={() => d.set({ fontScale: f.value })} />
          ))}
        </Row>
        <Text variant="small" color="textMuted">
          미리보기: 출발 전 준비, Checkmate가 함께 챙겨요.
        </Text>
      </Stack>

      {toggleRow('다크 모드', '어두운 배경으로 눈부심을 줄여요', d.dark, (v) => setColor({ dark: v }))}
      {toggleRow('고대비', '글자와 테두리를 더 진하게 해서 잘 보이게 해요', d.highContrast, (v) => setColor({ highContrast: v }))}

      <Stack gap="sm">
        <Text variant="label">테마 색</Text>
        <Row gap="md">
          {ACCENTS.map((a) => {
            const on = d.accent === a.value;
            return (
              <Pressable
                key={a.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`테마 색 ${a.label}`}
                onPress={() => !on && setColor({ accent: a.value })}
                style={styles.swatchWrap}>
                <View style={[styles.swatch, { backgroundColor: a.color }, on && styles.swatchOn]}>
                  {on ? <Icon name="check" size={18} color="onBrand" /> : null}
                </View>
                <Text variant="caption" color={on ? 'text' : 'textMuted'}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      </Stack>

      {pendingRestart ? <Notice icon="info">색 설정은 앱을 완전히 닫았다가 다시 열면 바뀌어요.</Notice> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  swatchWrap: { alignItems: 'center', gap: spacing.xs },
  swatch: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
});
