-- US-06 / US-16: enable partial exam-preparation discovery and account-level matching pause.
-- US-07 practice matching uses the existing category, normalized skill key, and weekly slots.
begin;

alter table public.profiles
  add column if not exists matching_paused boolean not null default false;

-- A paused student keeps goals and connection history, but their listed goals
-- are no longer discoverable for new searches or new connection requests.
drop policy if exists goals_read on public.matching_goals;
create policy goals_read on public.matching_goals for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    is_listed
    and archived_at is null
    and exists (
      select 1
      from public.profiles p
      where p.user_id = matching_goals.user_id
        and not p.matching_paused
        and p.is_discoverable
    )
  )
);

drop policy if exists slots_read on public.matching_availability;
create policy slots_read on public.matching_availability for select to authenticated
using (
  exists (
    select 1
    from public.matching_goals g
    where g.id = goal_id
      and (
        g.user_id = (select auth.uid())
        or (
          g.is_listed
          and g.archived_at is null
          and exists (
            select 1
            from public.profiles p
            where p.user_id = g.user_id
              and not p.matching_paused
              and p.is_discoverable
          )
        )
      )
  )
);

-- AC3: the normal goal policies intentionally hide paused profiles. This
-- narrow helper lets the connection endpoint distinguish an old result whose
-- owner is paused from a random, archived, private, or invalid goal ID without
-- exposing profile data.
create or replace function public.matching_goal_is_paused(candidate_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.matching_paused
      from public.matching_goals g
      join public.profiles p on p.user_id = g.user_id
      where g.id = candidate_goal_id
        and g.archived_at is null
      limit 1
    ),
    false
  );
$$;

revoke all on function public.matching_goal_is_paused(uuid) from public, anon;
grant execute on function public.matching_goal_is_paused(uuid) to authenticated;

commit;
