// 홈의 날씨·환율 화면용 데이터
import { useEffect, useState } from 'react';

import { getCountry } from '@/data/countries';
import { friendlyError } from '@/lib/errors';
import { fetchDisasters, type DisasterResult } from '@/services/disaster';
import { fetchRate, fetchWeather, rateUnit, type RateData, type WeatherData } from '@/services/travelInfo';
import { useTripStore } from '@/store/trip';

type Load<T> = { data: T | null; error: string | null; loading: boolean };

/** 여행지 날씨: 장소가 있으면 장소들의 가운데, 없으면 나라 대표 도시 기준 */
export function useWeather() {
  const trip = useTripStore((s) => s.trip);
  const places = useTripStore((s) => s.places);
  const country = trip ? getCountry(trip.countryCode)?.country : undefined;
  const pts = places.filter((p) => p.lat !== null && p.lng !== null);
  const lat = pts.length ? pts.reduce((n, p) => n + p.lat!, 0) / pts.length : (country?.center.lat ?? 37.57);
  const lng = pts.length ? pts.reduce((n, p) => n + p.lng!, 0) / pts.length : (country?.center.lng ?? 126.98);
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const [state, setState] = useState<Load<WeatherData> & { key: string }>({ data: null, error: null, loading: true, key: '' });

  useEffect(() => {
    let alive = true;
    fetchWeather(lat, lng)
      .then((data) => alive && setState({ data, error: null, loading: false, key }))
      .catch((e) => alive && setState({ data: null, error: friendlyError(e), loading: false, key }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const placeName = pts.length ? `${country?.sampleCity ?? ''} 일대`.trim() : (country?.sampleCity ?? '');
  return { ...state, loading: state.loading || state.key !== key, trip, placeName, country };
}

const DISASTER_REFRESH_MS = 5 * 60_000;

/** 여행지 최근 재난 정보. 화면이 열려 있는 동안 5분마다 새로고침 */
export function useDisasters() {
  const countryCode = useTripStore((s) => s.trip?.countryCode);
  const [state, setState] = useState<{ data: DisasterResult | null; loading: boolean }>({ data: null, loading: true });

  useEffect(() => {
    if (!countryCode) return;
    let alive = true;
    const refresh = () =>
      fetchDisasters(countryCode)
        .then((data) => alive && setState({ data, loading: false }))
        .catch(() => alive && setState({ data: { events: [], failed: ['재난'] }, loading: false }));
    setState({ data: null, loading: true });
    refresh();
    const timer = setInterval(refresh, DISASTER_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [countryCode]);

  return { events: state.data?.events ?? [], failed: state.data?.failed ?? [], loading: state.loading };
}

/** 여행지 통화 환율 (원화 기준) */
export function useExchange() {
  const trip = useTripStore((s) => s.trip);
  const country = trip ? getCountry(trip.countryCode)?.country : undefined;
  const currency = country?.currency ?? '';
  const [state, setState] = useState<Load<RateData>>({ data: null, error: null, loading: true });

  useEffect(() => {
    if (!currency) return;
    let alive = true;
    fetchRate(currency)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: friendlyError(e), loading: false }));
    return () => {
      alive = false;
    };
  }, [currency]);

  return { ...state, currency, currencyName: country?.currencyName ?? currency, unit: rateUnit(currency), country };
}
