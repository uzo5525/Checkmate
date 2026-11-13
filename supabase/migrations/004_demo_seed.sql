-- 004: 시연용 샘플 데이터 (방장만 자기 여행에 실행 가능)
-- 가상 동행자(로그인 계정 없음)를 추가하고, 진행 상황·담당자·투표 장소를 채움
create or replace function public.seed_demo(p_trip uuid, p_names text[], p_places jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid;
  ids uuid[] := '{}';
  m uuid;
  n text;
  k int := 0;
  personal uuid[];
  shared uuid[];
  pl jsonb;
  pid uuid;
  voters text[];
  i int;
begin
  if not public.is_trip_owner(p_trip) then raise exception 'only owner'; end if;
  me := public.my_member_id(p_trip);

  foreach n in array p_names loop
    m := gen_random_uuid();
    insert into members (id, trip_id, nickname, is_owner, can_edit_shared, joined_at, user_id)
    values (m, p_trip, left(n, 20), false, k = 0, now(), null);
    ids := ids || m;
    k := k + 1;
  end loop;

  select array_agg(id order by due_offset desc, sort_order) into personal
  from checklist_items where trip_id = p_trip and scope = 'personal' and owner_member_id is null;
  select array_agg(id order by due_offset desc, sort_order) into shared
  from checklist_items where trip_id = p_trip and scope = 'shared';

  -- 동행자별 진행 상황 (4, 2, 6개 완료)
  for i in 1..coalesce(array_length(ids, 1), 0) loop
    insert into item_status (trip_id, item_id, owner_key, done, updated_by, updated_at)
    select p_trip, x, ids[i]::text, true, ids[i], now()
    from unnest(personal[1:(array[4, 2, 6])[1 + ((i - 1) % 3)]]) as x
    on conflict (item_id, owner_key) do nothing;
  end loop;

  -- 공유 항목 담당자 배정 (나 + 동행자 순서대로)
  if shared is not null then
    for i in 1..array_length(shared, 1) loop
      update checklist_items set assignee_id = (array[me] || ids)[1 + ((i - 1) % (1 + coalesce(array_length(ids, 1), 0)))]
      where id = shared[i];
    end loop;
    insert into item_status (trip_id, item_id, owner_key, done, updated_by, updated_at)
    values (p_trip, shared[1], 'shared', true, me, now()) on conflict do nothing;
  end if;
  if personal is not null then
    insert into item_status (trip_id, item_id, owner_key, done, updated_by, updated_at)
    values (p_trip, personal[1], me::text, true, me, now()) on conflict do nothing;
  end if;

  -- 투표 장소 (voters: 0 = 나, 1.. = 동행자)
  for pl in select * from jsonb_array_elements(p_places) loop
    pid := gen_random_uuid();
    select coalesce(array_agg(((array[me] || ids)[(v)::int + 1])::text), '{}') into voters
    from jsonb_array_elements_text(coalesce(pl->'voters', '[]'::jsonb)) as v;
    insert into places (id, trip_id, name, note, created_by, voter_ids, created_at, lat, lng)
    values (pid, p_trip, pl->>'name', coalesce(pl->>'note', ''), me, voters, now(), (pl->>'lat')::float8, (pl->>'lng')::float8);
  end loop;
end
$$;

grant execute on function public.seed_demo(uuid, text[], jsonb) to authenticated;
