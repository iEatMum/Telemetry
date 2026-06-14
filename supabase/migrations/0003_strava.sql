-- 0003_strava.sql — Phase 3 / Sprint 5: per-user Strava OAuth tokens.
--
-- Holds the access/refresh tokens the Strava edge function uses to fetch
-- activities. SERVICE-ROLE ONLY: there is deliberately NO RLS policy, so a
-- regular client can never read these tokens (RLS is row-level, not column-
-- level, so a "read own" policy would leak the secrets). The edge function uses
-- the service-role key, which bypasses RLS. Run after 0001/0002.
--
-- (If the app later needs a "Strava connected" indicator, expose a view of just
--  user_id + athlete_id with security_invoker — never the token columns.)

create table if not exists public.strava_accounts (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  athlete_id    bigint unique,
  access_token  text,
  refresh_token text,
  expires_at    bigint,                       -- unix seconds (Strava's format)
  updated_at    timestamptz not null default now()
);

create index if not exists strava_accounts_athlete_idx on public.strava_accounts (athlete_id);

-- RLS on, but no policies => only the service role can touch this table.
alter table public.strava_accounts enable row level security;
