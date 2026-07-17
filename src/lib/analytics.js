// analytics.js — the private tally (CONSTITUTION M3).
//
// Privacy-respecting by construction: COUNTS ONLY, ON-DEVICE ONLY. No third-party
// SDK, no network, no identifiers, no content — ever. This keeps the App Store
// privacy label at "Data Not Collected" (legal/APP-PRIVACY-LABELS.md) while still
// answering the three questions the funnel needs:
//   1. Where does onboarding leak?   → per-node completion counts
//   2. Do people come back?          → day-1 / day-7 return, computed locally
//   3. Does the paywall convert?     → view → trial → subscribe counters
//
// The tally lives in the sidecar `lockedin:__metrics` — beside the book, not in
// it (excluded from sync SLICES and exportAll, like the engagement telemetry).
// If a remote pipeline ever ships, it must be a NEW opt-in surface + a privacy
// label re-answer first; this module must never grow a network call quietly.

import { appDayKey } from './dates.js'

const KEY = 'lockedin:__metrics'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object'
      ? { firstOpenAt: null, days: {}, events: {}, ...v }
      : { firstOpenAt: null, days: {}, events: {} }
  } catch {
    return { firstOpenAt: null, days: {}, events: {} }
  }
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* quota — counts are best-effort by design */
  }
}

/** Count one occurrence of a named event (e.g. 'paywall_view', 'trial_start'). */
export function track(name) {
  if (!name || typeof name !== 'string') return
  const s = read()
  s.events[name] = (s.events[name] || 0) + 1
  write(s)
}

/** Stamp today as an open day (idempotent per day — counts opens too). */
export function trackDailyOpen(day = appDayKey()) {
  const s = read()
  if (!s.firstOpenAt) s.firstOpenAt = new Date().toISOString()
  const d = s.days[day] || { opens: 0 }
  d.opens += 1
  s.days[day] = d
  write(s)
}

/**
 * Local retention read: did the user come back on day 1 / within day 7 of first
 * open? `null` while the window hasn't elapsed yet (unknowable ≠ churned).
 */
export function retention(now = new Date()) {
  const s = read()
  if (!s.firstOpenAt) return { d1: null, d7: null }
  const first = new Date(s.firstOpenAt)
  const dayMs = 86_400_000
  const openDays = Object.keys(s.days)
  const returnedWithin = (fromDays, toDays) =>
    openDays.some((k) => {
      const t = new Date(`${k}T12:00:00`)
      const delta = (t - first) / dayMs
      return delta >= fromDays && delta < toDays
    })
  const elapsed = (now - first) / dayMs
  return {
    d1: elapsed < 1 ? null : returnedWithin(1, 2),
    d7: elapsed < 7 ? null : returnedWithin(1, 8),
  }
}

/** The whole tally — for a future diagnostics view / manual export. */
export function metricsSnapshot() {
  return read()
}
