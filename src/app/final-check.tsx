// 출발 전 최종 점검: 체크 상태와 서류 검사 결과를 모아 판정
import { router } from 'expo-router';
import { View } from 'react-native';

import { AlertBox, Icon, ListItem, Loading, Notice, ProgressBar, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { useFinalCheck } from '@/hooks/useFinalCheck';
import type { CheckLine, FinalVerdict } from '@/lib/finalCheck';

const VERDICT: Record<FinalVerdict, { tone: 'brand' | 'warning' | 'danger'; title: string; message: string }> = {
  ready: { tone: 'brand', title: '출발 준비를 마쳤어요', message: '체크리스트와 서류 검사를 모두 통과했어요.' },
  check: { tone: 'warning', title: '확인할 것이 남았어요', message: '출발을 막을 정도는 아니지만 한 번 더 봐 주세요.' },
  blocked: { tone: 'danger', title: '출발 전에 해결할 일이 있어요', message: '아래 항목을 먼저 끝내세요.' },
};

function Lines({ title, lines }: { title: string; lines: CheckLine[] }) {
  if (lines.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeader title={`${title} ${lines.length}개`} />
      <View>
        {lines.map((l) => (
          <ListItem key={l.id} boxed title={l.title} subtitle={l.reason} right={<Icon name="forward" size={16} color="textSubtle" />} onPress={() => router.push(`/item/${l.id}`)} />
        ))}
      </View>
    </Stack>
  );
}

export default function FinalCheckScreen() {
  const c = useFinalCheck();
  if (!c) return <Screen><Loading /></Screen>;
  const v = VERDICT[c.verdict];
  return (
    <Screen>
      <Stack gap="xs">
        <Text variant="title">최종 점검</Text>
        <Text variant="small" color="textMuted">
          {c.trip.title} · {c.dday}
        </Text>
      </Stack>
      <AlertBox tone={v.tone} title={v.title}>
        <Text variant="small" color="textMuted">
          {v.message}
        </Text>
      </AlertBox>
      <Stack gap="xs">
        <ProgressBar value={c.total ? c.doneCount / c.total : 0} />
        <Text variant="caption" color="textMuted">
          {c.total}개 중 {c.doneCount}개 완료
        </Text>
      </Stack>
      <Lines title="해결할 일" lines={c.blockers} />
      <Lines title="확인할 일" lines={c.warnings} />
      <Lines title="통과한 서류" lines={c.passedDocs} />
      <Notice>이 앱에 입력한 내용만 본 결과예요. 실제 입국 허가를 보장하지 않으니 중요한 요건은 공식 안내에서 확인하세요.</Notice>
    </Screen>
  );
}
