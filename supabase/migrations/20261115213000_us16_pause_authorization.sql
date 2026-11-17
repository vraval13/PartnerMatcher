-- US-16 review hardening: only reveal a paused state for a candidate that was
-- eligible for one of the caller's own search goals. All private, archived,
-- undiscoverable, unrelated, random, and invalid goals return false.
begin;

drop function if exists public.matching_goal_is_paused(uuid);

create or replace function public.matching_goal_is_paused(
  search_goal_id uuid,
  candidate_goal_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.matching_paused
      from public.matching_goals q
      join public.matching_goals g on g.id = candidate_goal_id
      join public.profiles p on p.user_id = g.user_id
      where q.id = search_goal_id
        and q.user_id = (select auth.uid())
        and q.archived_at is null
        and g.user_id <> q.user_id
        and g.is_listed
        and g.archived_at is null
        and p.is_discoverable
        and (
          (
            q.information_version = 2
            and q.category in ('exam_prep', 'skill_practice')
            and g.information_version = 2
            and g.category = q.category
            and g.subject_or_skill_key = q.subject_or_skill_key
            and (q.category <> 'exam_prep' or g.exam_date = q.exam_date)
          )
          or (
            q.mode in ('course', 'assignment')
            and g.mode = q.mode
            and g.institution_key = q.institution_key
            and g.course_key = q.course_key
            and (
              (q.mode = 'assignment' and g.assignment_id = q.assignment_id)
              or (q.mode = 'course' and g.topic_key = q.topic_key)
            )
          )
        )
      limit 1
    ),
    false
  );
$$;

revoke all on function public.matching_goal_is_paused(uuid, uuid) from public, anon;
grant execute on function public.matching_goal_is_paused(uuid, uuid) to authenticated;

commit;
