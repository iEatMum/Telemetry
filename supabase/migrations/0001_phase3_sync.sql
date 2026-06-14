-- 0001_phase3_sync.sql
-- LOCKED IN — Phase 3 / Sprint 3: the tables the offline-first sync engine
-- (src/lib/sync.js) reads and writes. Run this once in the Supabase SQL editor.
--
-- NOTE (2026-06-13): probing this project with the publishable key found none
-- of these tables (every REST request 404'd), so the "SP1 schema" wasn't
-- actually live here. This migration creates exactly what sync.js targets, and
-- is safe to re-run (everything is IF NOT EXISTS / idempotent).
--
-- DESIGN
--   • Thin relational keys + a jsonb `data` payload + a client-stamped
--     `updated_at`. The app's real shapes live inside `data`, so the client can
--     evolve its model with no further migrations.
--   • Last-Write-Wins: the client sends its own `updated_at`; the lww_guard
--     trigger refuses any UPDATE that is OLDER than the stored row, so the most
--     recent write "permanently supersedes". RLS keeps every row owner-only
--     (auth.uid() = user_id).

-- 1) LWW guard -------------------------------------------------------------
create or replace function public.lww_guard()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at is null then
    new.updated_at := now();
  end if;
  if tg_op = 'UPDATE'
     and old.updated_at is not null
     and new.updated_at < old.updated_at then
    return old; -- incoming write is stale; keep the newer stored row
  end if;
  return new;
end;
$$;

-- 2) Tables ----------------------------------------------------------------
-- singletons (one row per user)
create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.streak_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.reading_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- collections (one row per client-generated base-36 / uuid id)
create table if not exists public.income (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.runs (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- composite (one row per user + day/week key)
create table if not exists public.sprints (
  user_id    uuid not null references auth.users(id) on delete cascade,
  k          text not null,            -- 'YYYY-MM-DD'
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);
create table if not exists public.reviews (
  user_id    uuid not null references auth.users(id) on delete cascade,
  k          text not null,            -- weekOf 'YYYY-MM-DD'
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);
create table if not exists public.checklist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  k          text not null,            -- app-day 'YYYY-MM-DD'
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);

-- 3) Indexes for the per-user collection pulls -----------------------------
create index if not exists income_user_idx on public.income (user_id);
create index if not exists runs_user_idx on public.runs (user_id);
create index if not exists tasks_user_idx on public.tasks (user_id);

-- 4) RLS (owner-only) + LWW trigger on every table -------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'streak_state', 'reading_state',
    'income', 'runs', 'tasks',
    'sprints', 'reviews', 'checklist'
  ]
  loop
    execute format('alter table public.%1$I enable row level security;', t);
    execute format('drop policy if exists %1$s_owner on public.%1$I;', t);
    execute format(
      'create policy %1$s_owner on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
    execute format('drop trigger if exists %1$s_lww on public.%1$I;', t);
    execute format(
      'create trigger %1$s_lww before insert or update on public.%1$I for each row execute function public.lww_guard();',
      t
    );
  end loop;
end $$;
