begin;

create table public.favorite_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  favorite_user_id uuid not null
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_partners_unique unique (user_id, favorite_user_id),
  constraint favorite_partners_no_self check (user_id <> favorite_user_id)
);

create index favorite_partners_owner
  on public.favorite_partners(user_id, created_at desc);

alter table public.favorite_partners enable row level security;

revoke all on public.favorite_partners from anon;
grant select, insert, delete on public.favorite_partners to authenticated;

create policy favorite_partners_read
  on public.favorite_partners for select to authenticated
  using (user_id = (select auth.uid()));

create policy favorite_partners_insert
  on public.favorite_partners for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy favorite_partners_delete
  on public.favorite_partners for delete to authenticated
  using (user_id = (select auth.uid()));

commit;
