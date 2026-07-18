// architectClient.js — talk to the Architect edge function (fail-soft).
//
// Mirrors counselClient.js: it only ever does something when Supabase is
// configured AND there's a signed-in session; otherwise it no-ops so the
// local-first deck (buildLiveLayout) stays fully in charge. Nothing here is
// required for the app to run — it's the upgrade path to AI-authored layouts.
//
// The function itself is NOT deployed yet (see BACKEND.md); until it is, every
// call returns { ok:false } and the client carries on with the local deck.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { aiConsentGranted } from './aiConsent.js'
import { screen } from './guardian.js'

// Any string the model authored anywhere in the layout must clear the shame
// screen — a briefing "read" is model text just as much as an InsightCard.
function screened(value) {
  if (typeof value === 'string') return screen(value).ok
  if (Array.isArray(value)) return value.every(screened)
  if (value && typeof value === 'object') return Object.values(value).every(screened)
  return true
}

async function invokeArchitect(body) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local' }
  // P3a rail: consent is checked CLIENT-side too — the server enforcing it is
  // necessary, but no request should even leave the device without the word.
  if (!aiConsentGranted()) return { ok: false, reason: 'no-consent' }
  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data?.session || null
  } catch {
    return { ok: false, reason: 'no-session' }
  }
  if (!session) return { ok: false, reason: 'no-session' }

  try {
    const { data, error } = await supabase.functions.invoke('architect', { body })
    if (error) return { ok: false, reason: 'error', error }
    if (!screened(data)) return { ok: false, reason: 'blocked' } // failed the shame screen
    return { ok: true, ...(data || {}) }
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
}

// First-run, survey-driven build (the consent gate lives in the function).
// Pass { regenerate: true } to force a fresh design + spend.
export function buildInitialLayout({ regenerate = false } = {}) {
  return invokeArchitect({ regenerate })
}

// Refactor tomorrow's deck from yesterday's engagement (the closeDay payload).
export function requestRefactor(performance) {
  return invokeArchitect({ performance })
}
