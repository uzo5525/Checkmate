// 공유받은 장소를 어느 여행에 올릴지 고르는 화면
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Grow, Icon, PageHeader, Row, Screen, Text } from '@/components/ui';
import { getCountry } from '@/data/countries';
import { useMyTrips } from '@/hooks/useHome';
import { parseSharedText } from '@/lib/mapsLink';
import { useShareInbox } from '@/store/shareInbox';

export default function ShareTargetScreen() {
  const text = useShareInbox((s) => s.text);
  const take = useShareInbox((s) => s.take);
  const { trips, loading } = useMyTrips();
  const [shared] = useState(() => text ?? '');
  const parsed = parseSharedText(shared);

  return (
    <Screen>
      <PageHeader title="장소 받기" subtitle="어느 여행의 투표에 올릴까요?" />
      <Card tone="brand">
        <Row gap="sm">
          <Icon name="location" color="brand" />
          <Grow>
            <Text variant="label">{parsed.name ?? '공유받은 장소'}</Text>
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {parsed.url ?? shared}
            </Text>
          </Grow>
        </Row>
      </Card>
      {!loading && trips.length === 0 ? (
        <Card>
          <Text color="textMuted">먼저 여행을 만들거나 참여해 주세요.</Text>
          <Button title="처음 화면으로" variant="soft" onPress={() => router.replace('/')} />
        </Card>
      ) : null}
      {trips.map(({ trip }) => (
        <Card
          key={trip.id}
          onPress={() => {
            take();
            router.replace({ pathname: '/course', params: { tripId: trip.id, shared } });
          }}>
          <Row gap="md">
            <Text variant="title">{getCountry(trip.countryCode)?.country.flag}</Text>
            <Grow>
              <Text variant="label">{trip.title}</Text>
              <Text variant="small" color="textMuted">
                방 코드 {trip.code}
              </Text>
            </Grow>
            <Icon name="forward" color="textSubtle" />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
