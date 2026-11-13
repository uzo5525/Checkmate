// AI 준비 에이전트: 앱이 규칙으로 찾은 신호(남은 날짜, 놓친 항목, 동행 진행률, 여행 날 날씨, 일정 등)를 받아
// "오늘 할 일 3가지" + 할 일 제안 + 역할 분담 팁 + 바로 실행할 행동(담당 지정·일정 옮기기·짐 추가)으로 정리.
// 사실 정보는 만들지 않음. 앱은 상황 지문(fp)이 바뀔 때만 이 함수를 부름.
import { askJson, authorize, cached, json, preflight, store, takeQuota } from '../_shared/ai.ts';

const PER_TRIP_DAILY = 12; // 여행당 하루 (멤버 수 × 1~2회 정도)
const GLOBAL_DAILY = 150;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'tasks', 'suggestions', 'roleTips', 'actions'],
  properties: {
    headline: { type: 'string', description: '한 문장 요약 (40자 이내)' },
    tasks: {
      type: 'array',
      description: '오늘 할 일 최대 3개, 중요도 순',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'reason', 'itemId'],
        properties: {
          title: { type: 'string' },
          reason: { type: 'string', description: '왜 지금 해야 하는지 (50자 이내)' },
          itemId: { type: ['string', 'null'], description: '입력에 있던 항목 id, 없으면 null' },
        },
      },
    },
    suggestions: {
      type: 'array',
      description: '체크리스트에 없는 새 할 일 제안 최대 2개 (입력의 candidates 와 일정에 근거한 것만)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'scope', 'dueOffset', 'reason'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          scope: { type: 'string', enum: ['personal', 'shared'] },
          dueOffset: { type: 'integer', enum: [30, 14, 7, 3, 1] },
          reason: { type: 'string' },
        },
      },
    },
    roleTips: { type: 'array', description: '동행 역할 분담 팁 최대 2개', items: { type: 'string' } },
    actions: {
      type: 'array',
      description: '사용자가 승인하면 앱이 바로 실행할 행동 최대 2개. 근거가 없으면 빈 배열',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'title', 'reason', 'itemId', 'memberId', 'placeId', 'toDay', 'item'],
        properties: {
          type: { type: 'string', enum: ['assign', 'move_stop', 'add_packing'] },
          title: { type: 'string', description: '버튼 위 한 줄 (25자 이내)' },
          reason: { type: 'string', description: '왜 필요한지 (40자 이내)' },
          itemId: { type: ['string', 'null'], description: 'assign: sharedPending 의 itemId' },
          memberId: { type: ['string', 'null'], description: 'assign: companions 의 memberId' },
          placeId: { type: ['string', 'null'], description: 'move_stop: days 의 placeId' },
          toDay: { type: ['integer', 'null'], description: 'move_stop: 옮길 날짜(day, 0부터)' },
          item: { type: ['string', 'null'], description: 'add_packing: 짐 이름 (예: 우산)' },
        },
      },
    },
  },
};

const SYSTEM = `너는 해외여행 출발 전 준비를 돕는 "Checkmate"의 준비 에이전트야.
입력은 앱이 규칙으로 계산한 여행 상태(JSON)야. 이걸 바탕으로 사용자가 오늘 무엇부터 하면 좋을지 짧고 친근한 한국어(해요체)로 정리해.
규칙:
- 입국 요건, 비자, 검역, 금액 같은 사실 정보를 새로 만들어 말하지 마. 입력에 있는 항목 제목과 상태만 근거로 써.
- tasks 는 overdue → dueSoon 순으로, 입력의 itemId 를 그대로 써. 최대 3개.
- suggestions 는 입력의 candidates 나 일정 장소에서 분명히 필요한 것만. 확실하지 않으면 빈 배열.
- 동행자의 개인 항목 이름은 입력에 없고, 진행률만 있어. 특정인을 비난하지 말고 역할 분담을 제안해.
- actions 는 입력에 근거가 있을 때만, 입력의 id 를 그대로 써서 최대 2개:
  · assign: permissions.canAssign 이 true 이고 sharedPending 중 담당자가 없거나 진행이 느린 사람이 맡은 항목을, 진행이 빠른 companions 에게 맡기기
  · move_stop: permissions.canEditPlan 이 true 이고 rainDays 날짜에 야외 장소(공원·성·거리·전망대·신사 등)가 있으면, 비 안 오는 다른 날(day)로 옮기기. day 0 = 출발일
  · add_packing: 날씨(weather)를 보고 packing 에 없는 것만 (비 → 우산, 최저 5도 이하 → 두꺼운 겉옷, 최고 28도 이상 → 선크림)
  · 해당 없는 필드는 null
- 문장은 짧게.`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const body = await req.json();
    const tripId = String(body.tripId ?? '');
    const ctx = await authorize(req, tripId);
    if (ctx instanceof Response) return ctx;

    // 오늘 같은 상황(fp)으로 이미 만든 결과가 있으면 그대로 (AI 호출 없음)
    const fp = String(body.fp ?? '');
    if (!body.force) {
      const hit = await cached(ctx, 'briefing', true);
      if (hit && (hit as { fp?: string }).fp === fp) return json({ data: hit, cached: true, fallback: false, remaining: null });
    }
    const quota = await takeQuota(ctx, 'briefing', PER_TRIP_DAILY, GLOBAL_DAILY);
    if (!quota.ok) return json({ data: null, cached: false, fallback: true, remaining: 0, reason: quota.reason });

    const out = await askJson<Record<string, unknown>>(SYSTEM, JSON.stringify(body.signals ?? {}), schema, 2000);
    if (!out) return json({ data: null, cached: false, fallback: true, remaining: quota.remaining, reason: 'AI를 잠시 쓸 수 없어 기본 브리핑을 보여드려요.' });
    await store(ctx, 'briefing', true, { ...out, fp });
    return json({ data: out, cached: false, fallback: false, remaining: quota.remaining });
  } catch (e) {
    console.error(e);
    return json({ data: null, cached: false, fallback: true, remaining: null, reason: '브리핑을 만들지 못했어요.' });
  }
});
