// 내 여행: 지금 준비 중인 여행과 지난 여행만 모아 봄 (새 여행 만들기·참여는 처음 화면)
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Grow, Icon, Loading, ProgressBar, Row, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { getCountry } from '@/data/countries';
import { useMyTrips } from '@/hooks/useHome';
import { shortDate } from '@/hooks/useTripViews';
import { indexStatuses, isDone, visibleTo } from '@/lib/checklist';
import { useToday } from '@/lib/clock';
import { ddayLabel, diffDays } from '@/lib/dates';
import { percent } from '@/lib/prepCards';
import { useOfflineStore } from '@/store/offline';
import { useSessionStore } from '@/store/session';
import { useTripStore } from '@/store/trip';
import { spacing } from '@/theme/tokens';
import type { Trip } from '@/types';

/** 이 기기에 저장된 내용으로 계산한 내 준비율. 아직 연 적 없는 여행은 null */
function usePct(tripId: string): number | null {
  const snapshot = useOfflineStore((s) => s.byTrip[tripId]);
  const memberId = useSessionStore((s) => s.memberships[tripId]);
  if (!snapshot || !memberId) return null;
  const map = indexStatuses(snapshot.statuses);
  const mine = snapshot.items.filter((i) => i.scope === 'personal' && visibleTo(i, memberId));
  return percent(mine.filter((i) => isDone(map, i, memberId)).length, mine.length);
}

function TripCard({ trip, daysLeft, past }: { trip: Trip; daysLeft: number; past: boolean }) {
  const pct = usePct(trip.id);
  const openTripId = useTripStore((s) => s.tripId);
  const country = getCountry(trip.countryCode)?.country;
  return (
    <Card onPress={() => (openTripId === trip.id && router.canGoBack() ? router.back() : router.replace(`/trip/${trip.id}`))}>
      <Row gap="md">
        <Text variant="title">{country?.flag}</Text>
        <Grow>
          <Text variant="label" bold>
            {trip.title}
          </Text>
          <Text variant="small" color="textMuted">
            {shortDate(trip.departDate)} – {shortDate(trip.returnDate)} · {trip.partySize}명
          </Text>
        </Grow>
        {past ? null : (
          <Text variant="label" color="brand">
            {ddayLabel(daysLeft, diffDays(trip.departDate, trip.returnDate))}
          </Text>
        )}
        <Icon name="forward" size={16} color="textSubtle" />
      </Row>
      {pct !== null ? (
        <View style={styles.progress}>
          <ProgressBar value={pct / 100} />
          <Text variant="caption" color="textMuted">
            {past ? `준비 ${pct}% 하고 다녀왔어요` : `내 준비 ${pct}%`}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function TripsScreen() {
  const { trips, loading, error, offline } = useMyTrips();
  const today = useToday();
  const current = trips.filter(({ trip }) => trip.returnDate >= today).sort((a, b) => a.trip.departDate.localeCompare(b.trip.departDate));
  const past = trips.filter(({ trip }) => trip.returnDate < today).sort((a, b) => b.trip.departDate.localeCompare(a.trip.departDate));

  return (
    <Screen>
      {loading && trips.length === 0 ? <Loading /> : null}
      {error ? (
        <Text variant="small" color="danger">
          {error}
        </Text>
      ) : null}
      {offline ? (
        <Text variant="small" color="textMuted">
          인터넷이 연결되지 않아 이 기기에 저장한 여행만 보여요.
        </Text>
      ) : null}
      <Stack gap="sm">
        <SectionHeader title="준비 중인 여행" />
        {current.length === 0 && !loading ? (
          <Text variant="small" color="textMuted">
            준비 중인 여행이 없어요.
          </Text>
        ) : null}
        {current.map(({ trip, daysLeft }) => (
          <TripCard key={trip.id} trip={trip} daysLeft={daysLeft} past={false} />
        ))}
      </Stack>
      {past.length > 0 ? (
        <Stack gap="sm">
          <SectionHeader title="지난 여행" />
          {past.map(({ trip, daysLeft }) => (
            <TripCard key={trip.id} trip={trip} daysLeft={daysLeft} past />
          ))}
        </Stack>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.xs },
});
