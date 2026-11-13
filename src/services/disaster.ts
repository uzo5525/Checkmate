// 나라별 최근 재난 정보 (무료, 키 없음). 공식 경보를 대신하지 않습니다.
// 지진: 일본은 기상청 발표(P2P지진정보), 그 밖은 USGS. 태풍·홍수 등: GDACS.
import { parseGdacs, parseJapanQuakes, parseJapanTsunami, parseUsgs, sortEvents, type DisasterEvent } from '@/lib/disaster';

const GDACS_COUNTRY: Record<string, string> = { JP: 'Japan', VN: 'Vietnam', TH: 'Thailand', TW: 'Taiwan', US: 'United States' };
const P2P = 'https://api.p2pquake.net/v2/history';
const GDACS = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
const USGS_WEEK = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

const FRESH_MS = 5 * 60_000;
const RETRY_MS = 60_000;

/** empty: 내용 없는 응답(204)일 때 쓸 값. GDACS 는 해당 재난이 없으면 204 를 줌 */
async function getJson<T>(url: string, empty?: T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204 && empty !== undefined) return empty;
  return res.json() as Promise<T>;
}

/** failed: 불러오지 못한 자료 이름 ("없음"으로 오해하지 않도록 화면에 알림) */
export type DisasterResult = { events: DisasterEvent[]; failed: string[] };

async function load(countryCode: string): Promise<DisasterResult> {
  const now = Date.now();
  const jobs: { label: string; run: Promise<DisasterEvent[]> }[] = [];
  const name = GDACS_COUNTRY[countryCode];
  if (name) {
    jobs.push({
      label: '태풍·홍수',
      run: getJson<Parameters<typeof parseGdacs>[0]>(`${GDACS}?eventlist=TC;FL;VO;TS&country=${encodeURIComponent(name)}&alertlevel=orange;red`, {}).then((j) => parseGdacs(j, now)),
    });
  }
  if (countryCode === 'JP') {
    jobs.push({ label: '지진', run: getJson<Parameters<typeof parseJapanQuakes>[0]>(`${P2P}?codes=551&limit=100`).then((l) => parseJapanQuakes(l, now)) });
    jobs.push({ label: '쓰나미', run: getJson<Parameters<typeof parseJapanTsunami>[0]>(`${P2P}?codes=552&limit=1`).then((l) => parseJapanTsunami(l, now)) });
  } else {
    jobs.push({ label: '지진', run: getJson<Parameters<typeof parseUsgs>[0]>(USGS_WEEK).then((j) => parseUsgs(j, countryCode, now)) });
  }
  const settled = await Promise.allSettled(jobs.map((j) => j.run));
  const events = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  return { events: sortEvents(events), failed: jobs.filter((_, i) => settled[i].status === 'rejected').map((j) => j.label) };
}

const cache = new Map<string, { at: number; ttl: number; result: Promise<DisasterResult> }>();

/** 같은 나라는 5분 동안 다시 요청하지 않음 (실패가 섞이면 1분 뒤 다시 시도) */
export function fetchDisasters(countryCode: string): Promise<DisasterResult> {
  const hit = cache.get(countryCode);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.result;
  const entry = { at: Date.now(), ttl: RETRY_MS, result: load(countryCode) };
  cache.set(countryCode, entry);
  entry.result.then((r) => {
    if (r.failed.length === 0) entry.ttl = FRESH_MS;
  });
  return entry.result;
}
