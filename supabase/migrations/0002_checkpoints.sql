-- 0002_checkpoints.sql — Phase 3 / Sprint 4: the Referee's verdict log.
--
-- Append-only and owner-READABLE, but ONLY the service role (the edge function)
-- can write. That's the whole point: the user can see verdicts but cannot
-- fabricate or alter them — evaluation is separated from intervention
-- (Gollwitzer 2006). Run this in the Supabase SQL editor after 0001.

create table if not exists public.checkpoints (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,                       -- 'wake' | 'bedtime' | ...
  target     text,                                -- 'HH:MM'
  actual     text,                                -- 'HH:MM' (local)
  at         timestamptz,                         -- the event instant
  verdict    text not null check (verdict in ('hit', 'late', 'missed')),
  detail     jsonb not null default '{}'::jsonb,  -- raw payload + notify result
  created_at timestamptz not null default now()
);

create index if not exists checkpoints_user_idx on public.checkpoints (user_id, created_at desc);

alter table public.checkpoints enable row level security;

-- Read-own only. There is deliberately NO insert/update/delete policy, so a
-- regular (anon/authenticated) client cannot write or alter verdicts. The edge
-- function uses the service-role key, which bypasses RLS.
drop policy if exists checkpoints_read_own on public.checkpoints;
create policy checkpoints_read_own on public.checkpoints
  for select using (auth.uid() = user_id);
