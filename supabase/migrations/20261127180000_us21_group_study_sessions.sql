-- US-21: small study groups for compatible course, assignment, or exam goals.
begin;

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  matching_goal_id uuid not null references public.matching_goals(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  capacity smallint not null default 5 check (capacity between 3 and 5),
  participant_count smallint not null default 0 check (participant_count between 0 and 5),
  created_at timestamptz not null default now()
);

create table public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  matching_goal_id uuid not null references public.matching_goals(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (group_id, matching_goal_id)
);

create index study_groups_created_at on public.study_groups(created_at desc);
create index study_group_members_user on public.study_group_members(user_id, joined_at desc);

create function public.sync_study_group_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_group uuid;
begin
  if tg_op = 'DELETE' then
    affected_group := old.group_id;
  else
    affected_group := new.group_id;
  end if;

  update public.study_groups
  set participant_count = (
    select count(*)::smallint from public.study_group_members m where m.group_id = affected_group
  )
  where id = affected_group;
  return null;
end;
$$;

create trigger study_group_member_count
after insert or delete on public.study_group_members
for each row execute function public.sync_study_group_participant_count();

create function public.create_study_group(target_goal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.matching_goals g
    where g.id = target_goal_id and g.user_id = auth.uid() and g.is_listed and g.archived_at is null
  ) then
    raise exception 'GROUP_GOAL_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  insert into public.study_groups(matching_goal_id, created_by)
  values (target_goal_id, auth.uid())
  returning id into new_group_id;

  insert into public.study_group_members(group_id, user_id, matching_goal_id)
  values (new_group_id, auth.uid(), target_goal_id);

  return new_group_id;
end;
$$;

create function public.join_study_group(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_goal_id uuid;
  group_capacity smallint;
  group_count smallint;
  eligible_goal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select g.matching_goal_id, g.capacity, g.participant_count
  into group_goal_id, group_capacity, group_count
  from public.study_groups g
  where g.id = target_group_id
  for update;

  if not found then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.study_group_members m
    where m.group_id = target_group_id and m.user_id = auth.uid()) then
    return target_group_id;
  end if;

  if group_count >= group_capacity then
    raise exception 'GROUP_FULL' using errcode = '23514';
  end if;

  select candidate.id into eligible_goal_id
  from public.matching_goals target
  join public.matching_goals candidate on candidate.user_id = auth.uid()
  where target.id = group_goal_id
    and candidate.is_listed and candidate.archived_at is null
    and (
      (target.information_version = 2 and target.category in ('exam_prep', 'skill_practice')
        and candidate.information_version = 2 and candidate.category = target.category
        and lower(regexp_replace(btrim(coalesce(candidate.subject_or_skill, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(coalesce(target.subject_or_skill, '')), '\s+', ' ', 'g'))
        and (target.category <> 'exam_prep' or candidate.exam_date = target.exam_date))
      or
      (not (target.information_version = 2 and target.category in ('exam_prep', 'skill_practice'))
        and candidate.mode = target.mode
        and lower(regexp_replace(btrim(coalesce(candidate.institution, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(coalesce(target.institution, '')), '\s+', ' ', 'g'))
        and lower(regexp_replace(btrim(coalesce(candidate.course_code, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(coalesce(target.course_code, '')), '\s+', ' ', 'g'))
        and (case when target.mode = 'assignment' then candidate.assignment_id = target.assignment_id
          else lower(regexp_replace(btrim(coalesce(candidate.topic, '')), '\s+', ' ', 'g'))
            = lower(regexp_replace(btrim(coalesce(target.topic, '')), '\s+', ' ', 'g')) end))
    )
  order by candidate.created_at
  limit 1;

  if eligible_goal_id is null then
    raise exception 'GROUP_NOT_ELIGIBLE' using errcode = '23514';
  end if;

  insert into public.study_group_members(group_id, user_id, matching_goal_id)
  values (target_group_id, auth.uid(), eligible_goal_id);

  return target_group_id;
end;
$$;

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
revoke all on public.study_groups, public.study_group_members from anon;
revoke insert, update, delete on public.study_groups, public.study_group_members from authenticated;
grant select on public.study_groups to authenticated;
grant select on public.study_group_members to authenticated;

create policy study_groups_authenticated_read on public.study_groups
for select to authenticated using (true);
create policy study_group_members_own_read on public.study_group_members
for select to authenticated using (user_id = (select auth.uid()));

revoke all on function public.sync_study_group_participant_count() from public, anon, authenticated;
revoke all on function public.create_study_group(uuid) from public, anon;
revoke all on function public.join_study_group(uuid) from public, anon;
grant execute on function public.create_study_group(uuid) to authenticated;
grant execute on function public.join_study_group(uuid) to authenticated;

commit;
