-- US-08: extend connections with session proposal fields.
-- Adds session_topic, proposed_start, proposed_end so a connection request
-- can carry a concrete study-session proposal at creation time.
-- The API layer enforces these as required; the DB makes them nullable so the
-- schema stays backwards-compatible if other flows later create bare connections.
begin;

alter table public.connections
  add column if not exists session_topic text
    check (char_length(session_topic) <= 200),
  add column if not exists proposed_start timestamptz,
  add column if not exists proposed_end   timestamptz;

-- Guard: proposed_end must be strictly after proposed_start when both are set.
do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conname    = 'connections_proposed_end_after_start'
       and conrelid   = 'public.connections'::regclass
  ) then
    alter table public.connections
      add constraint connections_proposed_end_after_start
      check (
        proposed_start is null
        or proposed_end is null
        or proposed_end > proposed_start
      );
  end if;
end $$;

commit;
