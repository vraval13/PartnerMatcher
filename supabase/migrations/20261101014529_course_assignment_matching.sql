-- US-04 / US-05. Additive: does not change the team's profiles/courses tables.
begin;
create table public.matching_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mode text not null check (mode in ('course','assignment')),
  display_name varchar(100) not null check (btrim(display_name) <> ''),
  institution varchar(120) not null check (btrim(institution) <> ''),
  course_code varchar(40) not null check (btrim(course_code) <> ''),
  topic varchar(200) not null check (btrim(topic) <> ''),
  institution_key text generated always as (lower(regexp_replace(btrim(institution),'\s+',' ','g'))) stored,
  course_key text generated always as (lower(regexp_replace(btrim(course_code),'\s+',' ','g'))) stored,
  topic_key text generated always as (lower(regexp_replace(btrim(topic),'\s+',' ','g'))) stored,
  assignment_id varchar(100), due_date date,
  timezone varchar(80) not null,
  location_preference text not null check (location_preference in ('online','in_person','either')),
  location varchar(120) not null default '',
  is_listed boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((mode='course' and assignment_id is null and due_date is null)
      or (mode='assignment' and assignment_id is not null and btrim(assignment_id)<>'' and assignment_id=btrim(assignment_id) and due_date is not null)),
  check (location_preference<>'in_person' or btrim(location)<>''),
  check (archived_at is null or not is_listed)
);
create table public.matching_availability (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.matching_goals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null,
  timezone varchar(80) not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_time>start_time),
  check (extract(second from start_time)=0 and extract(second from end_time)=0),
  unique(goal_id,weekday,start_time,end_time,timezone)
);
create index matching_goals_owner on public.matching_goals(user_id,created_at desc);
create index matching_goals_course on public.matching_goals(institution_key,course_key,topic_key) where is_listed and archived_at is null and mode='course';
create index matching_goals_assignment on public.matching_goals(institution_key,course_key,assignment_id) where is_listed and archived_at is null and mode='assignment';
-- The availability UNIQUE constraint starts with goal_id, covering the FK lookup.
create function public.validate_matching_timezone() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
    raise exception 'Invalid IANA timezone' using errcode='23514';
  end if;
  new.updated_at=now(); return new;
end $$;
create trigger matching_goal_timezone before insert or update on public.matching_goals for each row execute function public.validate_matching_timezone();
create trigger matching_slot_timezone before insert or update on public.matching_availability for each row execute function public.validate_matching_timezone();
revoke all on function public.validate_matching_timezone() from public,anon,authenticated;
alter table public.matching_goals enable row level security;
alter table public.matching_availability enable row level security;
revoke all on public.matching_goals,public.matching_availability from anon;
grant select,insert,update,delete on public.matching_goals,public.matching_availability to authenticated;
create policy goals_read on public.matching_goals for select to authenticated
using (user_id=(select auth.uid()) or (is_listed and archived_at is null));
create policy goals_insert on public.matching_goals for insert to authenticated with check(user_id=(select auth.uid()));
create policy goals_update on public.matching_goals for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy goals_delete on public.matching_goals for delete to authenticated using(user_id=(select auth.uid()));
create policy slots_read on public.matching_availability for select to authenticated using(
  exists(select 1 from public.matching_goals g where g.id=goal_id and (g.user_id=(select auth.uid()) or (g.is_listed and g.archived_at is null)))
);
create policy slots_insert on public.matching_availability for insert to authenticated with check(
  exists(select 1 from public.matching_goals g where g.id=goal_id and g.user_id=(select auth.uid()))
);
create policy slots_update on public.matching_availability for update to authenticated using(
  exists(select 1 from public.matching_goals g where g.id=goal_id and g.user_id=(select auth.uid()))
) with check(exists(select 1 from public.matching_goals g where g.id=goal_id and g.user_id=(select auth.uid())));
create policy slots_delete on public.matching_availability for delete to authenticated using(
  exists(select 1 from public.matching_goals g where g.id=goal_id and g.user_id=(select auth.uid()))
);
-- Atomic goal + slots creation. Uses the caller's JWT and RLS, never a service-role key.
create function public.create_matching_goal(payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare new_id uuid; slot jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if jsonb_typeof(payload->'availability') is distinct from 'array' then
    raise exception 'Availability must be an array' using errcode='22023';
  end if;
  if jsonb_array_length(payload->'availability') not between 1 and 21 then
    raise exception 'Between 1 and 21 slots required' using errcode='22023';
  end if;
  if payload->>'mode'='assignment' and (payload->>'due_date')::date < (now() at time zone (payload->>'timezone'))::date then
    raise exception 'Deadline has passed' using errcode='22023';
  end if;
  insert into public.matching_goals(user_id,mode,display_name,institution,course_code,topic,assignment_id,due_date,timezone,location_preference,location,is_listed)
  values(auth.uid(),payload->>'mode',btrim(payload->>'display_name'),btrim(payload->>'institution'),btrim(payload->>'course_code'),btrim(payload->>'topic'),payload->>'assignment_id',(payload->>'due_date')::date,payload->>'timezone',payload->>'location_preference',coalesce(payload->>'location',''),coalesce((payload->>'is_listed')::boolean,false)) returning id into new_id;
  for slot in select value from jsonb_array_elements(payload->'availability') loop
    insert into public.matching_availability(goal_id,weekday,start_time,end_time,timezone)
    values(new_id,(slot->>'weekday')::smallint,(slot->>'start_time')::time,(slot->>'end_time')::time,slot->>'timezone');
  end loop;
  return new_id;
end $$;
revoke all on function public.create_matching_goal(jsonb) from public,anon;
grant execute on function public.create_matching_goal(jsonb) to authenticated;
commit;
