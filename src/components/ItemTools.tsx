// 항목별 바로 쓰는 도구: 연락처 복사, 입국 서류 바로가기·저장, eSIM 판매처, 여행 기간 예보 등
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ForecastRows } from '@/components/Forecast';
import { ExchangeBanner, MiniBanner } from '@/components/Prep';
import { SafetyGuideBlock } from '@/components/Safety';
import { Button, Icon, KeyValueRow, ListItem, Notice, SectionHeader, Stack, Text } from '@/components/ui';
import { VaultFiles } from '@/components/VaultFiles';
import { templateKey } from '@/data/countries';
import { CONSULAR_CALL_CENTER, EMERGENCY_CONTACTS, ENTRY_LINKS, ESIM_SHOPS, type Contact } from '@/data/itemTools';
import { useWeather } from '@/hooks/useTravelInfo';
import { useTripStore } from '@/store/trip';
import { colors } from '@/theme/tokens';
import type { ChecklistItem } from '@/types';

/** 이 항목에 출처 대신 바로가기 버튼을 보여 줄지 */
export function hasDirectLink(item: ChecklistItem, countryCode?: string): boolean {
  return templateKey(item.templateId) === 'entry_card' && !!countryCode && !!ENTRY_LINKS[countryCode];
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 복사`}
      hitSlop={8}
      onPress={async () => {
        await Clipboard.setStringAsync(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}>
      <Text variant="small" bold color="brand">
        {copied ? '복사됨' : '복사'}
      </Text>
    </Pressable>
  );
}

export function Contacts({ countryCode }: { countryCode: string }) {
  const list: Contact[] = [...(EMERGENCY_CONTACTS[countryCode] ?? []), CONSULAR_CALL_CENTER];
  return (
    <Stack gap="sm">
      <SectionHeader title="연락처" right={<CopyButton label="연락처 전체" value={list.map((c) => `${c.label} ${c.number}`).join('\n')} />} />
      <View>
        {list.map((c) => (
          <KeyValueRow
            key={c.number}
            label={c.label}
            right={
              <View style={styles.contact}>
                <Text variant="small" bold>
                  {c.number}
                </Text>
                <CopyButton label={c.label} value={c.number} />
              </View>
            }
          />
        ))}
      </View>
      <Notice>번호는 바뀔 수 있어요. 출발 전에 아래 공관 안내에서 한 번 더 확인하세요.</Notice>
    </Stack>
  );
}

function EntryTool({ countryCode }: { countryCode: string }) {
  const link = ENTRY_LINKS[countryCode];
  if (!link) return null;
  return (
    <Stack gap="sm">
      <Text variant="small" color="textMuted">
        {link.steps}
      </Text>
      <Button title={link.title} iconRight="external" full onPress={() => Linking.openURL(link.url)} />
      <SectionHeader title="보관함에 저장" />
      <Text variant="small" color="textMuted">
        {link.saveNote}
      </Text>
      <VaultFiles card="entry" suggestName={link.saveName} />
    </Stack>
  );
}

function EsimTool() {
  return (
    <Stack gap="sm">
      <SectionHeader title="eSIM 판매처" />
      <View>
        {ESIM_SHOPS.map((s) => (
          <ListItem key={s.name} boxed title={s.name} subtitle={s.sub} right={<Icon name="external" size={16} color="textSubtle" />} onPress={() => Linking.openURL(s.url)} />
        ))}
      </View>
      <Notice>판매처 순서는 추천이 아니에요. 가격과 지원 국가는 구매 전에 각 사이트에서 확인하세요.</Notice>
    </Stack>
  );
}

function WeatherTool() {
  const w = useWeather();
  if (!w.trip) return null;
  const { departDate, returnDate } = w.trip;
  const inTrip = (d: string) => d >= departDate && d <= returnDate;
  const days = w.data?.days ?? [];
  const tripDays = days.filter((d) => inTrip(d.date));
  const covered = tripDays.length > 0;
  return (
    <Stack gap="sm">
      <SectionHeader title={covered ? '여행 기간 예보' : '앞으로 일주일 예보'} />
      {w.loading ? <ActivityIndicator color={colors.brand} /> : null}
      {w.error ? (
        <Text variant="small" color="danger">
          {w.error}
        </Text>
      ) : null}
      <View>
        <ForecastRows days={covered ? tripDays : days.slice(0, 7)} inTrip={inTrip} />
      </View>
      {!w.loading && !w.error && !covered ? <Notice>여행 날짜 예보는 출발 16일 전부터 볼 수 있어요.</Notice> : null}
      <MiniBanner icon="weather" title="전체 예보 보기" sub={`${w.placeName} 16일 예보`} onPress={() => router.push('/weather')} />
    </Stack>
  );
}

export function ItemTools({ item }: { item: ChecklistItem }) {
  const countryCode = useTripStore((s) => s.trip?.countryCode);
  const key = templateKey(item.templateId);
  if (!countryCode) return null;
  if (key === 'safety_contacts') {
    return (
      <Stack gap="sm">
        <Contacts countryCode={countryCode} />
        <MiniBanner icon="alert" title="분실·도난 대응 보기" sub="여권, 카드, 수하물을 잃어버렸을 때" onPress={() => router.push('/lost')} />
      </Stack>
    );
  }
  if (key === 'entry_card') return <EntryTool countryCode={countryCode} />;
  if (key === 'disaster_alerts') return <SafetyGuideBlock countryCode={countryCode} />;
  if (key === 'esim') return <EsimTool />;
  if (key === 'weather') return <WeatherTool />;
  if (key === 'exchange') return <ExchangeBanner />;
  if (key === 'packing' || key === 'powerbank_carry' || key === 'prohibited_items') {
    return <MiniBanner icon="luggage" title="내 짐 리스트·규정 확인" sub="챙길 물건 체크, 라벨 찍어서 용량 확인" onPress={() => router.push('/baggage')} />;
  }
  if (key === 'final_documents') {
    return (
      <Stack gap="sm">
        <MiniBanner icon="check" title="최종 점검 하기" sub="체크와 서류 검사 결과를 모아서 판정해요" onPress={() => router.push('/final-check')} />
        <MiniBanner icon="folder" title="보관함 열기" sub="저장해 둔 서류를 꺼내 확인해요" onPress={() => router.navigate(`/trip/${item.tripId}/saved`)} />
      </Stack>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
