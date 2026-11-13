// AI 준비 에이전트: 규칙으로 상황 감지 → 상황이 바뀌었을 때만 AI가 정리·행동 제안 → 승인하면 앱이 실행.
// AI 불가 시 규칙 브리핑. 결과는 기기에 보관 (API 호출 최소화)
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCountry } from '@/data/countries';
import { buildSignals, ruleBriefing, signalFingerprint, type AgentAction, type Briefing, type TripDayWeather } from '@/lib/agentSignals';
import { isDone, visibleTo } from '@/lib/checklist';
import { today as todayFn, useToday } from '@/lib/clock';
import { diffDays } from '@/lib/dates';
import { repo } from '@/services/repo';
import { fetchWeather, weatherLabel } from '@/services/travelInfo';
import { useBriefingStore } from '@/store/briefing';
import { EMPTY_LUGGAGE, useLuggageStore } from '@/store/luggage';
import { useTripStore } from '@/store/trip';
import { uuid } from '@/lib/id';
import { defaultPacking } from '@/lib/packing';

import { useAddItem, useMe } from './useTrip';

const MIN_REGEN_MS = 10 * 60 * 1000; // 상황이 바뀌어도 10분 안에는 다시 부르지 않음

export function useBriefing() {
  const trip = useTripStore((s) => s.trip);
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const members = useTripStore((s) => s.members);
  const places = useTripStore((s) => s.places);
  const itinerary = useTripStore((s) => s.itinerary);
  const load = useTripStore((s) => s.load);
  const entry = useBriefingStore((s) => (trip ? s.byTrip[trip.id] : undefined));
  const put = useBriefingStore((s) => s.put);
  const dismiss = useBriefingStore((s) => s.dismiss);
  const luggage = useLuggageStore((s) => (trip ? s.byTrip[trip.id] : undefined)) ?? EMPTY_LUGGAGE;
  const updateLuggage = useLuggageStore((s) => s.update);
  const { me } = useMe();
  const addItem = useAddItem();
  const today = useToday();
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ key: string; days: TripDayWeather[] } | null>(null);

  const country = trip ? getCountry(trip.countryCode)?.country : undefined;
  const nights = trip ? diffDays(trip.departDate, trip.returnDate) : 3;
  const packingList = luggage.packing ?? defaultPacking(nights, country?.plug ?? '현지 콘센트').map((p) => ({ id: p.name, name: p.name, qty: p.qty, packed: false }));

  // 여행지 날씨 (여행 날짜만). 장소가 있으면 장소들의 가운데 기준
  const pts = places.filter((p) => p.lat !== null && p.lng !== null);
  const lat = pts.length ? pts.reduce((n, p) => n + p.lat!, 0) / pts.length : (country?.center.lat ?? 0);
  const lng = pts.length ? pts.reduce((n, p) => n + p.lng!, 0) / pts.length : (country?.center.lng ?? 0);
  const weatherKey = trip ? `${trip.id}:${lat.toFixed(1)},${lng.toFixed(1)}` : '';
  useEffect(() => {
    if (!trip || !country) return;
    let alive = true;
    fetchWeather(lat, lng)
      .then((w) => {
        const days = w.days
          .filter((d) => d.date >= trip.departDate && d.date <= trip.returnDate)
          .map((d) => ({ date: d.date, text: weatherLabel(d.code).text, rain: d.rain, max: d.max, min: d.min }));
        if (alive) setWeather({ key: weatherKey, days });
      })
      .catch(() => alive && setWeather({ key: weatherKey, days: [] }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);
  const weatherReady = weather?.key === weatherKey;

  const canAssign = !!me?.isOwner;
  const canEditPlan = !!me && !trip?.packageInfo && (me.isOwner || me.canEditShared);

  const signals = useMemo(() => {
    if (!trip || !me) return null;
    return buildSignals({
      tripTitle: trip.title,
      countryName: country?.name ?? trip.countryCode,
      departDate: trip.departDate,
      returnDate: trip.returnDate,
      daysLeft: diffDays(today, trip.departDate),
      me,
      members,
      items: items.filter((i) => visibleTo(i, me.id)),
      isDone: (i, memberId) => isDone(statuses, i, memberId),
      places,
      scheduledPlaceIds: itinerary.map((i) => i.placeId),
      itinerary,
      weather: weatherReady ? weather!.days : [],
      packingNames: packingList.map((p) => p.name),
      canAssign,
      canEditPlan,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, me, members, items, statuses, places, itinerary, today, weatherReady, weather, luggage.packing, canAssign, canEditPlan]);

  const fp = signals ? signalFingerprint(signals) : '';

  const generate = useCallback(
    async (force: boolean) => {
      if (!trip || !signals) return;
      setLoading(true);
      setNote(null);
      const res = await repo.invokeAi<Briefing>('briefing', { tripId: trip.id, signals, fp, force });
      setLoading(false);
      if (res && !res.fallback && res.data) {
        put(trip.id, { day: todayFn(), briefing: { ...res.data, actions: res.data.actions ?? [] }, ai: true, fp, at: Date.now() });
        setRemaining(res.remaining);
      } else {
        put(trip.id, { day: todayFn(), briefing: ruleBriefing(signals), ai: false, fp, at: Date.now() });
        if (res?.reason) setNote(res.reason);
        else if (repo.mode === 'local') setNote('로컬 모드에서는 기본 브리핑을 보여드려요.');
      }
    },
    [trip, signals, fp, put],
  );

  // 오늘 브리핑이 없거나, 상황(지문)이 바뀌었으면 다시 생성 (날씨를 받은 뒤, 10분 간격 이상)
  const fresh = entry?.day === today && entry.fp === fp;
  const lastAt = entry?.day === today ? (entry.at ?? 0) : 0;
  useEffect(() => {
    if (!signals || !weatherReady || fresh || loading) return;
    // 직전 생성 후 10분이 안 지났으면 남은 시간만큼 기다렸다가 생성
    const wait = Math.max(300, MIN_REGEN_MS - (Date.now() - lastAt));
    const t = setTimeout(() => generate(false), wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, !!signals, weatherReady, lastAt]);

  // 최신 상태 반영: 끝낸 할 일·이미 처리된 행동은 숨김
  const doneIds = new Set(items.filter((i) => me && isDone(statuses, i, me.id)).map((i) => i.id));
  const shown = entry?.day === today ? entry.briefing : signals ? ruleBriefing(signals) : null;
  const titles = items.map((i) => i.title);
  const days = trip ? diffDays(trip.departDate, trip.returnDate) + 1 : 1;

  /** 지금도 실행할 수 있는 행동만 (AI가 준 id 를 다시 검증) */
  const valid = (a: AgentAction): boolean => {
    if (entry?.dismissed.includes(a.title)) return false;
    if (a.type === 'assign') {
      const item = items.find((i) => i.id === a.itemId);
      return canAssign && !!item && item.scope === 'shared' && members.some((m) => m.id === a.memberId) && item.assigneeId !== a.memberId;
    }
    if (a.type === 'move_stop') {
      const cur = itinerary.find((x) => x.placeId === a.placeId);
      return canEditPlan && !!cur && a.toDay !== null && a.toDay >= 0 && a.toDay < days && cur.dayIndex !== a.toDay;
    }
    if (a.type === 'add_packing') {
      const name = (a.item ?? '').trim();
      return !!name && !packingList.some((p) => p.name.includes(name) || name.includes(p.name));
    }
    return false;
  };

  /** 승인한 행동 실행 */
  const act = async (a: AgentAction) => {
    if (!trip || !valid(a)) return;
    if (a.type === 'assign' && a.itemId) {
      await repo.assignItem(a.itemId, a.memberId);
      await load(trip.id);
    } else if (a.type === 'move_stop' && a.placeId && a.toDay !== null) {
      const rest = itinerary.filter((x) => x.placeId !== a.placeId);
      const pos = Math.max(-1, ...rest.filter((x) => x.dayIndex === a.toDay).map((x) => x.position)) + 1;
      const moved = itinerary.find((x) => x.placeId === a.placeId)!;
      await repo.setItinerary(trip.id, [
        ...rest.map((x) => ({ placeId: x.placeId, dayIndex: x.dayIndex, position: x.position, note: x.note })),
        { placeId: a.placeId, dayIndex: a.toDay, position: pos, note: moved.note },
      ]);
      await load(trip.id);
    } else if (a.type === 'add_packing' && a.item) {
      updateLuggage(trip.id, () => ({ packing: [...packingList, { id: uuid(), name: a.item!.trim(), qty: 1, packed: false }] }));
    }
    dismiss(trip.id, a.title);
  };

  return {
    briefing: shown
      ? {
          ...shown,
          tasks: shown.tasks.filter((t) => !t.itemId || !doneIds.has(t.itemId)),
          suggestions: shown.suggestions.filter((s) => !entry?.dismissed.includes(s.title) && !titles.includes(s.title)),
          actions: (shown.actions ?? []).filter(valid),
        }
      : null,
    ai: !!(entry?.day === today && entry.ai),
    loading,
    remaining,
    note,
    refresh: () => generate(true),
    act,
    accept: async (s: Briefing['suggestions'][number]) => {
      const scope = s.scope === 'shared' && addItem.canAddShared ? 'shared' : 'personal';
      await addItem.add({ title: s.title, description: s.description, dueOffset: s.dueOffset, scope, createdByAi: true });
      if (trip) dismiss(trip.id, s.title);
    },
    dismiss: (title: string) => trip && dismiss(trip.id, title),
  };
}
