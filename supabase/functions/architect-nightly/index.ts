// index.ts — the nightly Architect orchestrator (P4.2).
//
// Runs once a night (pg_cron → pg_net → here; see 0011_architect_nightly.sql) and
// fans the re-composition out across users. For each eligible user it calls the
// architect function server-to-server (x-cron-secret), which recomputes tomorrow's
// ui_layouts.payload from their profile + recent engagement/health signals — the
// same refactor the client fires at "Finish day", but automatic and for everyone,
// including the users who never tapped it.
//
// AUTH: this function is itself gated by CRON_SECRET, so only the cron job can
// trigger a fan-out. It reads eligibility with the service role, and forwards to
// architect BOTH the service-role JWT (to satisfy the gateway's verify_jwt) and
// the cron secret (architect's app-level server-to-server trust).
//
// SAFETY: best-effort per user — one user's failure never aborts the batch. The
// batch is capped, and only CONSENTED users with an existing active layout are
// refreshed (a brand-new user gets their FIRST layout at onboarding, not here).
// A non-consented user still gets a deterministic refactor: nothing is sent to
// Anthropic — the consent check lives inside architect and is re-run per user.

import { createClient } from 'npm:@supabase/supabase-js@2'

const BATCH_CAP = 500 // safety rail; raise once the base outgrows it

Deno.serve(async (req: Request) => {
  // Only the cron job (holding the shared secret) may trigger a fan-out.
  const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
  const presented = req.headers.get('x-cron-secret') || ''
  if (!CRON_SECRET || presented !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Eligible = has an ACTIVE layout, so this is a re-composition rather than a
  // first build. Consent is re-checked inside architect per user.
  const { data: rows, error } = await admin
    .from('ui_layouts')
    .select('user_id')
    .eq('is_active', true)
    .limit(BATCH_CAP)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))]
  const endpoint = `${SUPABASE_URL}/functions/v1/architect`

  let refreshed = 0
  let failed = 0
  for (const user_id of userIds) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`, // satisfies the gateway verify_jwt
          'x-cron-secret': CRON_SECRET, // architect's server-to-server trust
        },
        body: JSON.stringify({ user_id, regenerate: true }),
      })
      if (res.ok) refreshed++
      else failed++
    } catch {
      failed++
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: userIds.length, refreshed, failed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
