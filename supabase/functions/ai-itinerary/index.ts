// AI 일정 정리: 앱이 좌표로 묶어 둔 날짜별 장소 목록을 받아
// 날짜별 테마·짧은 설명·방문 순서만 다듬음. 장소를 새로 만들거나 날짜를 옮기지 않음.
import { askJson, authorize, json, preflight, store, takeQuota } from '../_shared/ai.ts';

const PER_TRIP_DAILY = 3;
const GLOBAL_DAILY = 40;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['days'],
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dayIndex', 'title', 'summary', 'placeIds'],
        properties: {
          dayIndex: { type: 'integer' },
          title: { type: 'string', description: '날짜 테마 (15자 이내, 예: "난바 먹방 투어")' },
          summary: { type: 'string', description: '한두 문장 (60자 이내)' },
          placeIds: { type: 'array', items: { type: 'string' }, description: '그 날의 장소 id 를 추천 방문 순서로' },
        },
      },
    },
  },
};

const SYSTEM = `너는 여행 동행자들이 투표한 장소로 날짜별 일정을 정리하는 도우미야.
입력의 days 는 앱이 거리 기준으로 이미 묶어 둔 날짜별 장소 목록이야.
규칙:
- 각 날짜의 placeIds 에는 그 날짜에 주어진 id 만, 전부, 한 번씩 넣어. 다른 날짜로 옮기거나 새로 만들지 마.
- 순서는 자연스러운 하루 동선으로 (예: 오전 관광 → 점심 시장 → 저녁 야경). 장소 메모와 표 수를 참고해.
- title 은 짧은 한국어 테마, summary 는 해요체 한두 문장.
- 영업시간·가격 같은 사실은 지어내지 마.
- 장소가 없는 날은 title "자유 일정", summary "가고 싶은 곳을 더 투표해 보세요.", placeIds [] 로.`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const body = await req.json();
    const tripId = String(body.tripId ?? '');
    const ctx = await authorize(req, tripId);
    if (ctx instanceof Response) return ctx;

    const quota = await takeQuota(ctx, 'itinerary', PER_TRIP_DAILY, GLOBAL_DAILY);
    if (!quota.ok) return json({ data: null, cached: false, fallback: true, remaining: 0, reason: quota.reason });

    const input = { city: body.city, country: body.country, days: body.days };
    const out = await askJson<{ days: unknown[] }>(SYSTEM, JSON.stringify(input), schema, 2500);
    if (!out) return json({ data: null, cached: false, fallback: true, remaining: quota.remaining, reason: 'AI를 잠시 쓸 수 없어 거리 기준으로만 묶었어요.' });
    await store(ctx, 'itinerary', false, out);
    return json({ data: out, cached: false, fallback: false, remaining: quota.remaining });
  } catch (e) {
    console.error(e);
    return json({ data: null, cached: false, fallback: true, remaining: null, reason: '일정을 정리하지 못했어요.' });
  }
});
