// 여행 코스: 지도 위 장소 제안·투표 → 날짜별 일정
import { useMemo, useState } from 'react';

import { getCountry } from '@/data/countries';
import { friendlyError } from '@/lib/errors';
import { addDays, diffDays, formatKDate } from '@/lib/dates';
import { distanceKm, planItinerary, routeKm } from '@/lib/itinerary';
import { countryCodeOf, extractCoords, extractName, parseSharedText, splitPlaceText, type ParsedPlace } from '@/lib/mapsLink';
import { geocodeAddress, geocodePlace, waitPolitely } from '@/services/geocode';
import { repo, type ItineraryInput } from '@/services/repo';
import { useTripStore } from '@/store/trip';
import type { Place } from '@/types';

import { useMe } from './useTrip';

export type AiDayTheme = { dayIndex: number; title: string; summary: string; placeIds: string[] };

/** 이름으로 찾은 장소를 믿을 수 있는 거리: 링크에 적힌 주소에서 이만큼 안쪽 */
const NAME_MATCH_KM = 50;

/** 일정 첫 항목의 note 에 "테마|설명" 으로 날짜별 테마를 저장 */
const THEME_SEP = '|';

export function useCourse() {
  const trip = useTripStore((s) => s.trip);
  const places = useTripStore((s) => s.places);
  const itinerary = useTripStore((s) => s.itinerary);
  const members = useTripStore((s) => s.members);
  const load = useTripStore((s) => s.load);
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const country = trip ? getCountry(trip.countryCode)?.country : undefined;
  const days = trip ? Math.max(1, diffDays(trip.departDate, trip.returnDate) + 1) : 1;
  // 패키지 여행은 여행사가 확정한 일정이라 수정·투표 불가
  const locked = !!trip?.packageInfo;
  const canEdit = !locked && !!me && (me.isOwner || me.canEditShared);
  const reload = () => trip && load(trip.id);

  const sortedPlaces = useMemo(
    () => [...places].sort((a, b) => b.voterIds.length - a.voterIds.length || a.createdAt.localeCompare(b.createdAt)),
    [places],
  );
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const dayPlans = useMemo(
    () =>
      Array.from({ length: days }, (_, d) => {
        const items = itinerary.filter((i) => i.dayIndex === d).sort((a, b) => a.position - b.position);
        const stops = items.map((i) => byId.get(i.placeId)).filter((p): p is Place => !!p);
        const [title, summary] = (items[0]?.note ?? '').split(THEME_SEP);
        const coords = stops.filter((p) => p.lat !== null && p.lng !== null).map((p) => ({ lat: p.lat!, lng: p.lng! }));
        return {
          dayIndex: d,
          date: trip ? addDays(trip.departDate, d) : '',
          label: trip ? `${d + 1}일차 · ${formatKDate(addDays(trip.departDate, d))}` : `${d + 1}일차`,
          title: title || null,
          summary: summary || null,
          stops,
          km: routeKm(coords),
        };
      }),
    [days, itinerary, byId, trip],
  );
  const scheduledIds = new Set(itinerary.map((i) => i.placeId));
  const unscheduled = sortedPlaces.filter((p) => !scheduledIds.has(p.id));

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
      await reload();
    }
  };

  const save = (plans: { dayIndex: number; placeIds: string[]; theme?: string }[]) => {
    if (!trip) return Promise.resolve();
    const rows: ItineraryInput[] = plans.flatMap((p) =>
      p.placeIds.map((placeId, position) => ({ placeId, dayIndex: p.dayIndex, position, note: position === 0 ? (p.theme ?? '') : '' })),
    );
    return repo.setItinerary(trip.id, rows);
  };
  const currentPlans = () => dayPlans.map((d) => ({ dayIndex: d.dayIndex, placeIds: d.stops.map((s) => s.id), theme: d.title ? `${d.title}${THEME_SEP}${d.summary ?? ''}` : '' }));

  return {
    trip,
    country,
    center: country?.center ?? { lat: 37.5665, lng: 126.978 },
    me,
    members,
    canEdit,
    locked,
    provider: trip?.packageInfo?.provider ?? null,
    days,
    places: sortedPlaces.map((p) => ({ place: p, votes: p.voterIds.length, mine: !!me && p.voterIds.includes(me.id) })),
    dayPlans,
    unscheduled,
    busy,
    error,
    notice,
    setNotice,

    /**
     * 공유받은 텍스트/붙여넣은 링크 해석. 링크의 실제 주소에 좌표가 있으면 그대로 쓰고,
     * 없으면 영어 이름으로 찾아 주소 근처일 때만 쓰고, 그것도 안 되면 주소로 대략적인 위치를 찾음
     */
    async parse(text: string): Promise<ParsedPlace> {
      const parsed = parseSharedText(text);
      if (parsed.lat !== null || !parsed.url || !trip) return parsed;
      const resolved = await repo.resolveMapsLink(trip.id, parsed.url);
      if (!resolved) return parsed;
      const coords = extractCoords(resolved.url);
      const placeText = extractName(resolved.url);
      const split = placeText ? splitPlaceText(placeText) : null;
      const name = parsed.name ?? split?.name ?? null;
      const done = { ...parsed, name, needsResolve: false };
      if (coords) return { ...done, lat: coords.lat, lng: coords.lng };
      const country = placeText ? countryCodeOf(placeText) : null;
      const near = split?.address ? await geocodeAddress(split.address, country) : null;
      const outside = !!near?.countryCode && near.countryCode !== trip.countryCode.toLowerCase();
      if (resolved.englishName && near) {
        await waitPolitely();
        const exact = await geocodePlace(resolved.englishName, country);
        if (exact && distanceKm(exact, near) <= NAME_MATCH_KM) return { ...done, lat: exact.lat, lng: exact.lng, byName: true, outside };
      }
      return near ? { ...done, lat: near.lat, lng: near.lng, approx: true, outside } : done;
    },
    addPlace: (input: { name: string; note: string; lat: number | null; lng: number | null; sourceUrl?: string | null }) =>
      run(async () => {
        if (!trip || !me) return;
        await repo.addPlace(trip.id, { ...input }, me.id);
      }),
    toggleVote: (placeId: string) => run(async () => me && repo.toggleVote(placeId, me.id)),
    removePlace: (placeId: string) => run(() => repo.deletePlace(placeId)),
    canRemove: (p: Place) => !locked && !!me && (canEdit || p.createdBy === me.id),

    /** 규칙 기반 자동 배치 (무료) */
    autoPlan: () =>
      run(async () => {
        const plan = planItinerary(
          places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, votes: p.voterIds.length })),
          days,
        );
        await save(plan);
        setNotice('가까운 곳끼리 묶어서 일정을 짰어요. 순서는 자유롭게 바꿀 수 있어요.');
      }),

    /** AI 일정: 묶기·순서는 코드로, AI 는 날짜별 테마·설명·순서 다듬기만 */
    aiPlan: () =>
      run(async () => {
        if (!trip) return;
        const draft = planItinerary(
          places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, votes: p.voterIds.length })),
          days,
        );
        const res = await repo.invokeAi<{ days: AiDayTheme[] }>('itinerary', {
          tripId: trip.id,
          city: country?.sampleCity,
          country: country?.name,
          days: draft.map((d) => ({
            dayIndex: d.dayIndex,
            date: addDays(trip.departDate, d.dayIndex),
            places: d.placeIds.map((id) => {
              const p = byId.get(id)!;
              return { id, name: p.name, note: p.note, votes: p.voterIds.length };
            }),
          })),
        });
        if (!res || res.fallback) {
          await save(draft);
          setNotice(res?.reason ?? 'AI를 쓸 수 없어 가까운 곳끼리 자동으로 묶었어요.');
          return;
        }
        const valid = new Set(places.map((p) => p.id));
        const plans = draft.map((d) => {
          const ai = res.data.days.find((x) => x.dayIndex === d.dayIndex);
          const ordered = ai ? ai.placeIds.filter((id) => valid.has(id) && d.placeIds.includes(id)) : [];
          const rest = d.placeIds.filter((id) => !ordered.includes(id));
          return {
            dayIndex: d.dayIndex,
            placeIds: [...ordered, ...rest],
            theme: ai ? `${ai.title}${THEME_SEP}${ai.summary}` : '',
          };
        });
        await save(plans);
        setNotice(res.remaining !== null ? `AI가 일정을 정리했어요 (오늘 남은 AI 일정 ${res.remaining}회)` : 'AI가 일정을 정리했어요.');
      }),

    /** 장소를 다른 날로 옮기거나(day) 같은 날 안에서 위아래로(delta) */
    move: (placeId: string, toDay: number | null, delta = 0) =>
      run(async () => {
        const plans = currentPlans();
        const from = plans.find((p) => p.placeIds.includes(placeId));
        if (from && toDay === from.dayIndex && delta !== 0) {
          const i = from.placeIds.indexOf(placeId);
          const j = i + delta;
          if (j < 0 || j >= from.placeIds.length) return;
          [from.placeIds[i], from.placeIds[j]] = [from.placeIds[j], from.placeIds[i]];
        } else {
          if (from) from.placeIds = from.placeIds.filter((id) => id !== placeId);
          if (toDay !== null) plans[toDay].placeIds.push(placeId);
        }
        await save(plans);
      }),
    clearPlan: () => run(() => save([])),
  };
}
