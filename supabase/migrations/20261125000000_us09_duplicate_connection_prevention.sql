-- US-09: prevent duplicate pending connection requests for the same proposed
-- session (candidate goal + time window), while still allowing:
--   AC3 — a different session to the same candidate (different course/skill/
--         topic/assignment/exam, or a different proposed time window)
--   AC4 — the same proposed session sent to a different candidate
--   AC5 — a new request after a prior one to the same candidate for the same
--         session was declined or cancelled
--
-- The live schema only had a blanket UNIQUE (requester_id, receiver_id),
-- which allowed at most one connections row EVER between two users. That is
-- both too strict (blocks AC3 and AC5 outright) and not actually about
-- duplicate *sessions* at all. Replaced with goal references that capture
-- "session identity" plus a partial unique index scoped to pending requests.
begin;

alter table public.connections
  add column if not exists goal_id uuid references public.matching_goals(id) on delete set null,
  add column if not exists candidate_goal_id uuid references public.matching_goals(id) on delete set null;

-- Drop the old blanket unique constraint, whatever it happens to be named.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.connections'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%(requester_id, receiver_id)%';
  if v_conname is not null then
    execute format('alter table public.connections drop constraint %I', v_conname);
  end if;
end $$;

-- AC1/AC2: at most one PENDING request per (requester, candidate goal, time
-- window). Accepted/rejected/cancelled rows are excluded by the WHERE clause,
-- so a prior non-pending request never blocks a new one (AC5).
create unique index if not exists idx_connections_unique_pending_session
  on public.connections (requester_id, candidate_goal_id, proposed_start, proposed_end)
  where status = 'pending' and candidate_goal_id is not null;

create index if not exists idx_connections_candidate_goal
  on public.connections (candidate_goal_id);

create index if not exists idx_connections_goal
  on public.connections (goal_id);

commit;
