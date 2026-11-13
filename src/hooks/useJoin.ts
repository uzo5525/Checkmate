import { useEffect, useState } from 'react';

import { friendlyError } from '@/lib/errors';
import { normalizeRoomCode } from '@/lib/id';
import { repo } from '@/services/repo';
import { useSessionStore } from '@/store/session';
import type { Trip } from '@/types';

export function useJoinTrip(rawCode: string) {
  const code = normalizeRoomCode(rawCode);
  const memberships = useSessionStore((s) => s.memberships);
  const setMembership = useSessionStore((s) => s.setMembership);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'notfound' | 'error'>('loading');
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    repo
      .findTripByCode(code)
      .then((t) => {
        if (!alive) return;
        setTrip(t);
        setStatus(t ? 'found' : 'notfound');
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e?.message ?? e));
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [code]);

  return {
    code,
    trip,
    status,
    alreadyMember: trip ? !!memberships[trip.id] : false,
    nickname,
    setNickname,
    joining,
    error,
    async join(): Promise<string | null> {
      if (!trip || !nickname.trim()) return null;
      setJoining(true);
      try {
        const m = await repo.joinByCode(trip.code, nickname.trim());
        setMembership(trip.id, m.id);
        return trip.id;
      } catch (e) {
        setError(friendlyError(e));
        return null;
      } finally {
        setJoining(false);
      }
    },
  };
}
