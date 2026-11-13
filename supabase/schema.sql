-- Checkmate Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

create table if not exists public.trips (
  id uuid primary key,
  code text not null unique check (char_length(code) = 6),
  country_code text not null,
  nationality text not null,
  depart_date date not null,
  return_date date not null,
  party_size int not null check (party_size between 1 and 20),
  title text not null,
  owner_member_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  nickname text not null,
  is_owner boolean not null default false,
  can_edit_shared boolean not null default false,
  joined_at timestamptz not null default now()
);
create index if not exists members_trip_idx on public.members(trip_id);

create table if not exists public.checklist_items (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  template_id text,
  title text not null,
  description text not null default '',
  due_offset int not null,
  scope text not null check (scope in ('personal', 'shared')),
  category text not null,
  source_url text,
  source_name text,
  verified boolean not null default false,
  required boolean not null default false,
  assignee_id uuid references public.members(id) on delete set null,
  sort_order int not null default 0
);
create index if not exists items_trip_idx on public.checklist_items(trip_id);

-- owner_key: 개인 항목은 member id, 공유 항목은 'shared'
create table if not exists public.item_status (
  trip_id uuid not null references public.trips(id) on delete cascade,
  item_id uuid not null references public.checklist_items(id) on delete cascade,
  owner_key text not null,
  done boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (item_id, owner_key)
);
create index if not exists status_trip_idx on public.item_status(trip_id);

-- 여행 코스 투표 (supabase/migrations/002_places.sql 과 동일)
create table if not exists public.places (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  note text not null default '',
  created_by uuid,
  voter_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists places_trip_idx on public.places(trip_id);

alter publication supabase_realtime add table public.places;
alter table public.places replica identity full;

-- ⚠️ 프로토타입용 RLS (schema.sql 과 동일하게 전체 허용)
alter table public.places enable row level security;
drop policy if exists "prototype all" on public.places;
create policy "prototype all" on public.places for all using (true) with check (true);

-- 멤버 삭제 시 그 멤버의 개인 체크 기록도 삭제
create or replace function public.delete_member_statuses() returns trigger as $$
begin
  delete from public.item_status where owner_key = old.id::text;
  return old;
end;
$$ language plpgsql;

drop trigger if exists members_delete_statuses on public.members;
create trigger members_delete_statuses after delete on public.members
  for each row execute function public.delete_member_statuses();

-- Realtime: 변경 사항을 클라이언트로 전송
alter publication supabase_realtime add table public.item_status;
alter publication supabase_realtime add table public.checklist_items;
alter publication supabase_realtime add table public.members;
-- filter(trip_id=eq.…) 를 delete 이벤트에도 적용하려면 replica identity full 필요
alter table public.item_status replica identity full;
alter table public.checklist_items replica identity full;
alter table public.members replica identity full;

-- ⚠️ 프로토타입용 RLS: 익명 키로 모든 읽기/쓰기 허용 (방 코드만 알면 접근 가능).
-- 정식 버전에서는 Supabase 익명 로그인(auth.uid)과 멤버 매핑으로 정책을 좁히세요. (README TODO 참고)
alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.checklist_items enable row level security;
alter table public.item_status enable row level security;

drop policy if exists "prototype all" on public.trips;
drop policy if exists "prototype all" on public.members;
drop policy if exists "prototype all" on public.checklist_items;
drop policy if exists "prototype all" on public.item_status;
create policy "prototype all" on public.trips for all using (true) with check (true);
create policy "prototype all" on public.members for all using (true) with check (true);
create policy "prototype all" on public.checklist_items for all using (true) with check (true);
create policy "prototype all" on public.item_status for all using (true) with check (true);
