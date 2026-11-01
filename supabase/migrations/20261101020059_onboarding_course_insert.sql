-- Onboarding creates shared catalog entries but must never overwrite existing ones.
begin;
alter table public.courses enable row level security;
grant select,insert on public.courses to authenticated;
create policy courses_insert_authenticated on public.courses
for insert to authenticated with check (
  (select auth.uid()) is not null
  and name is not null and length(btrim(name)) between 1 and 200
  and code is not null and length(btrim(code)) between 1 and 100
  and university is not null and length(btrim(university)) between 1 and 200
);
commit;
