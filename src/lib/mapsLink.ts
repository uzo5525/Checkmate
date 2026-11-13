// 구글 지도 공유 링크/텍스트에서 장소 이름과 좌표를 뽑아냄 (순수 함수, 무료 — 유료 API 미사용).
// 구글 지도 앱 공유 텍스트 예: "도톤보리\n일본 오사카부 ...\nhttps://maps.app.goo.gl/AbCd123"

export type ParsedPlace = {
  name: string | null;
  lat: number | null;
  lng: number | null;
  url: string | null;
  /** 짧은 링크라 좌표를 얻으려면 한 번 열어 봐야 함 */
  needsResolve: boolean;
  /** 장소가 아니라 주소로 찾은 대략적인 위치 */
  approx?: boolean;
  /** 좌표가 아니라 장소 이름으로 찾은 위치 */
  byName?: boolean;
  /** 찾은 위치가 여행 국가 밖 */
  outside?: boolean;
};

const URL_RE = /https?:\/\/[^\s<>"']+/i;
const SHORT_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;

function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** URL·HTML 문자열에서 좌표 찾기. 정확한 장소 좌표(!3d!4d)를 지도 중심(@lat,lng)보다 우선 */
export function extractCoords(text: string): { lat: number; lng: number } | null {
  const patterns: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*\+?(-?\d+(?:\.\d+)?)/i,
    /\/search\/(-?\d+(?:\.\d+)?)(?:,|%2C)\s*\+?(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (validCoord(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

function decodeName(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' ')).trim();
  } catch {
    return s.replace(/\+/g, ' ').trim();
  }
}

/** URL 경로의 /place/<이름>/ 또는 ?q=<이름> 에서 장소 이름 */
export function extractName(url: string): string | null {
  const place = url.match(/\/place\/([^/@?]+)/);
  if (place) return decodeName(place[1]);
  const q = url.match(/[?&](?:q|query)=([^&]+)/);
  if (q) {
    const v = decodeName(q[1]);
    if (!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(v)) return v;
  }
  return null;
}

export function isShortMapsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SHORT_HOSTS.test(u.hostname) && (u.hostname !== 'goo.gl' || u.pathname.startsWith('/maps'));
  } catch {
    return false;
  }
}

/** 공유받은 텍스트(또는 붙여넣은 링크) 해석 */
export function parseSharedText(text: string): ParsedPlace {
  const trimmed = text.trim();
  const url = trimmed.match(URL_RE)?.[0] ?? null;
  // URL 이 아닌 첫 줄 = 장소 이름 (구글 지도 앱 공유 형식)
  const firstLine = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !URL_RE.test(l));
  const coords = extractCoords(trimmed);
  const nameFromUrl = url ? extractName(url) : null;
  return {
    name: firstLine ?? nameFromUrl,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    url,
    needsResolve: !coords && !!url && isShortMapsUrl(url),
  };
}

const COUNTRY_WORD = /^(일본|미국|대만|태국|베트남|대한민국|한국)$/;
const COUNTRY_CODES: [RegExp, string][] = [
  [/(^|\s)(일본|Japan)\s*$/i, 'jp'],
  [/(^|\s)(미국|United States|USA)\s*$/i, 'us'],
  [/(^|\s)(대만|Taiwan)\s*$/i, 'tw'],
  [/(^|\s)(태국|Thailand)\s*$/i, 'th'],
  [/(^|\s)(베트남|Vietnam)\s*$/i, 'vn'],
  [/(^|\s)(대한민국|한국|South Korea)\s*$/i, 'kr'],
];

/** 공유 주소 끝의 나라 이름 → 나라 코드. 모르는 나라면 null */
export function countryCodeOf(placeText: string): string | null {
  const text = placeText.replace(/,/g, ' ');
  const found = COUNTRY_CODES.find(([re]) => re.test(text)) ?? COUNTRY_CODES.find(([re]) => /(일본|미국|대만|태국|베트남)/.test(text) && re.test(text.split(/\s+/).find((t) => COUNTRY_WORD.test(t)) ?? ''));
  return found?.[1] ?? null;
}

/**
 * 공유 주소의 "이름 + 주소" 한 덩어리를 나눔. 예: "스테츄 오브 리버티 국가기념물 New York, NY 10004 미국"
 * 한글 이름은 무료 위치 검색에서 엉뚱한 곳으로 찾히므로, 검색에는 영문 주소만 씀.
 */
export function splitPlaceText(text: string): { name: string; address: string | null } {
  const tokens = text.trim().split(/\s+/);
  const start = tokens.findIndex((t) => /[A-Za-z〒]/.test(t));
  if (start === -1) return { name: text.trim(), address: null };
  if (start === 0) {
    const [name, ...rest] = text.split(',').map((s) => s.trim());
    return { name, address: rest.length ? rest.join(', ') : null };
  }
  const name = tokens.slice(0, start).filter((t, i, all) => !(i === all.length - 1 && COUNTRY_WORD.test(t))).join(' ');
  const address = tokens.slice(start).filter((t) => !t.startsWith('〒') && !COUNTRY_WORD.test(t)).join(' ');
  return { name, address: address || null };
}

/** 지도 주소에 좌표가 없을 때 찾아볼 주소들: 전체 → 맨 끝 부분을 뺀 것 */
export function addressQueries(address: string): string[] {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? [parts.join(', '), parts.slice(0, -1).join(', ')] : [address];
}

/** "구글맵에서 열기" 링크 (무료, 구글 지도 앱/웹으로 이동) */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** 여러 장소를 순서대로 잇는 길찾기 링크 (구글 지도 앱에서 열림, 무료) */
export function googleDirectionsUrl(points: { lat: number; lng: number }[]): string | null {
  if (points.length < 2) return null;
  const fmt = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
  const origin = fmt(points[0]);
  const destination = fmt(points[points.length - 1]);
  const waypoints = points.slice(1, -1).map(fmt).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
}
