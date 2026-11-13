// AI에게 물어보기: 여행 준비 질문에 Checkmate 데이터(체크리스트·반입 규정·국가 정보·내 일정) 안에서만 쉬운 말로 답함.
// 데이터에 없는 사실은 지어내지 않고 공식 출처 확인을 안내. 필요하면 체크리스트에 추가할 할 일 하나를 제안.
import { askJson, authorize, json, preflight, takeQuota } from '../_shared/ai.ts';

const PER_TRIP_DAILY = 20;
const GLOBAL_DAILY = 300;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'sources', 'suggestTitle', 'suggestDueOffset'],
  properties: {
    answer: { type: 'string', description: '쉬운 해요체 답변, 4문장 이내' },
    sources: {
      type: 'array',
      description: '답변 근거가 된 context 안의 출처 (최대 2개, 없으면 빈 배열)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'url'],
        properties: { name: { type: 'string' }, url: { type: 'string' } },
      },
    },
    suggestTitle: { type: 'string', description: '체크리스트에 추가하면 좋을 할 일 (없으면 빈 문자열, 이미 있는 항목이면 빈 문자열)' },
    suggestDueOffset: { type: 'integer', enum: [30, 14, 7, 3, 1] },
  },
};

const SYSTEM = `너는 해외여행 준비 앱 "Checkmate"의 도우미야. 사용자는 해외여행이 익숙하지 않은 중장년일 수 있어.
입력은 { question, context } 야. context 에는 이 여행의 나라 정보, 체크리스트(항목 설명·출처), 기내 반입 규정, 일정이 있어.
규칙:
- context 에 있는 내용만 근거로 답해. 비자·입국 요건·검역·반입 기준·금액 같은 사실을 새로 만들지 마.
- 숫자·개수·기간·제한 여부는 context 에 글자로 적혀 있을 때만 말해. 적혀 있지 않으면 "Checkmate 정보에는 없어요"라고 하고 항공사·공식 안내 확인을 권해. (예: 개수 제한이 안 적혀 있으면 '제한 없다'고 말하지 마)
- context 로 답할 수 없으면 "Checkmate에 아직 정보가 없어요"라고 말하고, 대사관·항공사 같은 공식 안내를 확인하라고 해.
- 쉬운 말, 해요체, 4문장 이내. 전문 용어는 풀어서.
- 콘센트는 country.plug 와 country.koreaPlug 를 비교해서 답해. 모양이 같다고 짐작하지 마.
- sources 는 context 항목의 source 에 적힌 name 과 url 그대로만. url 은 http 로 시작해야 해. 그 항목이 답의 직접 근거일 때만 넣고, 아니면 빈 배열로 답해. 나라 기본 정보(콘센트, 통화 등)에는 출처가 없으니 빈 배열이야. 지어낸 링크나 필드 이름 금지.
- 여행 준비와 관계없는 질문이면 여행 준비 질문을 해 달라고 짧게 답해.
- 투자·법률·의료 판단은 하지 말고 전문가나 공식 기관 확인을 권해.`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const body = await req.json();
    const tripId = String(body.tripId ?? '');
    const question = String(body.question ?? '').trim().slice(0, 200);
    if (!question) return json({ data: null, cached: false, fallback: true, remaining: null, reason: '질문을 입력해 주세요.' });
    const ctx = await authorize(req, tripId);
    if (ctx instanceof Response) return ctx;

    const quota = await takeQuota(ctx, 'ask', PER_TRIP_DAILY, GLOBAL_DAILY);
    if (!quota.ok) return json({ data: null, cached: false, fallback: true, remaining: 0, reason: quota.reason });

    const out = await askJson<Record<string, unknown>>(SYSTEM, JSON.stringify({ question, context: body.context ?? {} }), schema, 1200);
    if (!out) return json({ data: null, cached: false, fallback: true, remaining: quota.remaining, reason: 'AI를 잠시 쓸 수 없어요. 잠시 뒤 다시 물어봐 주세요.' });
    return json({ data: out, cached: false, fallback: false, remaining: quota.remaining });
  } catch (e) {
    console.error(e);
    return json({ data: null, cached: false, fallback: true, remaining: null, reason: '답변을 만들지 못했어요.' });
  }
});
