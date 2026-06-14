// index.ts — the Referee edge function. Deno, runs on Supabase.
//
// Apple Shortcuts automations (alarm-stop, NFC tap, geofence, time-of-day) POST
// telemetry here. The function:
//   1. authenticates the call with a SHARED SECRET (Shortcuts can't do user-JWT
//      auth — this is the "authenticated bypass"),
//   2. adjudicates Actual-vs-Target using the SERVICE ROLE, so the verdict is
//      beyond the user's reach — unalterable accountability (Gollwitzer 2006),
//   3. logs a row in `checkpoints` (append-only; only the service role writes),
//   4. on a negative verdict, fires an SMS to the accountability partners via
//      Twilio — stubbed (just logged) until the Twilio secrets are set.
//
// Function secrets (supabase secrets set KEY=value):
//   SHORTCUTS_WEBHOOK_SECRET   the secret the Shortcut sends as x-webhook-secret
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (injected automatically)
// Optional — enables real SMS (otherwise the send is stubbed + logged):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//
// Trust model: the shared secret is single-tenant — anyone holding it can write
// a checkpoint for the `userId` they pass. Fine for one user (only Ian has the
// secret + the Shortcut). For multi-user, swap to per-user tokens.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { adjudicate, partnerMessage, type Telemetry } from '../_shared/adjudicate.ts'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// Constant-time compare so the secret check can't be timing-probed.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

interface Partner {
  name?: string
  phone?: string
}

async function notifyPartners(partners: Partner[], message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  const recipients = partners.map((p) => p.phone).filter((p): p is string => !!p)

  if (!sid || !token || !from) {
    // STUB: Twilio not wired up yet. Don't fail the request — just record intent.
    console.log('[referee] (stub) would SMS', recipients, ':', message)
    return { sent: false, stubbed: true, recipients, message }
  }

  const results: Array<{ to: string; ok: boolean; status: number }> = []
  for (const to of recipients) {
    const form = new URLSearchParams({ To: to, From: from, Body: message })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })
    results.push({ to, ok: res.ok, status: res.status })
  }
  return { sent: true, results, message }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // 1) Authenticate the webhook (shared secret; header or Bearer).
  const secret = Deno.env.get('SHORTCUTS_WEBHOOK_SECRET')
  const provided =
    req.headers.get('x-webhook-secret') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!secret || !provided || !timingSafeEqual(provided, secret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  // 2) Parse + validate.
  let payload: Telemetry
  try {
    payload = (await req.json()) as Telemetry
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  const userId = String(payload.userId ?? '')
  if (!UUID_RE.test(userId)) return json({ error: 'missing/invalid userId' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // 3) Read the user's targets (settings.data holds wakeTime/bedTime/partners/name).
  const { data: srow } = await supabase.from('settings').select('data').eq('user_id', userId).maybeSingle()
  const settings = (srow?.data ?? {}) as Record<string, unknown>

  // 4) Adjudicate.
  const adj = adjudicate(payload, settings)
  if (!adj.ok) return json({ error: adj.error }, 422)

  // 5) On a negative verdict, alert the partners (Twilio, or stub).
  let notify: unknown = null
  if (adj.verdict !== 'hit') {
    const partners = (Array.isArray(settings.partners) ? settings.partners : []) as Partner[]
    notify = await notifyPartners(partners, partnerMessage(String(settings.name ?? ''), adj))
  }

  // 6) Log the verdict. Append-only; only the service role can write here.
  const { error: insErr } = await supabase.from('checkpoints').insert({
    user_id: userId,
    kind: adj.kind,
    target: adj.target,
    actual: adj.actual,
    at: payload.at ?? new Date().toISOString(),
    verdict: adj.verdict,
    detail: { payload, delta_min: adj.deltaMin, notify },
  })
  if (insErr) return json({ error: 'could not log checkpoint', detail: insErr.message }, 500)

  return json({
    ok: true,
    kind: adj.kind,
    verdict: adj.verdict,
    target: adj.target,
    actual: adj.actual,
    notified: notify != null,
  })
})
