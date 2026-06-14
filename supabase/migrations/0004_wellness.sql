-- 0004_wellness.sql — Phase 3: the morning readiness check-in.
-- One row per user + app-day, same thin-key + jsonb + LWW shape as the other
-- composite tables in 0001. Reuses public.lww_guard(). Run after 0001.
-- (The app works locally without this; sync is additive and fail-soft.)

create table if not exists public.wellness (
  user_id    uuid not null references auth.users(id) on delete cascade,
  k          text not null,                       -- app-day 'YYYY-MM-DD'
  data       jsonb not null default '{}'::jsonb,  -- { sleep, legs, mind, rhr, at }
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);

alter table public.wellness enable row level security;

drop policy if exists wellness_owner on public.wellness;
create policy wellness_owner on public.wellness
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists wellness_lww on public.wellness;
create trigger wellness_lww before insert or update on public.wellness
  for each row execute function public.lww_guard();
