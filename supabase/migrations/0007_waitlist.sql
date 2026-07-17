-- 0007_waitlist.sql
-- LOCKED IN — marketing waitlist + referral rank. MARKETING surface only (not the
-- app's witness data). Anonymous can JOIN (insert) but cannot read others' rows.
-- NOT deployed yet — run in the Supabase SQL editor when launching the waitlist.

create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  referral_code text unique not null,
  referred_by   text references public.waitlist(referral_code),
  created_at    timestamptz not null default now()
);

-- RLS: allow anonymous INSERT only (no read of others' rows).
alter table public.waitlist enable row level security;

drop policy if exists "anon can join" on public.waitlist;
create policy "anon can join" on public.waitlist
  for insert to anon with check (true);

-- Rank = signup order, minus 100 spots per confirmed referral (floored at 1).
-- security_invoker is LOAD-BEARING (2026-07-17 security tournament + live fix):
-- a default (definer) view runs with the owner's privileges and BYPASSES the
-- table's RLS — the anon key could dump every signup email through it. With
-- invoker rights the caller's RLS applies (INSERT-only ⇒ anon reads nothing).
-- The client never reads this view; expose rank later via a SECURITY DEFINER
-- RPC that takes a referral_code and returns ONLY an integer.
create or replace view public.waitlist_rank
with (security_invoker = true) as
select w.id, w.email, w.referral_code,
  greatest(1,
    (select count(*) from public.waitlist x where x.created_at <= w.created_at)
    - 100 * (select count(*) from public.waitlist r where r.referred_by = w.referral_code)
  ) as rank
from public.waitlist w;

-- NOTE: the table has INSERT-only RLS, so the client can't read `rank` back after
-- joining. To show a real position, add a SELECT policy scoped to the row's own
-- referral_code, or expose rank via a SECURITY DEFINER RPC. Until then the page
-- shows an approximate position.
