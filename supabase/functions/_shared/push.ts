// push.ts — Web Push sender (VAPID), shared by the edge functions.
//
// Uses the standard `web-push` library. The VAPID keypair lives in function
// secrets (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). If they aren't
// set, every send is a clean no-op — the Pulse stays dormant rather than erroring
// (same fail-soft rule as the rest of the backend).
//
// NOTE: `npm:web-push` runs in the Supabase Edge (Deno) runtime via Node compat.
// If a future runtime drops a Node API it needs, swap to `jsr:@negrel/webpush`
// (Web-Crypto-native) — same call shape, no other change required.

import webpush from 'npm:web-push@3.6.7'

let configured: boolean | null = null

function configureVapid(): boolean {
  if (configured !== null) return configured
  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:guardian@locked-in.app'
  if (!pub || !priv) {
    configured = false
    return false
  }
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

// deno-lint-ignore no-explicit-any
type Supabase = any

// Send one payload to every push subscription a user has. Prunes dead
// subscriptions (404/410 = the browser dropped it). Never throws — a failed push
// must not break the caller (the referee still logs its verdict).
export async function sendPushToUser(supabase: Supabase, userId: string, payload: unknown) {
  if (!configureVapid()) return { sent: false, reason: 'no-vapid' }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error) return { sent: false, reason: 'query-failed', error: error.message }
  if (!subs || subs.length === 0) return { sent: false, reason: 'no-subscriptions' }

  const body = JSON.stringify(payload)
  const results: Array<{ id: string; ok: boolean; code?: number }> = []

  for (const s of subs) {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
    try {
      await webpush.sendNotification(subscription, body)
      results.push({ id: s.id, ok: true })
    } catch (err) {
      // deno-lint-ignore no-explicit-any
      const code = (err as any)?.statusCode as number | undefined
      if (code === 404 || code === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id) // prune the dead one
      }
      results.push({ id: s.id, ok: false, code })
    }
  }
  return { sent: true, results }
}
