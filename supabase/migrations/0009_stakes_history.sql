-- LOCKED IN — Phase 5 (Stakes Engine): an UNALTERABLE audit trail of every
-- consequence the `stakes` edge function fires (SMS sent / financial pledge
-- recorded). Mirrors `checkpoints` (0002): owner can READ own rows but there is
-- NO write policy → only the service-role edge function writes. The user can
-- never edit or delete their own consequence log (Gollwitzer: stakes must bind).

create table if not exists public.stakes_history (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           text not null,                 -- app-day key the breach belongs to
  goal_type     text not null,                 -- e.g. 'high_impact'
  penalty_level text check (penalty_level in ('social', 'financial', 'friction', 'none')),
  required      integer not null default 0,    -- high-impact blocks expected
  completed     integer not null default 0,    -- high-impact blocks actually done
  status        text not null,                 -- sent | stubbed | recorded | failed | noop
  detail        jsonb not null default '{}'::jsonb, -- recipients / amount owed / error
  created_at    timestamptz not null default now()
);

-- One consequence per (user, day, goal) — the edge function checks this before
-- acting so a retried/duplicate call can never double-text or double-charge.
create unique index if not exists stakes_history_user_day_goal
  on public.stakes_history (user_id, day, goal_type);
create index if not exists stakes_history_user_idx on public.stakes_history (user_id);

alter table public.stakes_history enable row level security;
drop policy if exists stakes_history_owner_read on public.stakes_history;
create policy stakes_history_owner_read on public.stakes_history
  for select using (auth.uid() = user_id);
-- (no insert/update/delete policy → service-role writes only)
