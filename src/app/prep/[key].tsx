// 준비 카드 상세: 이 분야에 맞는 정보와 바로가기 + 할 일 + 관련 파일
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ExchangeBanner, MiniBanner, PREP_INFO } from '@/components/Prep';
import { VaultFiles } from '@/components/VaultFiles';
import { Badge, Button, Checkbox, Icon, KeyValueRow, ListItem, Loading, Notice, ProgressBar, Screen, SectionHeader, Stack, Text, type IconName } from '@/components/ui';
import { templateKey, nationalityLabel } from '@/data/countries';
import { useChecklist } from '@/hooks/useTrip';
import { itemDocGate } from '@/hooks/useItemCheck';
import { useReadyView } from '@/hooks/useTripViews';
import { diffDays } from '@/lib/dates';
import type { PrepKey } from '@/lib/prepCards';
import { useDocsStore } from '@/store/docs';
import { useTripStore } from '@/store/trip';
import { colors, fontWeight, spacing } from '@/theme/tokens';
import type { ChecklistItem } from '@/types';

const RULE_TILES: { label: string; icon: IconName; category: string | null }[] = [
  { label: '식품·육류', icon: 'food', category: 'food' },
  { label: '의약품', icon: 'medkit', category: null },
  { label: '배터리·전자기기', icon: 'battery', category: 'powerbank' },
  { label: '액체·날카로운 물건', icon: 'liquid', category: 'liquid' },
];

const ITEM_HINT: Record<string, string> = {
  passport_validity: '여권을 찍으면 유효기간을 바로 확인해요',
  insurance: '보장 기간을 넣으면 여행 일정과 비교해요',
};

export default function PrepCardScreen() {
  const { key } = useLocalSearchParams<{ key: PrepKey }>();
  const r = useReadyView('personal');
  const c = useChecklist('personal');
  const docs = useDocsStore();
  const tripLoading = useTripStore((s) => s.loading);
  const card = r?.cards.find((x) => x.key === key);
  const info = PREP_INFO[key as PrepKey];
  if (!r || !card || !info) {
    if (tripLoading) return <Screen><Loading /></Screen>;
    return (
      <Screen>
        <Text color="textMuted">이 여행에는 해당 준비가 없어요.</Text>
        <Button title="처음 화면으로" variant="secondary" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const { trip, country } = r;
  const stay = diffDays(trip.departDate, trip.returnDate) + 1;
  const prohibited = card.items.find((i) => templateKey(i.templateId) === 'prohibited_items');

  const row = (i: ChecklistItem) => {
    const hint = ITEM_HINT[templateKey(i.templateId) ?? ''];
    return (
      <ListItem
        key={i.id}
        boxed
        title={i.title}
        subtitle={hint ?? `D-${i.dueOffset}까지`}
        muted={c.done(i)}
        onPress={() => router.push(`/item/${i.id}`)}
        left={<Checkbox checked={c.done(i)} onToggle={() => c.toggle(i)} disabled={!c.perms.canToggle(i)} accessibilityLabel={i.title} />}
        right={
          <>
            {i.providedBy ? (
              <Badge label={`${i.providedBy} 완료`} tone="info" size="md" />
            ) : c.done(i) && itemDocGate(i, trip, docs) === 'waived' ? (
              <Badge label="미확인" tone="warning" size="md" />
            ) : !c.done(i) && r.daysLeft < i.dueOffset ? (
              <Badge label="놓침" tone="warning" size="md" />
            ) : i.required ? (
              <Badge label="필수" tone="brand" size="md" />
            ) : null}
            <Icon name="forward" size={16} color="textSubtle" />
          </>
        }
      />
    );
  };

  return (
    <Screen>
      <Stack gap="xs">
        <Text variant="title">{info.heading}</Text>
        <Text variant="small" color="textMuted">
          {info.sub}
        </Text>
      </Stack>
      <Stack gap="xs">
        <ProgressBar value={card.doneCount / card.total} />
        <Text variant="caption" color="textMuted" style={styles.count}>
          {card.total}개 중 {card.doneCount}개 완료
        </Text>
      </Stack>

      {key === 'entry' && country ? (
        <View>
          <KeyValueRow label="목적지" value={`${country.flag} ${country.name}`} />
          <KeyValueRow label="여권 국적" value={nationalityLabel(trip.nationality)} />
          <KeyValueRow label="체류 기간" value={`${stay}일`} />
          <KeyValueRow label="입국 서류" value={country.entryDocName} />
        </View>
      ) : null}
      {key === 'insurance' ? (
        <>
          <View>
            <KeyValueRow label="여행 기간" value={`${stay}일`} />
            <KeyValueRow label="출국 / 귀국" value={`${trip.departDate} / ${trip.returnDate}`} />
          </View>
          <Notice>해외 의료비, 휴대품, 배상책임 보장을 확인해요. 가입 여부와 보장 내용은 보험사 조건에 따라 달라져요.</Notice>
        </>
      ) : null}
      {key === 'sim' ? <Notice>같은 기종도 판매 지역과 잠금 상태에 따라 eSIM 지원이 다를 수 있어요. 휴대폰 설정에서 먼저 확인하세요.</Notice> : null}
      {key === 'money' ? <ExchangeBanner /> : null}
      {key === 'baggage' ? (
        <>
          <View style={styles.rules}>
            {RULE_TILES.map((t) => {
              const target = t.category ? { pathname: '/baggage', params: { category: t.category } } : null;
              return (
                <Pressable
                  key={t.label}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  onPress={() => {
                    if (target) router.push(target as never);
                    else if (prohibited) router.push(`/item/${prohibited.id}`);
                    else if (country) Linking.openURL(country.embassyUrl);
                  }}
                  style={({ pressed }) => [styles.rule, pressed && styles.pressed]}>
                  <Icon name={t.icon} color="brand" />
                  <Text style={styles.ruleLabel}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <MiniBanner icon="luggage" title="내 짐 리스트·규정 확인" sub="챙길 물건 체크, 라벨 찍어서 용량 확인" onPress={() => router.push('/baggage')} />
          <MiniBanner icon="weather" title="현지 날씨 보기" sub="옷차림과 우산을 미리 정해요" onPress={() => router.push('/weather')} />
        </>
      ) : null}

      <SectionHeader title="할 일" />
      <View>{card.items.map(row)}</View>

      <SectionHeader title="관련 파일" />
      <VaultFiles card={card.key} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rule: { flexBasis: '47%', flexGrow: 1, minHeight: 94, gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  ruleLabel: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.semibold },
  count: { marginTop: spacing.xs },
  pressed: { opacity: 0.8 },
});

