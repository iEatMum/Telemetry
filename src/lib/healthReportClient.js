// healthReportClient.js — the AI health read (V3): today's full metric
// snapshot goes up, a short plain-language wellness read comes back.
//
// Same rails as counsel (P3a): consent gate, one fresh call per app-day
// (cached), every model string shame-screened, fail-soft null on any error —
// the panel simply keeps its raw numbers. NEVER medical advice: the server
// prompt forbids diagnosis and the UI prints the disclaimer permanently.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { aiConsentGranted } from './aiConsent.js'
import { appDayKey } from './dates.js'
import { screen } from './guardian.js'

const CACHE_KEY = 'lockedin:__health_report' // { day, report }

function screened(value) {
  if (typeof value === 'string') return screen(value).ok
  if (Array.isArray(value)) return value.every(screened)
  if (value && typeof value === 'object') return Object.values(value).every(screened)
  return true
}

// Only finite numbers ride up, capped in count — nothing free-text, nothing
// identifying. The metric NAMES are ours; the values are the user's readings.
function cleanMetrics(all) {
  const out = {}
  let n = 0
  for (const [k, v] of Object.entries(all || {})) {
    if (typeof v === 'number' && Number.isFinite(v) && n < 30) {
      out[k] = v
      n++
    }
  }
  return out
}

export async function getHealthReport(all) {
  if (!isSupabaseConfigured || !supabase) return null
  if (!aiConsentGranted()) return null
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && cached.day === appDayKey() && cached.report) return cached.report
  } catch {
    /* fresh */
  }
  const metrics = cleanMetrics(all)
  if (!Object.keys(metrics).length) return { text: 'No readings on the record yet today — connect Apple Health or log the morning check-in, then ask again.' }
  try {
    const { data, error } = await supabase.functions.invoke('health-report', { body: { metrics } })
    if (error || !data || data.error) return null
    if (!screened(data)) return null
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ day: appDayKey(), report: data }))
    } catch {
      /* quota */
    }
    return data
  } catch {
    return null
  }
}
