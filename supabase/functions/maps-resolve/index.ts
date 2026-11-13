// 구글 지도 공유 링크가 이어지는 실제 주소를 알려 줌 (브라우저는 보안 정책상 직접 열 수 없음).
// 유료 API 없이 일반 요청으로 주소만 따라가고 본문은 읽지 않음. 구글 지도 주소만 허용.
// 주소에 좌표가 없으면 장소 이름을 영어로 바꿔 줌. 무료 위치 검색이 구글의 한글 음역 이름을 못 찾기 때문.
import { askJson, authorize, json, preflight, takeQuota } from '../_shared/ai.ts';

const ALLOWED_HOST = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|(www\.|maps\.)?google\.[a-z.]+)$/i;
const MAX_REDIRECTS = 5;
const PER_TRIP_DAILY = 30;
const GLOBAL_DAILY = 300;

const SYSTEM = `입력은 구글 지도의 장소 이름과 주소야. 이 장소를 지도 검색에서 찾을 수 있는 영어 이름 하나만 답해.
- 널리 쓰이는 공식 영어 이름이나 로마자 표기를 써. 주소, 도시, 나라는 넣지 마.
- 어떤 장소인지 확실하지 않으면 빈 문자열로 답해. 추측하지 마.`;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['englishName'],
  properties: { englishName: { type: 'string', description: '장소의 영어 이름. 모르면 빈 문자열' } },
};

function allowed(url: URL): boolean {
  return url.protocol === 'https:' && ALLOWED_HOST.test(url.hostname);
}

function placeText(url: string): string | null {
  const m = url.match(/\/place\/([^/@?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).slice(0, 200);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const body = await req.json();
    const ctx = await authorize(req, String(body.tripId ?? ''));
    if (ctx instanceof Response) return ctx;

    let current = new URL(String(body.url ?? ''));
    if (!allowed(current)) return json({ url: null, englishName: null });
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const res = await fetch(current, { redirect: 'manual' });
      await res.body?.cancel();
      const location = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !location) break;
      const next = new URL(location, current);
      if (!allowed(next)) break;
      current = next;
    }
    const url = current.toString();

    let englishName: string | null = null;
    const text = placeText(url);
    const hasCoords = /!3d-?\d|@-?\d+\.\d+,-?\d/.test(url);
    if (text && !hasCoords) {
      const quota = await takeQuota(ctx, 'maps', PER_TRIP_DAILY, GLOBAL_DAILY);
      if (quota.ok) {
        const out = await askJson<{ englishName: string }>(SYSTEM, text, schema, 100);
        englishName = out?.englishName?.trim() || null;
      }
    }
    return json({ url, englishName });
  } catch (e) {
    console.error(e);
    return json({ url: null, englishName: null });
  }
});
