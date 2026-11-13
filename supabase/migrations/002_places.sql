-- 여행 코스 투표 (장소 제안 + 투표). schema.sql 을 이미 실행했다면 이 파일만 추가로 실행하세요.
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
