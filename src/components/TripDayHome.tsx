// 여행 중 홈: 준비 대신 현지에서 바로 꺼내 쓸 것들 (오늘 일정, 숙소, 비상 연락처, 서류, 분실 대응)
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Contacts } from '@/components/ItemTools';
import { BrandMark, DisasterBanner, MiniBanner, TravelInfoTiles } from '@/components/Prep';
import { Badge, Button, Card, Input, Row, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { VaultFiles } from '@/components/VaultFiles';
import { useToday } from '@/lib/clock';
import { diffDays } from '@/lib/dates';
import { useDocsStore } from '@/store/docs';
import { useTripStore } from '@/store/trip';
import { shortDate } from '@/hooks/useTripViews';
import { spacing } from '@/theme/tokens';
import type { Trip } from '@/types';

function StayCard({ trip }: { trip: Trip }) {
  const stay = useDocsStore((s) => s.stays[trip.id]);
  const saveStay = useDocsStore((s) => s.saveStay);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);

  if (editing) {
    return (
      <Card>
        <Input label="숙소 이름" value={name} onChangeText={setName} maxLength={60} />
        <Input label="현지어 주소" value={address} onChangeText={setAddress} multiline maxLength={200} hint="택시 기사에게 보여 줄 주소예요. 이 휴대폰에만 저장돼요." />
        <Row gap="sm">
          <Button
            title="저장"
            size="sm"
            disabled={!address.trim() && !name.trim()}
            onPress={() => {
              saveStay(trip.id, { name: name.trim(), address: address.trim() });
              setEditing(false);
            }}
          />
          <Button title="취소" size="sm" variant="ghost" onPress={() => setEditing(false)} />
        </Row>
      </Card>
    );
  }
  const edit = () => {
    setName(stay?.name ?? '');
    setAddress(stay?.address ?? '');
    setEditing(true);
  };
  if (!stay) return <MiniBanner icon="location" title="숙소 주소 저장하기" sub="택시 기사에게 바로 보여 줄 수 있어요" onPress={edit} />;
  return (
    <Card>
      <Row justify="space-between">
        <Text variant="label">{stay.name || '숙소'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="숙소 수정" hitSlop={8} onPress={edit}>
          <Text variant="small" color="textMuted">
            수정
          </Text>
        </Pressable>
      </Row>
      {stay.address ? (
        <>
          <Text style={styles.address} selectable>
            {stay.address}
          </Text>
          <Button
            title={copied ? '복사됨' : '주소 복사'}
            size="sm"
            variant="soft"
            onPress={async () => {
              await Clipboard.setStringAsync(stay.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        </>
      ) : null}
    </Card>
  );
}

function TodayPlan({ dayIndex }: { dayIndex: number }) {
  const itinerary = useTripStore((s) => s.itinerary);
  const places = useTripStore((s) => s.places);
  const stops = itinerary
    .filter((i) => i.dayIndex === dayIndex)
    .sort((a, b) => a.position - b.position)
    .map((i) => places.find((p) => p.id === i.placeId)?.name)
    .filter(Boolean);
  return (
    <Stack gap="sm">
      <SectionHeader title="오늘 일정" />
      {stops.length ? (
        stops.map((name, i) => (
          <Text key={`${name}-${i}`} variant="body">
            {i + 1}. {name}
          </Text>
        ))
      ) : (
        <Text variant="small" color="textMuted">
          오늘 정해 둔 일정이 없어요.
        </Text>
      )}
    </Stack>
  );
}

export function TripDayHome({ trip, onShowPrep }: { trip: Trip; onShowPrep: () => void }) {
  const today = useToday();
  const offline = useTripStore((s) => s.offline);
  const dayIndex = diffDays(trip.departDate, today);
  const total = diffDays(trip.departDate, trip.returnDate) + 1;
  return (
    <Screen edges={['top']}>
      <Row justify="space-between">
        <BrandMark onPress={() => router.dismissTo('/')} />
        <Row gap="sm">
          <Button title="내 여행" variant="ghost" size="sm" onPress={() => router.push('/trips')} />
          <Button title="준비 화면" variant="ghost" size="sm" onPress={onShowPrep} />
        </Row>
      </Row>
      <Stack gap="xs">
        <Text variant="title">
          여행 {dayIndex + 1}일째 <Text color="textMuted" style={styles.total}>/ {total}일</Text>
        </Text>
        <Text variant="small" color="textMuted">
          {trip.title} · {shortDate(trip.returnDate)} 귀국
        </Text>
      </Stack>
      {offline ? <Badge tone="warning" label="오프라인 · 마지막으로 저장한 내용" /> : null}
      <TodayPlan dayIndex={dayIndex} />
      <SectionHeader title="숙소" />
      <StayCard trip={trip} />
      <TravelInfoTiles />
      <DisasterBanner />
      <MiniBanner icon="alert" title="분실·도난 대응" sub="여권, 카드, 수하물을 잃어버렸을 때" onPress={() => router.push('/lost')} />
      <Contacts countryCode={trip.countryCode} />
      <View>
        <SectionHeader title="내 서류" />
        <View style={styles.files}>
          <VaultFiles />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 17 },
  address: { fontSize: 20, lineHeight: 30 },
  files: { marginTop: spacing.sm },
});
