// index.ts — the Strava integration edge function. Deno, runs on Supabase.
//
// ONE URL, three jobs (Strava reuses the callback URL for all of them):
//   • GET  ?hub.mode=subscribe    -> webhook subscription validation (echo challenge)
//   • GET  ?code=...&state=<uid>  -> OAuth callback: store the athlete's tokens
//   • POST {object_type,...}      -> activity event: fetch it, map -> runs, tick
//                                    off the Morning Run on the checklist
//
// Why OAuth lives here: a Strava webhook only sends IDs, so we must call the
// Strava API with the athlete's access token to read the activity. Tokens are
// stored per-user (strava_accounts) and refreshed on demand.
//
// Function secrets (supabase secrets set ...):
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (injected automatically)
//
// Idempotency: the run id is derived from the Strava activity id, so a retried
// or duplicate webhook delivery is a harmless upsert — important because Strava
// retries any callback it doesn't get a fast 200 from.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { isRun, mapActivityToRun, type StravaActivity } from '../_shared/strava.ts'

// Supabase edge runtime: keep the worker alive to finish background work.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const JSON_HEADERS = { 'Content-Type': 'application/json' }
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function service() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

// Exchange code / refresh against Strava's OAuth token endpoint (form-encoded).
async function stravaToken(params: Record<string, string>) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('STRAVA_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET') ?? '',
      ...params,
    }),
  })
  if (!res.ok) throw new Error(`strava token endpoint ${res.status}`)
  return await res.json()
}

// deno-lint-ignore no-explicit-any
async function freshAccessToken(supabase: any, account: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (account.expires_at && account.expires_at - 60 > now) return account.access_token
  const t = await stravaToken({ grant_type: 'refresh_token', refresh_token: account.refresh_token })
  await supabase
    .from('strava_accounts')
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at })
    .eq('user_id', account.user_id)
  return t.access_token
}

// The real work for a 'create activity' event. Idempotent.
async function handleActivity(ownerId: number, activityId: number) {
  const supabase = service()
  const { data: account } = await supabase
    .from('strava_accounts')
    .select('*')
    .eq('athlete_id', ownerId)
    .maybeSingle()
  if (!account) return { ok: true, note: 'no linked account for owner' }

  const token = await freshAccessToken(supabase, account)
  const aRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!aRes.ok) throw new Error(`activity fetch ${aRes.status}`)
  const activity = (await aRes.json()) as StravaActivity
  if (!isRun(activity)) return { ok: true, ignored: 'not a run' }

  const run = mapActivityToRun(activity)
  const at = new Date().toISOString()

  // 1) Save the run — verified + source:'strava', idempotent on the derived id.
  const { error: runErr } = await supabase
    .from('runs')
    .upsert({ id: run.id, user_id: account.user_id, data: run, updated_at: at }, { onConflict: 'id' })
  if (runErr) throw new Error(`save run: ${runErr.message}`)

  // 2) Tick off the Morning Run for that day — MERGE so other items survive.
  const { data: crow } = await supabase
    .from('checklist')
    .select('data')
    .eq('user_id', account.user_id)
    .eq('k', run.date)
    .maybeSingle()
  const items = (crow?.data ?? {}) as Record<string, unknown>
  items.run = 'done'
  const { error: clErr } = await supabase
    .from('checklist')
    .upsert({ user_id: account.user_id, k: run.date, data: items, updated_at: at }, { onConflict: 'user_id,k' })
  if (clErr) throw new Error(`checklist: ${clErr.message}`)

  return { ok: true, run: run.id, miles: run.miles, verified: true, checkedOff: `run@${run.date}` }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)

  // 1) Webhook subscription validation.
  if (req.method === 'GET' && url.searchParams.get('hub.mode')) {
    if (url.searchParams.get('hub.verify_token') !== Deno.env.get('STRAVA_VERIFY_TOKEN')) {
      return json({ error: 'bad verify token' }, 403)
    }
    return json({ 'hub.challenge': url.searchParams.get('hub.challenge') })
  }

  // 2) OAuth callback — one-time account connect (state carries the user id).
  if (req.method === 'GET' && url.searchParams.get('code')) {
    const code = url.searchParams.get('code') as string
    const state = url.searchParams.get('state') ?? ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state)) {
      return json({ error: 'missing/invalid state (userId)' }, 400)
    }
    let t
    try {
      t = await stravaToken({ code, grant_type: 'authorization_code' })
    } catch (e) {
      return json({ error: 'oauth exchange failed', detail: String(e) }, 502)
    }
    const { error } = await service()
      .from('strava_accounts')
      .upsert(
        {
          user_id: state,
          athlete_id: t.athlete?.id,
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          expires_at: t.expires_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    if (error) return json({ error: 'could not store tokens', detail: error.message }, 500)
    return new Response('<h1>Strava connected ✅</h1><p>You can close this tab.</p>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // 3) Activity event. Ack FAST (Strava retries anything slower than ~2s), then
  // process in the background. Retries are safe — the upsert is idempotent.
  if (req.method === 'POST') {
    let evt: { object_type?: string; aspect_type?: string; owner_id?: number; object_id?: number }
    try {
      evt = await req.json()
    } catch {
      return json({ error: 'invalid JSON' }, 400)
    }
    if (evt.object_type !== 'activity' || evt.aspect_type !== 'create') {
      return json({ ok: true, ignored: true })
    }
    const work = handleActivity(Number(evt.owner_id), Number(evt.object_id))
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(work.catch((e) => console.error('[strava] background error:', e)))
      return json({ ok: true, queued: true })
    }
    try {
      return json(await work)
    } catch (e) {
      return json({ error: String(e) }, 500)
    }
  }

  return json({ error: 'unsupported' }, 405)
})
