-- 0011_architect_nightly.sql — schedule the nightly AI re-composition (P4.2).
--
-- Every night this invokes the `architect-nightly` edge function, which fans the
-- refactor out across users: each user's ui_layouts.payload is recomputed from
-- their profile + recent engagement/health signals, so tomorrow's deck is ready
-- before they open the app. Per-user, architect gracefully falls back to the
-- deterministic layout (and, offline, the client keeps its local deck), so a
-- failed night never leaves anyone without a workspace.
--
-- DEPLOY-GATED — this migration only does something once all of the following hold
-- (until then it is a safe no-op that just schedules a job hitting a 404/secretless
-- endpoint, which architect-nightly rejects):
--   1. `architect-nightly` and `architect` are deployed, and architect accepts the
--      x-cron-secret server-to-server path (see functions/architect/index.ts).
--   2. Three secrets exist in Vault (Dashboard → Project Settings → Vault) so we
--      never hardcode them in SQL:
--        • project_url        e.g. https://<ref>.supabase.co
--        • service_role_key   the project's service role key
--        • cron_secret        a long random string; set the SAME value as the
--                             CRON_SECRET function secret on BOTH architect and
--                             architect-nightly (supabase secrets set CRON_SECRET=…).
--   3. pg_cron + pg_net are available (Supabase enables them below).
--
-- Idempotent: extensions use IF NOT EXISTS; the job is unscheduled before it is
-- (re)scheduled, so re-running never stacks duplicate jobs.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Drop any prior copy of the job so this migration is safe to re-run.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'architect-nightly') then
    perform cron.unschedule('architect-nightly');
  end if;
end $$;

-- 08:00 UTC nightly — before the typical wake window across US timezones, so the
-- fresh deck is waiting. Adjust the cron expression to your users' geography.
select cron.schedule(
  'architect-nightly',
  '0 8 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/architect-nightly',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
