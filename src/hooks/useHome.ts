import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { friendlyError } from '@/lib/errors';
import { useToday } from '@/lib/clock';
import { diffDays } from '@/lib/dates';
import { repo } from '@/services/repo';
import { createSampleTrip } from '@/services/sample';
import { useOfflineStore } from '@/store/offline';
import { useSessionStore } from '@/store/session';
import type { Trip } from '@/types';

export function useMyTrips() {
  const setMembership = useSessionStore((s) => s.setMembership);
  const forgetTrip = useSessionStore((s) => s.forgetTrip);
  const today = useToday();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSample, setCreatingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = useSessionStore.getState();
      const list = await repo.listMyTrips(session.tripOrder);
      // 서버에서 받은 내 멤버 id 를 이 기기 세션에 맞춰 둠 (재설치 후에도 참여 정보 복구)
      for (const { trip, memberId } of list) {
        if (memberId && session.memberships[trip.id] !== memberId) setMembership(trip.id, memberId);
      }
      setTrips(list.map((r) => r.trip));
      setError(null);
      setOffline(false);
    } catch (e) {
      // 인터넷이 끊기면 이 기기에 저장한 여행을 보여 줌
      const saved = useOfflineStore.getState().byTrip;
      const cached = useSessionStore.getState().tripOrder.flatMap((id) => (saved[id] ? [saved[id].trip] : []));
      if (cached.length) {
        setTrips(cached);
        setOffline(true);
        setError(null);
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setLoading(false);
    }
  }, [setMembership]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {
    trips: trips.map((t) => ({ trip: t, daysLeft: diffDays(today, t.departDate) })),
    loading,
    error,
    offline,
    refresh,
    mode: repo.mode,
    creatingSample,
    forgetTrip,
    async createSample(): Promise<string | null> {
      setCreatingSample(true);
      try {
        const { trip, member } = await createSampleTrip();
        setMembership(trip.id, member.id);
        return trip.id;
      } catch (e) {
        setError(friendlyError(e));
        return null;
      } finally {
        setCreatingSample(false);
      }
    },
  };
}
