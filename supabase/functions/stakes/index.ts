// stakes/index.ts — the SERVER half of the Stakes Engine (Deno edge function).
//
// Invoked by the authenticated client at end-of-day (see src/lib/stakes.js →
// triggerStakesCheck) when a high-impact stake is breached. It reads the user's
// AUTHORITATIVE stake_preference/stake_target, carries out the consequence, and
// writes ONE unalterable row to stakes_history. All secrets live here, never in
// the client.
//
// Secrets / env (SUPABASE_* injected automatically):
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY  injected
//   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM          enables real SMS
//     (otherwise the social send is STUBBED + logged — matches referee)
//   STRIPE_SECRET_KEY  RESERVED — the financial path is RECORD-ONLY here (no live
//     charge); a deliberate downstream billing step processes pledges later.
//
// Deploy: supabase functions deploy stakes ; run migration 0009.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

const STAKE_MESSAGE = 'LOCKED IN: You missed a high-impact block. The stakes are rising.'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Twilio REST send (mirrors referee.notifyPartners). Stubs + logs when unset so a
// missing secret never fails the consequence — it's still recorded as 'stubbed'.
async function sendSms(recipients: string[], message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  const to = recipients.filter((r) => !!r)
  if (!sid || !token || !from || !to.length) {
    console.log('[stakes] (stub) would SMS', to, ':', message)
    return { sent: false, stubbed: true, recipients: to }
  }
  const results: Array<{ to: string; ok: boolean; status?: number; error?: string }> = []
  for (const num of to) {
    const form = new URLSearchParams({ To: num, From: from, Body: message })
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${sid}:${token}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      })
      results.push({ to: num, ok: res.ok, status: res.status })
    } catch (err) {
      results.push({ to: num, ok: false, error: (err as Error)?.message })
    }
  }
  return { sent: true, recipients: to, results }
}

// The consequence, by penalty level. Returns { status, detail } for the audit row.
async function triggerConsequence(
  goalType: string,
  penaltyLevel: string,
  ctx: { recipients: string[]; amount: number | null },
) {
  if (penaltyLevel === 'social') {
    const r = await sendSms(ctx.recipients, STAKE_MESSAGE)
    return { status: r.stubbed ? 'stubbed' : 'sent', detail: { goalType, message: STAKE_MESSAGE, ...r } }
  }
  if (penaltyLevel === 'financial') {
    // RECORD-ONLY (product decision). No live Stripe charge — log the amount owed
    // so the pledge is auditable and chargeable by a later, deliberate billing job.
    return {
      status: 'recorded',
      detail: { goalType, kind: 'financial_pledge', amountOwed: ctx.amount, currency: 'usd', charged: false },
    }
  }
  if (penaltyLevel === 'friction') {
    return { status: 'recorded', detail: { goalType, kind: 'friction', note: 'cooldown enforced client-side' } }
  }
  return { status: 'noop', detail: { goalType, penaltyLevel } }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1) Authenticate the caller's JWT → user_id (writes are scoped to this user).
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader) return json({ error: 'missing Authorization' }, 401)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)
  const userId = user.id

  // 2) Parse the breach report.
  let body: { goalType?: string; required?: number; completed?: number; day?: string } = {}
  try {
    body = req.method === 'POST' ? await req.json() : {}
  } catch {
    body = {}
  }
  const goalType = String(body.goalType || 'high_impact').slice(0, 40)
  const required = Number.isFinite(body.required) ? Math.max(0, Math.trunc(body.required as number)) : 0
  const completed = Number.isFinite(body.completed) ? Math.max(0, Math.trunc(body.completed as number)) : 0
  const day = (typeof body.day === 'string' && body.day) || new Date().toISOString().slice(0, 10)

  // Server-side breach guard — never act on a non-breach, even if the client asks.
  if (!(required > 0 && completed < required)) {
    return json({ ok: false, reason: 'no-breach', required, completed })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // 3) Idempotency: one consequence per (user, day, goal). Check BEFORE acting so
  //    a duplicate/retried call can never double-text or double-record.
  const { data: existing } = await admin
    .from('stakes_history')
    .select('id, status')
    .eq('user_id', userId)
    .eq('day', day)
    .eq('goal_type', goalType)
    .maybeSingle()
  if (existing) return json({ ok: true, reused: true, status: existing.status })

  // 4) Read the AUTHORITATIVE penalty level + target from the profile, and any
  //    accountability contacts (stake_target.contact, plus settings.partners).
  const { data: profile } = await admin
    .from('user_profile')
    .select('stake_preference, stake_target')
    .eq('user_id', userId)
    .maybeSingle()
  const penaltyLevel = String(profile?.stake_preference || 'none')
  const target = isObj(profile?.stake_target) ? (profile!.stake_target as Record<string, unknown>) : {}
  const amount = Number.isFinite(Number(target.amount)) ? Number(target.amount) : null

  const recipients: string[] = []
  if (typeof target.contact === 'string' && target.contact.trim()) recipients.push(target.contact.trim())
  const { data: srow } = await admin.from('settings').select('data').eq('user_id', userId).maybeSingle()
  const settings = (srow?.data ?? {}) as Record<string, unknown>
  if (Array.isArray(settings.partners)) {
    for (const p of settings.partners as Array<{ phone?: string }>) {
      if (p?.phone) recipients.push(p.phone)
    }
  }

  // 5) Act, then write the unalterable audit row.
  const consequence = await triggerConsequence(goalType, penaltyLevel, {
    recipients: [...new Set(recipients)],
    amount,
  })

  const id = 'stk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  const { error: insErr } = await admin.from('stakes_history').insert({
    id,
    user_id: userId,
    day,
    goal_type: goalType,
    penalty_level: penaltyLevel,
    required,
    completed,
    status: consequence.status,
    detail: consequence.detail,
  })
  if (insErr) return json({ error: 'audit write failed', detail: insErr.message }, 500)

  return json({ ok: true, status: consequence.status, penaltyLevel, day })
})
