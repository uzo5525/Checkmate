// D-day 시뮬레이터 · 멤버 전환 · 데이터 (설정 화면과 MY 화면에서 함께 사용)
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';

import { Badge, Button, Card, Chip, Divider, Row, Stack, Text } from '@/components/ui';
import { DisplaySettingsCard } from '@/components/DisplaySettings';
import { APP_CONFIG } from '@/config/app';
import { useSettings } from '@/hooks/useSettings';
import { confirm } from '@/lib/confirm';
import { colors } from '@/theme/tokens';

export function SettingsPanel() {
  const s = useSettings();
  return (
    <>
      <DisplaySettingsCard />
      {APP_CONFIG.demoTools ? <Card>
        <Row justify="space-between">
          <Text variant="heading">D-day 시뮬레이터</Text>
          {s.overridden ? <Badge label="시뮬레이션 중" tone="warning" icon="time" /> : <Badge label="실제 날짜" />}
        </Row>
        <Text variant="small" color="textMuted">
          시연용으로 오늘 날짜를 바꿔요. 날짜를 옮기면 &quot;오늘 준비할 일&quot;과 &quot;놓친 할 일&quot;이 바뀝니다.
        </Text>
        <Stack gap="xxs">
          <Text variant="display" color="brand" center>
            {s.anchor ? s.ddayText : s.today}
          </Text>
          <Text variant="small" color="textMuted" center>
            오늘 = {s.today}
            {s.anchor ? ` · ${s.anchor.title} 출발 ${s.anchor.departDate}` : ''}
          </Text>
        </Stack>
        <Slider
          minimumValue={s.range.min}
          maximumValue={s.range.max}
          step={1}
          value={s.sliderValue}
          onValueChange={s.onSlide}
          minimumTrackTintColor={colors.brand}
          maximumTrackTintColor={colors.brandMuted}
          thumbTintColor={colors.brand}
        />
        <Row justify="space-between">
          <Text variant="caption" color="textSubtle">
            {s.range.minLabel}
          </Text>
          <Text variant="caption" color="textSubtle">
            {s.range.maxLabel}
          </Text>
        </Row>
        {s.anchor ? (
          <Row gap="sm" wrap>
            {s.presets.map((p) => (
              <Chip key={p.label} label={p.label} selected={s.sliderValue === p.value} onPress={() => s.onSlide(p.value)} />
            ))}
          </Row>
        ) : (
          <Text variant="caption" color="textSubtle">
            여행 방에서 열면 출발일 기준(D-30, D-7…)으로 움직여요.
          </Text>
        )}
        <Button title="실제 날짜로 되돌리기" variant="soft" disabled={!s.overridden} onPress={s.resetClock} />
      </Card> : null}

      {s.canActAs ? (
        <Card>
          <Text variant="heading">멤버로 보기 (로컬 시연용)</Text>
          <Text variant="small" color="textMuted">
            로컬 모드에서는 한 기기로 여러 멤버를 번갈아 체험할 수 있어요.
          </Text>
          <Row gap="sm" wrap>
            {s.members.map((m) => (
              <Chip key={m.id} label={m.isOwner ? `${m.nickname} (방장)` : m.nickname} selected={m.id === s.memberId} onPress={() => s.actAs(m.id)} />
            ))}
          </Row>
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">데이터</Text>
        <Text variant="small" color="textMuted">
          저장 방식: {s.mode === 'supabase' ? '온라인 · 동행과 실시간 공유' : '로컬 모드 (이 기기에만 저장)'}
        </Text>
        {s.mode === 'local' ? (
          <Button
            title="로컬 데이터 모두 지우기"
            variant="danger"
            icon="trash"
            onPress={async () => {
              if (await confirm('데이터 삭제', '이 기기의 여행·체크 기록이 모두 삭제됩니다.', '삭제')) {
                await s.resetAll();
                router.dismissAll();
                router.replace('/');
              }
            }}
          />
        ) : null}
        <Divider />
        <Button title="개인정보처리방침" variant="secondary" full onPress={() => router.push('/privacy')} />
        <Text variant="caption" color="textSubtle">
          입국 요건과 규정은 참고용이에요. 출발 전에 공식 안내에서 꼭 확인하세요.
        </Text>
        <Text variant="caption" color="textSubtle">
          {APP_CONFIG.name} {APP_CONFIG.version} · {APP_CONFIG.teamName}
        </Text>
      </Card>
    </>
  );
}
