-- 003: 익명 로그인 기반 보안 규칙(RLS) + 지도·일정·AI 테이블
-- 참고: 이전 시연 데이터는 user_id 가 없어 앱에서 더 이상 보이지 않습니다 (삭제하지는 않음).

-- ───────── 컬럼 추가 ─────────
alter table public.members add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists members_user_idx on public.members(user_id);
create unique index if not exists members_trip_user_uq on public.members(trip_id, user_id);

-- 개인 항목 중 "내가 직접 추가한 것"은 owner_member_id 가 있음 (null = 모든 멤버 공통 템플릿 항목)
alter table public.checklist_items add column if not exists owner_member_id uuid references public.members(id) on delete cascade;
alter table public.checklist_items add column if not exists created_by_ai boolean not null default false;

alter table public.places add column if not exists lat double precision;
alter table public.places add column if not exists lng double precision;
alter table public.places add column if not exists address text;
alter table public.places add column if not exists source_url text;

-- 날짜별 일정
create table if not exists public.itinerary_items (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  day_index int not null check (day_index >= 0),
  position int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists itinerary_trip_idx on public.itinerary_items(trip_id);
alter table public.itinerary_items replica identity full;

-- AI 결과 캐시 + 사용량 (Edge Function 이 service role 로만 기록)
create table if not exists public.ai_outputs (
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  kind text not null,                -- 'briefing' | 'itinerary'
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  content jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists ai_outputs_lookup on public.ai_outputs(trip_id, kind, day);

create table if not exists public.ai_usage (
  day date not null,
  scope text not null,               -- 'global' | 'trip:<id>'
  kind text not null,
  count int not null default 0,
  primary key (day, scope, kind)
);

-- ───────── 권한 헬퍼 (security definer: RLS 재귀 방지) ─────────
create or replace function public.my_member_id(tid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where trip_id = tid and user_id = auth.uid() limit 1
$$;

create or replace function public.is_trip_member(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where trip_id = tid and user_id = auth.uid())
$$;

create or replace function public.is_trip_owner(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where trip_id = tid and user_id = auth.uid() and is_owner)
$$;

create or replace function public.can_edit_shared(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where trip_id = tid and user_id = auth.uid() and (is_owner or can_edit_shared))
$$;

create or replace function public.trip_has_members(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where trip_id = tid)
$$;

-- 완료 체크 권한: 내 개인 항목, 또는 공유 항목(편집 권한자 또는 담당자)
create or replace function public.can_set_status(tid uuid, iid uuid, okey text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when okey = 'shared' then
      public.can_edit_shared(tid)
      or exists (select 1 from checklist_items i where i.id = iid and i.assignee_id = public.my_member_id(tid))
    else okey = public.my_member_id(tid)::text
  end
$$;

-- ───────── RPC ─────────
-- 방 코드로 여행 미리보기 (멤버가 아니어도 최소 정보만)
create or replace function public.find_trip_by_code(p_code text)
returns table (id uuid, code text, title text, country_code text, nationality text, depart_date date, return_date date, party_size int, owner_member_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.title, t.country_code, t.nationality, t.depart_date, t.return_date, t.party_size, t.owner_member_id, t.created_at
  from trips t where t.code = upper(p_code) limit 1
$$;

-- 방 참여 (이미 참여 중이면 기존 멤버 반환)
create or replace function public.join_trip(p_code text, p_nickname text)
returns setof public.members
language plpgsql security definer set search_path = public as $$
declare
  t_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into t_id from trips where code = upper(p_code);
  if t_id is null then raise exception 'trip not found'; end if;
  if not exists (select 1 from members where trip_id = t_id and user_id = auth.uid()) then
    if (select count(*) from members where trip_id = t_id) >= 20 then raise exception 'trip is full'; end if;
    insert into members (id, trip_id, nickname, is_owner, can_edit_shared, joined_at, user_id)
    values (gen_random_uuid(), t_id, left(trim(p_nickname), 20), false, false, now(), auth.uid());
  end if;
  return query select * from members where trip_id = t_id and user_id = auth.uid();
end
$$;

-- 투표 토글 (내 멤버 id 로만)
create or replace function public.toggle_vote(p_place uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  t_id uuid; me uuid;
begin
  select trip_id into t_id from places where id = p_place;
  me := public.my_member_id(t_id);
  if me is null then raise exception 'not a member'; end if;
  update places set voter_ids =
    case when me::text = any(voter_ids) then array_remove(voter_ids, me::text) else array_append(voter_ids, me::text) end
  where id = p_place;
end
$$;

-- 방장 넘기기
create or replace function public.transfer_owner(p_trip uuid, p_to uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trip_owner(p_trip) then raise exception 'only owner'; end if;
  if not exists (select 1 from members where id = p_to and trip_id = p_trip) then raise exception 'not a member'; end if;
  update members set is_owner = false where trip_id = p_trip and user_id = auth.uid();
  update members set is_owner = true, can_edit_shared = true where id = p_to;
  update trips set owner_member_id = p_to where id = p_trip;
end
$$;

grant execute on function public.find_trip_by_code(text), public.join_trip(text, text), public.toggle_vote(uuid), public.transfer_owner(uuid, uuid) to authenticated;

-- ───────── 정책 (이전 "모두 허용" 정책 제거) ─────────
drop policy if exists "prototype all" on public.trips;
drop policy if exists "prototype all" on public.members;
drop policy if exists "prototype all" on public.checklist_items;
drop policy if exists "prototype all" on public.item_status;
drop policy if exists "prototype all" on public.places;

alter table public.itinerary_items enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.ai_usage enable row level security;

-- trips
create policy trips_select on public.trips for select to authenticated using (public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated with check (auth.uid() is not null);
create policy trips_update on public.trips for update to authenticated using (public.is_trip_owner(id));
create policy trips_delete on public.trips for delete to authenticated using (public.is_trip_owner(id));

-- members: 생성자(첫 멤버)만 직접 insert, 나머지는 join_trip RPC
create policy members_select on public.members for select to authenticated using (public.is_trip_member(trip_id));
create policy members_insert on public.members for insert to authenticated
  with check (user_id = auth.uid() and is_owner and not public.trip_has_members(trip_id));
create policy members_update on public.members for update to authenticated using (public.is_trip_owner(trip_id));
create policy members_delete on public.members for delete to authenticated
  using (public.is_trip_owner(trip_id) or user_id = auth.uid());

-- checklist_items: 남이 직접 추가한 개인 항목은 보이지 않음
create policy items_select on public.checklist_items for select to authenticated
  using (public.is_trip_member(trip_id) and (owner_member_id is null or owner_member_id = public.my_member_id(trip_id)));
create policy items_insert on public.checklist_items for insert to authenticated
  with check (
    public.is_trip_member(trip_id) and (
      (scope = 'shared' and public.can_edit_shared(trip_id))
      or (scope = 'personal' and (owner_member_id = public.my_member_id(trip_id) or (owner_member_id is null and public.is_trip_owner(trip_id))))
    ));
create policy items_update on public.checklist_items for update to authenticated
  using (
    public.is_trip_member(trip_id) and (
      (scope = 'shared' and public.can_edit_shared(trip_id))
      or (scope = 'personal' and (owner_member_id = public.my_member_id(trip_id) or (owner_member_id is null and public.is_trip_owner(trip_id))))
    ));
create policy items_delete on public.checklist_items for delete to authenticated
  using (
    (scope = 'shared' and public.can_edit_shared(trip_id))
    or (scope = 'personal' and owner_member_id = public.my_member_id(trip_id)));

-- item_status: 진행률 계산을 위해 멤버는 모두 읽기, 쓰기는 권한 확인
create policy status_select on public.item_status for select to authenticated using (public.is_trip_member(trip_id));
create policy status_insert on public.item_status for insert to authenticated
  with check (public.can_set_status(trip_id, item_id, owner_key));
create policy status_update on public.item_status for update to authenticated
  using (public.can_set_status(trip_id, item_id, owner_key));

-- places: 투표는 toggle_vote RPC
create policy places_select on public.places for select to authenticated using (public.is_trip_member(trip_id));
create policy places_insert on public.places for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = public.my_member_id(trip_id));
create policy places_update on public.places for update to authenticated
  using (public.can_edit_shared(trip_id) or created_by = public.my_member_id(trip_id));
create policy places_delete on public.places for delete to authenticated
  using (public.can_edit_shared(trip_id) or created_by = public.my_member_id(trip_id));

-- itinerary
create policy itin_select on public.itinerary_items for select to authenticated using (public.is_trip_member(trip_id));
create policy itin_insert on public.itinerary_items for insert to authenticated with check (public.can_edit_shared(trip_id));
create policy itin_update on public.itinerary_items for update to authenticated using (public.can_edit_shared(trip_id));
create policy itin_delete on public.itinerary_items for delete to authenticated using (public.can_edit_shared(trip_id));

-- AI 결과: 읽기만 (쓰기는 Edge Function 의 service role)
create policy ai_outputs_select on public.ai_outputs for select to authenticated
  using (public.is_trip_member(trip_id) and (member_id is null or member_id = public.my_member_id(trip_id)));

-- 익명(로그인 전) 키로는 아무것도 못 하게
revoke all on public.trips, public.members, public.checklist_items, public.item_status, public.places, public.itinerary_items, public.ai_outputs, public.ai_usage from anon;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.itinerary_items;
exception when duplicate_object then null; end $$;
