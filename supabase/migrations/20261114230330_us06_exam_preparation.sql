begin;

alter table public.matching_goals
  add column exam_date date,
  add column prep_start date,
  add column prep_end date,
  add constraint matching_goals_exam_dates_check check (
    (exam_date is null and prep_start is null and prep_end is null)
    or (category is not distinct from 'exam_prep'
        and exam_date is not null and prep_start is not null and prep_end is not null
        and prep_start <= prep_end and prep_end <= exam_date
        and exam_date <= prep_start + 366)
  );

create index matching_goals_exam_search
  on public.matching_goals(subject_or_skill_key, exam_date)
  where category = 'exam_prep' and is_listed and archived_at is null;

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
  if requested_category = 'exam_prep' and (
      payload->>'exam_date' is null or payload->>'prep_start' is null or payload->>'prep_end' is null
  ) then
    raise exception 'Exam and preparation dates are required' using errcode='22023';
  end if;
  if requested_category = 'course' and payload->>'mode'='assignment'
     and (payload->>'due_date')::date < (now() at time zone (payload->>'timezone'))::date then
    raise exception 'Deadline has passed' using errcode='22023';
  end if;

  insert into public.matching_goals(
    user_id,information_version,category,subject_or_skill,proficiency_level,
    mode,display_name,institution,course_code,topic,assignment_id,due_date,
    timezone,location_preference,location,is_listed,exam_date,prep_start,prep_end
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
    coalesce((payload->>'is_listed')::boolean,false),
    (payload->>'exam_date')::date,(payload->>'prep_start')::date,(payload->>'prep_end')::date
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
