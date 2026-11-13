// 재난 정보 자료를 화면에 보여 줄 형태로 바꾸는 순수 함수들.
// 일본: P2P지진정보(일본 기상청 발표 재배포), 전 세계: GDACS(유엔·EU 재난 경보 체계).
export type DisasterEvent = { id: string; title: string; detail: string; at: string; severe: boolean; url?: string };

const DAY_MS = 86_400_000;
export const RECENT_DAYS = 7;
const JP_MIN_SCALE = 45; // 진도 5약 이상만

const SHINDO: Record<number, string> = { 45: '5약', 46: '5약 이상 추정', 50: '5강', 55: '6약', 60: '6강', 70: '7' };
const TSUNAMI_GRADE: Record<string, string> = { MajorWarning: '대형 쓰나미 경보', Warning: '쓰나미 경보', Watch: '쓰나미 주의보' };
const GDACS_KIND: Record<string, string> = { EQ: '지진', TC: '태풍', FL: '홍수', VO: '화산', TS: '쓰나미', DR: '가뭄', WF: '산불' };

/** 기상청 시각('2026/11/04 07:28:00', 일본 시간) → ms */
export function jstToMs(s: string): number {
  return Date.parse(`${s.replace(/\//g, '-').replace(' ', 'T')}+09:00`);
}

const toIso = (ms: number) => new Date(ms).toISOString();

type P2pQuake = {
  id: string;
  earthquake?: { time: string; maxScale: number; domesticTsunami?: string; hypocenter?: { name?: string; magnitude?: number } };
};

export function parseJapanQuakes(list: P2pQuake[], nowMs: number): DisasterEvent[] {
  const seen = new Set<string>();
  const out: DisasterEvent[] = [];
  for (const q of list) {
    const e = q.earthquake;
    if (!e || e.maxScale < JP_MIN_SCALE) continue;
    const at = jstToMs(e.time);
    if (nowMs - at > RECENT_DAYS * DAY_MS) continue;
    // 같은 지진의 보도가 여러 번 오므로 시각으로 묶음
    if (seen.has(e.time)) continue;
    seen.add(e.time);
    const place = e.hypocenter?.name || '일본';
    const mag = e.hypocenter?.magnitude;
    const tsunami = e.domesticTsunami && !['None', 'Unknown', 'Checking', 'NonEffective'].includes(e.domesticTsunami);
    out.push({
      id: q.id,
      title: `지진 · 최대 진도 ${SHINDO[e.maxScale] ?? e.maxScale / 10}`,
      detail: `${place}${mag && mag > 0 ? ` · 규모 ${mag}` : ''}${tsunami ? ' · 쓰나미 정보 있음' : ''}`,
      at: toIso(at),
      severe: e.maxScale >= 55 || !!tsunami,
    });
  }
  return out;
}

type P2pTsunami = { id: string; cancelled?: boolean; issue?: { time?: string }; areas?: { grade?: string; name?: string }[] };

/** 가장 최근 발표만 봄. 해제되었거나 3일 넘게 지났으면 없음 */
export function parseJapanTsunami(list: P2pTsunami[], nowMs: number): DisasterEvent[] {
  const latest = list[0];
  if (!latest || latest.cancelled || !latest.issue?.time) return [];
  const at = jstToMs(latest.issue.time);
  if (nowMs - at > 3 * DAY_MS) return [];
  const areas = latest.areas ?? [];
  const grade = ['MajorWarning', 'Warning', 'Watch'].find((g) => areas.some((a) => a.grade === g));
  if (!grade) return [];
  const names = areas.filter((a) => a.grade === grade).map((a) => a.name).filter(Boolean);
  return [{ id: latest.id, title: TSUNAMI_GRADE[grade], detail: names.slice(0, 3).join(', ') + (names.length > 3 ? ` 외 ${names.length - 3}곳` : ''), at: toIso(at), severe: true }];
}

type GdacsProps = { eventtype: string; eventid: number; alertlevel?: string; name?: string; fromdate?: string; todate?: string; iscurrent?: string | boolean; url?: { report?: string } };

export function parseGdacs(json: { features?: { properties: GdacsProps }[] }, nowMs: number): DisasterEvent[] {
  const out: DisasterEvent[] = [];
  for (const { properties: p } of json.features ?? []) {
    const level = (p.alertlevel ?? '').toLowerCase();
    if (level !== 'orange' && level !== 'red') continue;
    const last = Date.parse(`${(p.todate ?? p.fromdate ?? '').replace(/Z?$/, '')}Z`);
    if (Number.isNaN(last) || nowMs - last > RECENT_DAYS * DAY_MS) continue;
    out.push({
      id: `gdacs-${p.eventtype}-${p.eventid}`,
      title: `${GDACS_KIND[p.eventtype] ?? '재난'} · ${level === 'red' ? '적색' : '주황색'} 경보`,
      detail: p.name ?? '',
      at: toIso(last),
      severe: level === 'red',
      url: p.url?.report,
    });
  }
  return out;
}

/** 나라별 지진 조회 범위 [서, 남, 동, 북]. 이웃 나라 지진이 일부 섞일 수 있어 장소를 함께 보여 줌 */
const QUAKE_BOXES: Record<string, [number, number, number, number][]> = {
  JP: [[122, 20, 154, 46]],
  TW: [[119, 21, 123, 26]],
  VN: [[102, 8, 110, 24]],
  TH: [[97, 5, 106, 21]],
  US: [[-125, 24, -66, 49], [-170, 51, -130, 72], [-161, 18, -154, 23]],
};
const USGS_MIN_MAG = 5.5;

type UsgsFeature = { id: string; properties: { mag: number | null; place?: string | null; time: number; url?: string; tsunami?: number }; geometry: { coordinates: number[] } };

export function parseUsgs(json: { features?: UsgsFeature[] }, countryCode: string, nowMs: number): DisasterEvent[] {
  const boxes = QUAKE_BOXES[countryCode] ?? [];
  const out: DisasterEvent[] = [];
  for (const f of json.features ?? []) {
    const { mag, place, time, url, tsunami } = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    if (mag === null || mag < USGS_MIN_MAG || nowMs - time > RECENT_DAYS * DAY_MS) continue;
    if (!boxes.some(([w, s, e, n]) => lng >= w && lng <= e && lat >= s && lat <= n)) continue;
    out.push({
      id: `usgs-${f.id}`,
      title: `지진 · 규모 ${mag.toFixed(1)}`,
      detail: `${place ?? ''}${tsunami ? ' · 쓰나미 정보 있음' : ''}`,
      at: toIso(time),
      severe: mag >= 6.5 || !!tsunami,
      url,
    });
  }
  return out;
}

export function sortEvents(events: DisasterEvent[]): DisasterEvent[] {
  return [...events].sort((a, b) => Number(b.severe) - Number(a.severe) || b.at.localeCompare(a.at));
}
