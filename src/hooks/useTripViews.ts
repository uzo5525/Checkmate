// 시안 화면(홈·준비·동행·서류)용 데이터 훅
import { useState } from 'react';
import { Share } from 'react-native';

import { APP_CONFIG, joinDeepLink } from '@/config/app';
import { getCountry } from '@/data/countries';
import { friendlyError } from '@/lib/errors';
import { useToday } from '@/lib/clock';
import { BUCKETS, classify, currentBucket, isDone, visibleTo, type Bucket } from '@/lib/checklist';
import { ddayLabel, diffDays } from '@/lib/dates';
import { buildPrepCards, cardOf, percent } from '@/lib/prepCards';
import { tripReminders } from '@/lib/reminders';
import { repo } from '@/services/repo';
import { useNotifyStore } from '@/store/notify';
import { useTripStore } from '@/store/trip';
import type { ChecklistItem, Scope } from '@/types';

import { useMe } from './useTrip';

/** "출발까지 일주일" 같은 문구 */
export function countdownPhrase(daysLeft: number): string {
  if (daysLeft < 0) return '즐거운 여행 되세요';
  if (daysLeft === 0) return '오늘 출발해요';
  if (daysLeft === 1) return '내일 출발해요';
  if (daysLeft === 7) return '출발까지 일주일';
  if (daysLeft === 14) return '출발까지 2주';
  if (daysLeft >= 28 && daysLeft <= 31) return '출발까지 한 달';
  return `출발까지 ${daysLeft}일`;
}

/** 짧은 날짜 표기 12.24 */
export function shortDate(s: string): string {
  const [, m, d] = s.split('-').map(Number);
  return `${m}.${d}`;
}

function useBase() {
  const trip = useTripStore((s) => s.trip);
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const members = useTripStore((s) => s.members);
  const today = useToday();
  const { me } = useMe();
  const daysLeft = trip ? diffDays(today, trip.departDate) : 0;
  const done = (i: ChecklistItem) => (me ? isDone(statuses, i, me.id) : false);
  return { trip, items, statuses, members, me, daysLeft, done, today };
}

export function useShareInvite() {
  const trip = useTripStore((s) => s.trip);
  return async () => {
    if (!trip) return;
    const message = `[${APP_CONFIG.name}] "${trip.title}" 여행 준비 방에 초대합니다.\n\n방 코드: ${trip.code}\n${APP_CONFIG.name} 앱 > "방 코드로 참여"에 입력하세요.\n\n앱 링크: ${joinDeepLink(trip.code)}`;
    try {
      await Share.share({ message });
    } catch {
      // 공유 시트를 쓸 수 없는 환경 (웹 등)
    }
  };
}

/** 홈·준비 목록·보관함: 준비율, 다음 할 일, 분야별 카드 */
export function useReadyView(scope: Scope) {
  const { trip, items, members, me, daysLeft, done } = useBase();
  if (!trip) return null;
  const list = items.filter((i) => i.scope === scope && visibleTo(i, me?.id));
  const doneCount = list.filter(done).length;
  const pending = list.filter((i) => !done(i)).sort((a, b) => b.dueOffset - a.dueOffset || a.sortOrder - b.sortOrder);
  return {
    trip,
    country: getCountry(trip.countryCode)?.country,
    daysLeft,
    dday: daysLeft > 0 ? `출발 ${daysLeft}일 전` : ddayLabel(daysLeft, diffDays(trip.departDate, trip.returnDate)),
    total: list.length,
    doneCount,
    pct: percent(doneCount, list.length),
    next: pending[0] ?? null,
    list,
    cards: buildPrepCards(list, done, daysLeft),
    /** 카드에 속하지 않는 항목 (직접 추가한 할 일 등) */
    extras: list.filter((i) => cardOf(i) === null),
    hasShared: items.some((i) => i.scope === 'shared'),
    members,
    me,
    done,
    assignee: (i: ChecklistItem) => members.find((m) => m.id === i.assigneeId) ?? null,
  };
}

export function usePrepareView(scope: Scope) {
  const { trip, items, members, me, daysLeft, done } = useBase();
  const cur = currentBucket(daysLeft) ?? 1;
  const [picked, setPicked] = useState<Bucket | null>(null);
  const selected = picked ?? cur;

  const scoped = items.filter((i) => i.scope === scope);
  const c = classify(scoped, done, daysLeft);
  const timeline = BUCKETS.map((b) => {
    const list = c.byBucket.find((g) => g.bucket === b)?.items ?? [];
    return { bucket: b, total: list.length, done: list.filter(done).length, current: b === cur };
  });
  const list = c.byBucket.find((g) => g.bucket === selected)?.items ?? [];
  const packing = items.filter((i) => i.scope === 'shared' && i.category === 'packing');

  return {
    trip,
    me,
    daysLeft,
    timeline,
    selected,
    isCurrent: selected === cur,
    select: (b: Bucket) => setPicked(b),
    list,
    listDone: list.filter(done).length,
    /** 선택한 시점의 아직 안 한 일 */
    pending: list.filter((i) => !done(i)),
    /** 완료한 일 (여행사가 처리한 항목 포함), 최근 마감 순 */
    completed: scoped.filter(done).sort((a, b) => b.dueOffset - a.dueOffset),
    overdue: c.overdue.filter((i) => !list.includes(i)),
    done,
    assignee: (i: ChecklistItem) => members.find((m) => m.id === i.assigneeId) ?? null,
    packing: packing[0] ?? null,
    packingMine: !!me && packing.some((i) => i.assigneeId === me.id),
    hasShared: items.some((i) => i.scope === 'shared'),
  };
}

/** 준비 탭의 투표 미리보기 (장소 추가·일정은 여행 코스 화면에서) */
export function usePlaces() {
  const places = useTripStore((s) => s.places);
  const itinerary = useTripStore((s) => s.itinerary);
  const tripId = useTripStore((s) => s.tripId);
  const load = useTripStore((s) => s.load);
  const { me } = useMe();
  const [error, setError] = useState<string | null>(null);
  const sorted = [...places].sort((a, b) => b.voterIds.length - a.voterIds.length || a.createdAt.localeCompare(b.createdAt));
  return {
    places: sorted.map((p) => ({ place: p, votes: p.voterIds.length, mine: !!me && p.voterIds.includes(me.id) })),
    totalVotes: places.reduce((n, p) => n + p.voterIds.length, 0),
    scheduled: itinerary.length > 0,
    error,
    toggle: async (placeId: string) => {
      if (!me || !tripId) return;
      try {
        await repo.toggleVote(placeId, me.id);
        setError(null);
      } catch (e) {
        setError(friendlyError(e));
      }
      await load(tripId);
    },
  };
}

/** 알림 화면: 이미 온 D-day 알림 목록 + 앞으로 올 알림 + 켜기/끄기 */
export function useNotificationsView() {
  const { trip, today } = useBase();
  const off = useNotifyStore((s) => (trip ? !!s.off[trip.id] : false));
  const setEnabled = useNotifyStore((s) => s.setEnabled);
  const list = trip ? tripReminders(trip.departDate, trip.title, today) : { received: [], upcoming: [] };
  return {
    trip,
    enabled: !off,
    setEnabled: (v: boolean) => {
      if (trip) setEnabled(trip.id, v);
    },
    received: list.received,
    upcoming: list.upcoming,
    package: trip?.packageInfo ?? null,
  };
}
