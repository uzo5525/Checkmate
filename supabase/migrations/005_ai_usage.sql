-- 005: AI 사용량 상한 (Edge Function 이 service role 로만 호출)
-- 반환: 이번 호출을 포함한 사용 횟수가 상한 이내면 남은 횟수(>=0), 넘으면 -1 (증가하지 않음)
create or replace function public.bump_ai_usage(p_scope text, p_kind text, p_max int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  c int;
begin
  insert into ai_usage (day, scope, kind, count) values (d, p_scope, p_kind, 0)
  on conflict (day, scope, kind) do nothing;
  update ai_usage set count = count + 1
  where day = d and scope = p_scope and kind = p_kind and count < p_max
  returning count into c;
  if c is null then return -1; end if;
  return p_max - c;
end
$$;

revoke all on function public.bump_ai_usage(text, text, int) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(text, text, int) to service_role;
grant select, insert, update on public.ai_usage, public.ai_outputs to service_role;
