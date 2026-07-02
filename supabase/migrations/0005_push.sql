-- 0005_push.sql — Phase 4 / the Guardian's Pulse: where this device's Web Push
-- subscription lives so the Referee can reach the phone when it sees a drift.
--
-- Owner-managed (the client subscribes and writes its own row); the service role
-- (the referee edge function) reads them to send. `user_id` defaults to auth.uid()
-- so the client never has to pass it. Run after 0004.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null,                       -- the push service URL (per device)
  p256dh     text not null,                       -- the subscription's public key
  auth       text not null,                       -- the subscription's auth secret
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- One row per device PER USER (not a global unique on endpoint — that would make
-- a re-subscribe collide with a row owned by a different account). The client
-- upserts on (user_id, endpoint).
create unique index if not exists push_subscriptions_user_endpoint_uniq
  on public.push_subscriptions (user_id, endpoint);

-- Keep updated_at server-authoritative on re-subscribe (default now() fires on
-- INSERT only), so it isn't trusted from a possibly-skewed client clock.
create or replace function public.touch_push_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch
  before update on public.push_subscriptions
  for each row execute function public.touch_push_updated_at();

alter table public.push_subscriptions enable row level security;

-- Own rows only. The edge function uses the service-role key (bypasses RLS) to
-- read every subscription it must push to.
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete using (auth.uid() = user_id);
