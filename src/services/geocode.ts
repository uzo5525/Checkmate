// 주소 → 대략적인 위치 (OpenStreetMap Nominatim, 무료·키 없음). 사용자가 링크를 넣을 때만 호출합니다.
// 지명만 찾습니다(layer=address). 같은 이름의 가게·시설이 잡히면 엉뚱한 나라에 핀이 찍히기 때문입니다.
import { Platform } from 'react-native';

import { addressQueries } from '@/lib/mapsLink';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const POLITE_DELAY_MS = 1100; // 초당 1회 이하 (Nominatim 이용 정책)
// Nominatim 은 앱을 밝히지 않은 요청을 막음. Android 기본값(okhttp)은 403. 브라우저는 자체 값을 씀.
const REQUEST: RequestInit = Platform.OS === 'web' ? {} : { headers: { 'User-Agent': 'Checkmate/1.0 (+https://readygo.expo.app)' } };

type Hit = { lat: string; lon: string; address?: { country_code?: string } };

/** 영어 이름으로 장소 찾기. 같은 이름이 다른 곳에 있을 수 있어 호출한 쪽에서 주소 근처인지 확인 */
export async function geocodePlace(name: string, countryCode: string | null): Promise<{ lat: number; lng: number } | null> {
  const country = countryCode ? `&countrycodes=${countryCode}` : '';
  try {
    const res = await fetch(`${NOMINATIM}?format=jsonv2&limit=1${country}&q=${encodeURIComponent(name)}`, REQUEST);
    const hit = ((await res.json()) as Hit[])[0];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

export const waitPolitely = () => new Promise((r) => setTimeout(r, POLITE_DELAY_MS));

/** countryCode: 공유 주소에 적힌 나라. 모르면 null 로 전 세계에서 찾음 */
export async function geocodeAddress(address: string, countryCode: string | null): Promise<{ lat: number; lng: number; countryCode: string | null } | null> {
  const queries = addressQueries(address);
  const country = countryCode ? `&countrycodes=${countryCode}` : '';
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
    try {
      const res = await fetch(`${NOMINATIM}?format=jsonv2&limit=1&layer=address&addressdetails=1${country}&q=${encodeURIComponent(queries[i])}`, REQUEST);
      const hit = ((await res.json()) as Hit[])[0];
      if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), countryCode: hit.address?.country_code ?? null };
    } catch {
      return null;
    }
  }
  return null;
}
