// 보관함: 끝낸 준비 카드 + 직접 추가한 파일 (이 기기에만 저장)
import { router } from 'expo-router';

import { PREP_INFO } from '@/components/Prep';
import { VaultFiles } from '@/components/VaultFiles';
import { Icon, IconBox, ListItem, Notice, PageHeader, Screen, SectionHeader, Stack, Text, Loading } from '@/components/ui';
import { shortDate, useReadyView } from '@/hooks/useTripViews';

export default function SavedTab() {
  const r = useReadyView('personal');
  if (!r) return <Screen edges={['top']}><Loading /></Screen>;
  const finished = r.cards.filter((c) => c.finished);

  return (
    <Screen edges={['top']}>
      <PageHeader title="보관함" subtitle={`${r.trip.title} · ${shortDate(r.trip.departDate)} – ${shortDate(r.trip.returnDate)}`} />

      <SectionHeader title="내 파일" />
      <VaultFiles />
      <Notice icon="lock">예약 확인서·보험 증권은 이 휴대폰에만 저장되고 동행자에게 보이지 않아요.</Notice>

      <SectionHeader title={`끝낸 준비 ${finished.length}개`} />
      {finished.length === 0 ? (
        <Text variant="small" color="textMuted">
          준비 카드를 끝내면 여기에 모여요.
        </Text>
      ) : (
        <Stack gap="sm">
          {finished.map((c) => (
            <ListItem
              key={c.key}
              boxed
              title={PREP_INFO[c.key].title}
              subtitle={`${c.total}개 모두 완료`}
              left={<IconBox icon={PREP_INFO[c.key].icon} />}
              right={<Icon name="forward" size={16} color="textSubtle" />}
              onPress={() => router.push(`/prep/${c.key}`)}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
