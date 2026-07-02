// stakes.js — the CLIENT half of the Stakes Engine.
//
// SECURITY: the actual consequence (Twilio SMS / financial penalty) is NOT here.
// It lives in the `stakes` Supabase Edge Function, because Twilio/Stripe secrets
// must never ship in the client bundle. This file holds only (1) the PURE breach
// check and (2) a fail-soft invoker that asks the server to act. The server reads
// the authoritative stake_preference and owns the audit write (stakes_history).

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// PURE: did the day breach the high-impact stake? Accepts an engagement summary,
// a closeDay() performance payload, or a bare impact object — all expose `impact`.
// `required` = the day's high-impact target (impact.total, or done+missed+pending
// when total is absent); breached when fewer than required were completed.
export function checkStakes(completionStatus) {
  const impact = completionStatus?.impact ?? completionStatus ?? {}
  const done = Number(impact.done) || 0
  const required =
    Number(impact.total) || done + (Number(impact.missed) || 0) + (Number(impact.pending) || 0)
  const breached = required > 0 && done < required
  return { breached, required, completed: done, missed: Math.max(0, required - done) }
}

// CLIENT trigger (fail-soft). Computes the breach locally, then asks the SERVER
// `stakes` function to carry out the consequence. No-ops with no Supabase/session
// so the local-first deck is never blocked. The server decides the penalty level
// from the stored profile — the client never sends secrets or a penalty level.
export async function triggerStakesCheck(completionStatus, { goalType = 'high_impact' } = {}) {
  const verdict = checkStakes(completionStatus)
  if (!verdict.breached) return { ok: false, reason: 'no-breach', verdict }
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local', verdict }
  try {
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return { ok: false, reason: 'no-session', verdict }
    const { data: res, error } = await supabase.functions.invoke('stakes', {
      body: {
        goalType,
        required: verdict.required,
        completed: verdict.completed,
        day: completionStatus?.day,
      },
    })
    if (error) return { ok: false, reason: 'error', error }
    return { ok: true, ...(res || {}) }
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
}
