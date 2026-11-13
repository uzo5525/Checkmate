// 현지 날씨·환율 (무료·키 없는 공개 API). 하루 동안 기기 메모리에 캐시해서 호출 최소화.
// - 날씨: Open-Meteo (https://open-meteo.com) — 키 없음, 비상업 무료. 정식 출시(상업) 시 유료 플랜 또는 다른 무료 API로 교체 검토
// - 환율: ExchangeRate-API 공개 엔드포인트 (https://www.exchangerate-api.com) — 키 없음, 출처 표시 필요, 하루 1회 갱신
import type { IconName } from '@/components/ui';

export type DayWeather = { date: string; code: number; max: number; min: number; rain: number | null };
export type WeatherData = { currentTemp: number | null; currentCode: number | null; days: DayWeather[]; fetchedAt: string };
export type RateData = { currency: string; krwPerUnit: number; updatedAt: string };

const cache = new Map<string, { at: number; value: unknown }>();
const DAY_MS = 24 * 60 * 60 * 1000;
const WEATHER_TTL = 3 * 60 * 60 * 1000; // 날씨는 3시간

async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const key = `w:${lat.toFixed(2)},${lng.toFixed(2)}`;
  return cached(key, WEATHER_TTL, async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=auto&forecast_days=16';
    const res = await fetch(url);
    if (!res.ok) throw new Error('날씨를 불러오지 못했어요.');
    const j = await res.json();
    const d = j.daily ?? {};
    const days: DayWeather[] = (d.time ?? []).map((date: string, i: number) => ({
      date,
      code: d.weather_code?.[i] ?? 0,
      max: Math.round(d.temperature_2m_max?.[i] ?? 0),
      min: Math.round(d.temperature_2m_min?.[i] ?? 0),
      rain: d.precipitation_probability_max?.[i] ?? null,
    }));
    return { currentTemp: j.current?.temperature_2m ?? null, currentCode: j.current?.weather_code ?? null, days, fetchedAt: new Date().toISOString() };
  });
}

export function fetchRate(currency: string): Promise<RateData> {
  return cached(`r:${currency}`, DAY_MS, async () => {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (!res.ok) throw new Error('환율을 불러오지 못했어요.');
    const j = await res.json();
    const perKrw = j.rates?.[currency];
    if (!perKrw) throw new Error('이 통화의 환율이 없어요.');
    return { currency, krwPerUnit: 1 / perKrw, updatedAt: j.time_last_update_utc ?? '' };
  });
}

/** WMO 날씨 코드 → 한국어 + 이모지 */
export function weatherLabel(code: number | null): { text: string; icon: IconName } {
  if (code === null) return { text: '-', icon: 'cloud' };
  if (code === 0) return { text: '맑음', icon: 'sun' };
  if (code <= 2) return { text: '구름 조금', icon: 'weather' };
  if (code === 3) return { text: '흐림', icon: 'cloud' };
  if (code <= 48) return { text: '안개', icon: 'fog' };
  if (code <= 57) return { text: '이슬비', icon: 'drizzle' };
  if (code <= 67) return { text: '비', icon: 'rain' };
  if (code <= 77) return { text: '눈', icon: 'snow' };
  if (code <= 82) return { text: '소나기', icon: 'drizzle' };
  if (code <= 86) return { text: '눈보라', icon: 'snow' };
  return { text: '뇌우', icon: 'storm' };
}

/** 통화 표시 단위: 엔·동처럼 단위가 작은 통화는 100/1000 단위로 */
export function rateUnit(currency: string): number {
  if (currency === 'VND') return 1000;
  if (currency === 'JPY') return 100;
  return 1;
}
