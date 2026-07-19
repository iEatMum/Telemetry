// counselClient.js — calls the server-side AI Counsel edge function.
//
// The client detects the drift PATTERN locally (counsel.js, over the witnessed
// checkpoints) and sends just that pattern up. The function synthesizes the
// Consider card with the model + persona and returns it. The ANTHROPIC key never
// touches the client — it lives only in the function's secrets.
//
// P3a rails, enforced HERE so no future surface can skip them:
//   · CONSENT — no consent.aiProcessing, no call. Ever.
//   · CACHE   — one synthesis per (pattern, app-day): the same drift seen twice
//     in a day returns the cached card instead of a second model spend.
//   · CAP     — hard ceiling of 2 fresh counsel calls per app-day.
//   · SCREEN  — every model-authored string passes guardian.screen() before the
//     UI sees it; a blocked card falls back to the local rule-based one.
//
// Fails soft: returns null on any error / when there's no backend, and the UI
// keeps showing the local rule-based card. The Guardian still speaks offline.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { aiConsentGranted } from './aiConsent.js'
import { appDayKey } from './dates.js'
import { screen } from './guardian.js'

const CACHE_KEY = 'lockedin:__counsel_cache' // { day, calls, byPattern: { pattern: card } }
const MAX_CALLS_PER_DAY = 2

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (c && c.day === appDayKey()) return c
  } catch {
    /* fresh */
  }
  return { day: appDayKey(), calls: 0, byPattern: {} }
}
function writeCache(c) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {
    /* quota — caps still hold in memory next read */
  }
}

// Every string the model authored must clear the shame screen. Recursive, so a
// future response shape can't smuggle an unscreened field past the rail.
function screened(value) {
  if (typeof value === 'string') return screen(value).ok
  if (Array.isArray(value)) return value.every(screened)
  if (value && typeof value === 'object') return Object.values(value).every(screened)
  return true
}

export async function invokeCounsel(pattern, { partnerName } = {}) {
  if (!isSupabaseConfigured || !supabase || !pattern) return null
  if (!aiConsentGranted()) return null

  const key = typeof pattern === 'string' ? pattern : pattern?.id || JSON.stringify(pattern)
  const cache = readCache()
  if (cache.byPattern[key]) return cache.byPattern[key]
  if (cache.calls >= MAX_CALLS_PER_DAY) return null

  try {
    const { data, error } = await supabase.functions.invoke('counsel', {
      body: { pattern, partnerName, mission: surveyMission() },
    })
    if (error || !data || data.error) return null
    if (!screened(data)) return null // model text failed the shame screen
    cache.calls += 1
    cache.byPattern[key] = data
    writeCache(cache)
    return data
  } catch {
    return null
  }
}

// The user's mission line (survey) rides along so the persona's THE GOAL YOU
// SERVE speaks their own words. Clamped here; screened server-side.
export function surveyMission() {
  try {
    const s = JSON.parse(localStorage.getItem('lockedin:__survey') || 'null')
    return String(s?.mission || '').slice(0, 140)
  } catch {
    return ''
  }
}

/** TESTER/DEV diagnostics only: one raw round-trip to the counsel function,
 *  skipping cache and caps (NOT the consent gate — that result is itself the
 *  diagnosis). Returns { ok, state, detail } for the Settings wire-test row. */
export async function testCoachWire() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, state: 'no-backend', detail: 'Supabase keys absent in this build' }
  if (!aiConsentGranted()) return { ok: false, state: 'consent-off', detail: 'AI consent is off (Settings → Connect Claude)' }
  try {
    const { data, error } = await supabase.functions.invoke('counsel', {
      body: { pattern: { key: 'general', summary: 'Wire test from device verification.' }, mission: surveyMission() },
    })
    if (error) return { ok: false, state: 'transport', detail: String(error.message || error).slice(0, 160) }
    if (data?.error) return { ok: false, state: 'function', detail: `${data.error} — ${data.detail || ''}`.slice(0, 200) }
    if (!screened(data)) return { ok: false, state: 'screened-out', detail: 'model text failed the shame screen' }
    return { ok: true, state: 'live', detail: (data.text || '').slice(0, 160) }
  } catch (e) {
    return { ok: false, state: 'transport', detail: String(e?.message || e).slice(0, 160) }
  }
}
