import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Tabs } from 'expo-router/tabs';

import { TripTabBar } from '@/components/TripTabBar';
import { Button, Card, Screen, Text } from '@/components/ui';
import { TRIP_TABS } from '@/features/tripTabs';
import { useTripSync } from '@/hooks/useTrip';
import { cancelTripReminders, scheduleTripReminders } from '@/services/notifications';
import { useNotifyStore } from '@/store/notify';
import { useTripStore } from '@/store/trip';
import { colors } from '@/theme/tokens';

export default function TripLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useTripSync(id);
  const error = useTripStore((s) => s.error);
  const trip = useTripStore((s) => s.trip);
  // 출발일 기준 D-30·14·7·3·1·D-DAY 알림 (날짜가 바뀌면 다시 예약)
  const notifyOff = useNotifyStore((s) => (trip ? !!s.off[trip.id] : false));
  useEffect(() => {
    if (!trip) return;
    if (notifyOff) cancelTripReminders(trip.id);
    else scheduleTripReminders(trip);
  }, [trip?.id, trip?.departDate, trip?.title, notifyOff]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Card tone="danger">
          <Text color="danger">{error}</Text>
        </Card>
        <Button title="처음 화면으로" variant="secondary" full onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <TripTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TRIP_TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
