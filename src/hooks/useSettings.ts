import { realToday, useClockStore, useToday } from '@/lib/clock';
import { addDays, ddayLabel, diffDays } from '@/lib/dates';
import { repo } from '@/services/repo';
import { useSessionStore } from '@/store/session';
import { useTripStore } from '@/store/trip';

export function useSettings() {
  const today = useToday();
  const overrideDate = useClockStore((s) => s.overrideDate);
  const setOverride = useClockStore((s) => s.setOverride);
  const trip = useTripStore((s) => s.trip);
  const members = useTripStore((s) => s.members);
  const memberships = useSessionStore((s) => s.memberships);
  const setMembership = useSessionStore((s) => s.setMembership);
  const clearSession = useSessionStore((s) => s.clear);
  const resetTrip = useTripStore((s) => s.reset);

  // 슬라이더 값 = 기준일 대비 오늘의 일수. 오른쪽으로 갈수록 출발일에 가까워짐.
  // 여행이 열려 있으면 기준일 = 출발일(값 -7 = D-7), 아니면 실제 오늘.
  const daysLeft = trip ? diffDays(today, trip.departDate) : 0;
  const sliderValue = trip ? -daysLeft : diffDays(realToday(), today);
  const range = trip
    ? { min: -40, max: 3, minLabel: 'D-40', maxLabel: '여행 중' }
    : { min: -30, max: 60, minLabel: '-30일', maxLabel: '+60일' };

  const onSlide = (v: number) => {
    const date = addDays(trip ? trip.departDate : realToday(), Math.round(v));
    setOverride(date === realToday() ? null : date);
  };

  return {
    today,
    overridden: overrideDate !== null,
    anchor: trip,
    ddayText: trip ? ddayLabel(daysLeft, diffDays(trip.departDate, trip.returnDate)) : '',
    sliderValue,
    range,
    onSlide,
    presets: [30, 14, 7, 3, 1, 0].map((d) => ({ value: -d, label: d === 0 ? 'D-DAY' : `D-${d}` })),
    resetClock: () => setOverride(null),
    mode: repo.mode,
    canActAs: repo.mode === 'local' && !!trip && members.length > 1,
    members,
    memberId: trip ? memberships[trip.id] : undefined,
    actAs: (memberId: string) => trip && setMembership(trip.id, memberId),
    async resetAll() {
      await repo.resetAll?.();
      clearSession();
      resetTrip();
    },
  };
}
