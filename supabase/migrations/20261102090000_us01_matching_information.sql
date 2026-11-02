-- US-01. Adds complete matching information without inventing values for legacy rows.
begin;

alter table public.matching_goals
  add column information_version smallint,
  add column category text,
  add column subject_or_skill varchar(120),
  add column proficiency_level text;

-- Rows created before US-01 remain version 1 and retain course/assignment behavior.
update public.matching_goals set information_version = 1;

alter table public.matching_goals
  alter column information_version set default 2,
  alter column information_version set not null,
  alter column mode drop not null,
  alter column institution drop not null,
  alter column course_code drop not null,
  alter column topic drop not null,
  add column subject_or_skill_key text generated always as
    (lower(regexp_replace(btrim(subject_or_skill),'\s+',' ','g'))) stored,
  add constraint matching_goals_information_version_check
    check (information_version in (1,2)),
  add constraint matching_goals_information_fields_check check (
    (information_version = 1
      and category is null
      and subject_or_skill is null
      and proficiency_level is null
      and mode in ('course','assignment')
      and institution is not null and btrim(institution) <> ''
      and course_code is not null and btrim(course_code) <> ''
      and topic is not null and btrim(topic) <> '')
    or
    (information_version = 2
      and category in ('course','exam_prep','skill_practice')
      and subject_or_skill is not null
      and btrim(subject_or_skill) <> ''
      and subject_or_skill = btrim(subject_or_skill)
      and proficiency_level in ('beginner','intermediate','advanced'))
  ),
  add constraint matching_goals_category_fields_check check (
    information_version = 1
    or
    (category = 'course'
      and mode in ('course','assignment')
      and institution is not null and btrim(institution) <> ''
      and course_code is not null and btrim(course_code) <> ''
      and topic is not null and btrim(topic) <> '')
    or
    (category in ('exam_prep','skill_practice')
      and mode is null
      and institution is null
      and course_code is null
      and topic is null
      and assignment_id is null
      and due_date is null)
  );

create index matching_goals_information_subject
  on public.matching_goals(category,subject_or_skill_key)
  where information_version = 2 and is_listed and archived_at is null;

-- Authenticated clients may not create an incomplete version-1 row directly.
drop policy goals_insert on public.matching_goals;
create policy goals_insert on public.matching_goals for insert to authenticated
with check(user_id=(select auth.uid()) and information_version=2);

create function public.prevent_matching_information_version_change() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.information_version <> old.information_version then
    raise exception 'Matching information version cannot be changed' using errcode='23514';
  end if;
  return new;
end $$;
create trigger matching_information_version_immutable
before update of information_version on public.matching_goals
for each row execute function public.prevent_matching_information_version_change();
revoke all on function public.prevent_matching_information_version_change() from public,anon,authenticated;

-- Same public contract and caller/RLS semantics; all newly created rows are version 2.
create or replace function public.create_matching_goal(payload jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare new_id uuid; slot jsonb; requested_category text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if jsonb_typeof(payload->'availability') is distinct from 'array' then
    raise exception 'Availability must be an array' using errcode='22023';
  end if;
  if jsonb_array_length(payload->'availability') not between 1 and 21 then
    raise exception 'Between 1 and 21 slots required' using errcode='22023';
  end if;
  requested_category := payload->>'category';
  if requested_category = 'course' and payload->>'mode'='assignment'
     and (payload->>'due_date')::date < (now() at time zone (payload->>'timezone'))::date then
    raise exception 'Deadline has passed' using errcode='22023';
  end if;

  insert into public.matching_goals(
    user_id,information_version,category,subject_or_skill,proficiency_level,
    mode,display_name,institution,course_code,topic,assignment_id,due_date,
    timezone,location_preference,location,is_listed
  ) values (
    auth.uid(),2,requested_category,btrim(payload->>'subject_or_skill'),payload->>'proficiency_level',
    case when requested_category='course' then payload->>'mode' else null end,
    btrim(payload->>'display_name'),
    case when requested_category='course' then nullif(btrim(payload->>'institution'),'') else null end,
    case when requested_category='course' then nullif(btrim(payload->>'course_code'),'') else null end,
    case when requested_category='course' then nullif(btrim(payload->>'topic'),'') else null end,
    case when requested_category='course' then nullif(payload->>'assignment_id','') else null end,
    case when requested_category='course' then (payload->>'due_date')::date else null end,
    payload->>'timezone',payload->>'location_preference',coalesce(btrim(payload->>'location'),''),
    coalesce((payload->>'is_listed')::boolean,false)
  ) returning id into new_id;

  for slot in select value from jsonb_array_elements(payload->'availability') loop
    insert into public.matching_availability(goal_id,weekday,start_time,end_time,timezone)
    values(new_id,(slot->>'weekday')::smallint,(slot->>'start_time')::time,(slot->>'end_time')::time,slot->>'timezone');
  end loop;
  return new_id;
end $$;

revoke all on function public.create_matching_goal(jsonb) from public,anon;
grant execute on function public.create_matching_goal(jsonb) to authenticated;

commit;
