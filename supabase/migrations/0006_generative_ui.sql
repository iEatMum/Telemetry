-- 0006_generative_ui.sql
-- LOCKED IN — Phase 3 (Generative UI): the survey/research profile + the
-- AI-generated Server-Driven UI payloads + a cost/audit log.
-- Run AFTER 0001 (this reuses public.lww_guard from that migration). Idempotent
-- (IF NOT EXISTS / drop-then-create) — safe to re-run.
--
-- ACCESS MODEL (note how it differs from the sync tables in 0001)
--   • user_profile — owner read+write. The client writes `survey` (consented
--     onboarding answers); the `architect` edge function writes `research`
--     (chronotype, recommended wake, focus areas, module flags) under the service
--     role. Reuses the Last-Write-Wins guard. NOT in sync.js's SLICES — the
--     generic two-way engine never touches it (like handover/checkpoints).
--   • ui_layouts — the generated payloads. WRITTEN ONLY by the edge function
--     (service role); the client gets SELECT on its own rows and NOTHING else
--     (no insert/update/delete policy), exactly like checkpoints/strava_accounts.
--     A payload is data the client renders, never data it authors.
--   • ai_runs — internal bookkeeping. Service-role only (RLS on, NO policy → it
--     never reaches the client) so we can enforce "generate once" + track spend.

-- 1) Tables ----------------------------------------------------------------

-- One row per user. survey = client-written; research = AI-written.
create table if not exists public.user_profile (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  survey          jsonb not null default '{}'::jsonb,
  research        jsonb not null default '{}'::jsonb,
  profile_version integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- Versioned SDUI payloads. History is kept; is_active flags the one to render.
create table if not exists public.ui_layouts (
  id              text primary key,            -- edge-function-generated id
  user_id         uuid not null references auth.users(id) on delete cascade,
  payload         jsonb not null,              -- the node-tree (see uiSchema.js)
  schema_version  integer not null default 1,
  profile_version integer not null default 0,  -- which profile it was built from
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Cost/audit log for AI generation runs.
create table if not exists public.ai_runs (
  id            text primary key,
  user_id       uuid references auth.users(id) on delete cascade,
  purpose       text,                          -- e.g. 'architect', 'replan'
  model         text,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);

-- 2) Indexes ---------------------------------------------------------------
create index if not exists ui_layouts_user_idx on public.ui_layouts (user_id);
-- At most ONE active layout per user — the client's read assumes a single row.
create unique index if not exists ui_layouts_one_active
  on public.ui_layouts (user_id)
  where is_active;
create index if not exists ai_runs_user_idx on public.ai_runs (user_id);

-- 3) RLS + triggers --------------------------------------------------------

-- user_profile: owner can read + write own row; LWW guard (shared with 0001).
alter table public.user_profile enable row level security;
drop policy if exists user_profile_owner on public.user_profile;
create policy user_profile_owner on public.user_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists user_profile_lww on public.user_profile;
create trigger user_profile_lww
  before insert or update on public.user_profile
  for each row execute function public.lww_guard();

-- ui_layouts: client reads its OWN rows; writes are the service role's alone
-- (no insert/update/delete policy is intentional).
alter table public.ui_layouts enable row level security;
drop policy if exists ui_layouts_read_own on public.ui_layouts;
create policy ui_layouts_read_own on public.ui_layouts
  for select using (auth.uid() = user_id);

-- ai_runs: service-role only — RLS on with NO policy, so the client can't read
-- or write it at all.
alter table public.ai_runs enable row level security;
