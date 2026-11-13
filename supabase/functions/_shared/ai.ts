// AI Edge Function 공통: 사용자 확인 → 캐시 → 사용량 상한 → Claude 호출 → 저장
// ⚠️ ANTHROPIC_API_KEY 는 Supabase Secrets 에만 있음. 앱에는 절대 넣지 않음.
import Anthropic from 'npm:@anthropic-ai/sdk@0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// 기본은 가장 저렴한 Haiku (짧은 한국어 JSON 출력이라 충분). 바꾸려면 Supabase Secrets 의 AI_MODEL
export const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-haiku-5-5';
// 서버 측 거절 대체(fallbacks)는 Haiku 에서 지원하지 않음
const FALLBACK = MODEL.includes('haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys);
    return parsed.default ?? Object.values(parsed)[0];
  }
  throw new Error('service key missing');
}

function anonKey(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys);
    return parsed.default ?? Object.values(parsed)[0];
  }
  throw new Error('anon key missing');
}

export type Ctx = { admin: SupabaseClient; memberId: string; tripId: string };

/** 요청한 사용자가 이 여행의 멤버인지 확인 (보안 규칙 그대로 사용) */
export async function authorize(req: Request, tripId: string): Promise<Ctx | Response> {
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const user = createClient(url, anonKey(), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: memberId, error } = await user.rpc('my_member_id', { tid: tripId });
  if (error || !memberId) return json({ error: 'not a member' }, 403);
  const admin = createClient(url, serviceKey(), { auth: { persistSession: false } });
  return { admin, memberId: memberId as string, tripId };
}

export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export async function cached(ctx: Ctx, kind: string, perMember: boolean) {
  let q = ctx.admin.from('ai_outputs').select('content').eq('trip_id', ctx.tripId).eq('kind', kind).eq('day', todayKst());
  q = perMember ? q.eq('member_id', ctx.memberId) : q.is('member_id', null);
  const { data } = await q.order('created_at', { ascending: false }).limit(1);
  return data?.[0]?.content ?? null;
}

export async function store(ctx: Ctx, kind: string, perMember: boolean, content: unknown) {
  await ctx.admin.from('ai_outputs').insert({
    trip_id: ctx.tripId,
    member_id: perMember ? ctx.memberId : null,
    kind,
    day: todayKst(),
    content,
    model: MODEL,
  });
}

/** 여행별·전체 일일 상한. 넘으면 { ok:false } */
export async function takeQuota(ctx: Ctx, kind: string, perTrip: number, global: number) {
  const g = await ctx.admin.rpc('bump_ai_usage', { p_scope: 'global', p_kind: kind, p_max: global });
  if (g.error || (g.data as number) < 0) return { ok: false, remaining: 0, reason: '오늘 앱 전체 AI 사용량을 다 써서 기본 기능으로 보여드려요.' };
  const t = await ctx.admin.rpc('bump_ai_usage', { p_scope: `trip:${ctx.tripId}`, p_kind: kind, p_max: perTrip });
  if (t.error || (t.data as number) < 0) return { ok: false, remaining: 0, reason: '이 여행의 오늘 AI 사용 횟수를 다 썼어요. 내일 다시 쓸 수 있어요.' };
  return { ok: true, remaining: t.data as number };
}

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

/**
 * 구조화된 JSON 응답 받기. 실패(잔액 소진·거절·오류)하면 null → 호출한 쪽에서 규칙 기반으로 대체.
 * 비용 절감: effort low, 짧은 출력.
 */
export async function askJson<T>(system: string, user: string, schema: Record<string, unknown>, maxTokens = 2000): Promise<T | null> {
  try {
    // deno-lint-ignore no-explicit-any
    const res: any = await (client.beta.messages.create as any)({
      model: MODEL,
      max_tokens: maxTokens,
      ...FALLBACK,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    });
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') {
      console.warn('ai stop', res.stop_reason);
      return null;
    }
    const text = (res.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('ai error', e instanceof Error ? e.message : e);
    return null;
  }
}
