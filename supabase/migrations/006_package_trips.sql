-- 여행사 패키지 여행: 여행 종류 + 패키지 정보, 여행사가 처리한 체크리스트 항목
alter table public.trips add column if not exists kind text not null default 'free';
alter table public.trips drop constraint if exists trips_kind_check;
alter table public.trips add constraint trips_kind_check check (kind in ('free', 'package'));
alter table public.trips add column if not exists package_info jsonb;

alter table public.checklist_items add column if not exists provided_by text;
