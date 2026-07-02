-- 0010_realtime.sql — opt the synced tables into Supabase Realtime.
--
-- The sync engine (src/lib/sync.js) is offline-first and only pulls on login /
-- `online` / a manual trigger, so a change made on one device doesn't reach the
-- others until they next cycle. Adding these tables to the `supabase_realtime`
-- publication lets Postgres stream row changes to subscribed clients, so a
-- client-side channel can call syncNow() the moment a sibling device writes.
-- RLS still applies to realtime, so a user only ever receives their OWN rows
-- (the same auth.uid() = user_id policies that guard SELECT / UPSERT).
--
-- The table list mirrors SLICES in src/lib/sync.js exactly.
--
-- DEPLOY-GATED: this only takes effect once a client subscribes. The sync engine
-- is intentionally left untouched in this pass — wiring the subscription is a
-- follow-up (a supabase.channel('sync').on('postgres_changes', …, syncNow)
-- alongside sync.start()). Safe to run now; it just enables the capability.
--
-- Idempotent: `alter publication … add table` errors if the table is already a
-- member, so each add is guarded against pg_publication_tables.

do $$
declare
  t text;
  synced text[] := array[
    'settings', 'streak_state', 'reading_state',
    'income', 'runs', 'tasks',
    'sprints', 'reviews', 'checklist', 'wellness'
  ];
begin
  foreach t in array synced loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
