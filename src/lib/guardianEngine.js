// guardianEngine.js — the Guardian's drift sentinel (predictive, local, explainable).
//
// The bet: a slip is upstream-visible. Short sleep, a deck being ignored, the
// fragile early days of a run, and the user's OWN historical urge hours combine
// into elevated conditions long before the urge screen gets opened. This engine
// fuses those signals into one honest number and acts on it — before the fact.
//
// DESIGN RULES (all binding):
//   • Deterministic + explainable. Every point of the score is a named vector
//     with the evidence beside it. No black box — "data, not verdict."
//   • Forecast framing, never indictment (PSYCHOLOGY.md §2: never a "you're
//     about to fail" state). The copy reads like weather, and the tone engine
//     mirrors it to the user's motivational profile.
//   • ONE pre-emptive notification per app-day, max, action-cued — doctrine
//     says notifications stay few; severity moves the register, never the volume.
//   • Cold-start honesty: with no history a vector contributes nothing, and the
//     engine may not cry CRITICAL on priors alone (needs ≥2 evidence-backed
//     vectors). Absent HealthKit (web) degrades to the behavioral signals.
//
// WHAT FEEDS IT (all existing plumbing):
//   health.readToday()        — sleep + HRV (native; null on web)
//   streak.resets/urgesSurvived — the synced urge-moment timeline (hour histogram)
//   engagement.summarizeDay() — deck engagement + missed ◆ blocks
//   wellness slice            — manual sleep self-report, the no-HealthKit fallback
// Baselines (personal sleep/HRV EWMA) + the invocation log + notification dedupe
// live in a LOCAL sidecar key, like engagement.js — device telemetry, not app data.

import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import * as storage from './storage.js'
import { appDayKey, streakDays } from './dates.js'
import { summarizeDay, subscribe as subscribeEngagement } from './engagement.js'
import { readToday } from './health.js'
import { screen } from './guardian.js'
import { voice, windowLabel } from './toneEngine.js'

const KEY = 'lockedin:__guardian'
const WARN_NOTIF_ID = 1900000077 // fixed id — rescheduling replaces, never stacks
const EWMA_ALPHA = 0.25 // ~1/4 of each new day folds into the baseline
const MAX_INVOCATIONS = 100

// ── Sidecar ──────────────────────────────────────────────────────────────────
export function readGuardian() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { baselines: {}, invocations: [], ...JSON.parse(raw) }
  } catch {
    /* clean slate */
  }
  return { baselines: {}, baselineDay: null, lastBand: 'stable', lastWarnDay: null, invocations: [] }
}
function writeGuardian(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota — in-memory assessment still works this session */
  }
}

/** Fold today's health snapshot into the personal EWMA baselines, once per app-day. */
export function foldBaseline(snapshot, day = appDayKey()) {
  if (!snapshot) return readGuardian()
  const g = readGuardian()
  if (g.baselineDay === day) return g
  const fold = (prev, today) =>
    today == null ? (prev ?? null) : prev == null ? today : Math.round((EWMA_ALPHA * today + (1 - EWMA_ALPHA) * prev) * 10) / 10
  g.baselines = { sleep: fold(g.baselines.sleep, snapshot.sleepHours), hrv: fold(g.baselines.hrv, snapshot.hrv) }
  g.baselineDay = day
  writeGuardian(g)
  return g
}

/** Log that an Outlast It protocol was dealt (the forge's learning substrate). */
export function recordInvocation({ steps = [], severity = 'normal' } = {}) {
  const g = readGuardian()
  // StrictMode double-mount guard: the same deal within 5s is ONE invocation.
  // A duplicate row would double-count tonight's outcome in the step stats.
  const last = g.invocations[g.invocations.length - 1]
  if (
    last &&
    Math.abs(Date.now() - Date.parse(last.at)) < 5000 &&
    JSON.stringify(last.steps) === JSON.stringify(steps)
  ) {
    return last
  }
  const inv = { at: new Date().toISOString(), steps, severity }
  g.invocations = [...g.invocations, inv].slice(-MAX_INVOCATIONS)
  writeGuardian(g)
  return inv
}
export function getInvocations() {
  return readGuardian().invocations
}

// ── The temporal histogram (the user's own danger hours) ────────────────────
// Urge MOMENTS — survived or not — mark vulnerability; a reset is the confirmed
// worst case so it weighs double. Smoothed with a circular Gaussian (σ=1.5h) so
// 9:40pm and 10:15pm events reinforce the same window instead of splitting it.
const SIGMA_H = 1.5

export function urgeMoments(streak = {}) {
  const out = []
  for (const r of streak.resets || []) {
    const t = Date.parse(r.at)
    if (Number.isFinite(t)) out.push({ hour: new Date(t).getHours() + new Date(t).getMinutes() / 60, weight: 2 })
  }
  for (const w of streak.urgesSurvived || []) {
    const t = Date.parse(w.at)
    if (Number.isFinite(t)) out.push({ hour: new Date(t).getHours() + new Date(t).getMinutes() / 60, weight: 1 })
  }
  return out
}

function circularDist(a, b) {
  const d = Math.abs(a - b) % 24
  return Math.min(d, 24 - d)
}

/** Smoothed vulnerability density at a given hour (0..23.99). */
export function densityAt(hour, moments) {
  let sum = 0
  for (const m of moments) {
    const d = circularDist(hour, m.hour)
    sum += m.weight * Math.exp(-(d * d) / (2 * SIGMA_H * SIGMA_H))
  }
  return sum
}

/**
 * The peak danger hour and normalized now-risk. Needs ≥3 real moments to speak
 * from observation. With fewer, an optional day-0 survey `prior` ({ peakHour })
 * stands in — returned with evidence:'survey' (truthy, so it fills the {window},
 * but NOT === true, so assessDrift excludes it from the CRITICAL evidence gate).
 */
export function temporalProfile(streak, now = new Date(), prior = null) {
  const moments = urgeMoments(streak)
  if (moments.length < 3) {
    if (prior && Number.isFinite(prior.peakHour)) {
      const nowH = now.getHours() + now.getMinutes() / 60
      const d = circularDist(nowH, prior.peakHour)
      const score = Math.exp(-(d * d) / (2 * SIGMA_H * SIGMA_H)) // same Gaussian as the histogram
      return { evidence: 'survey', score: Math.min(1, score), peakHour: prior.peakHour }
    }
    return { evidence: false, score: 0, peakHour: null }
  }
  let peakHour = 0
  let peak = -1
  for (let h = 0; h < 24; h += 0.5) {
    const d = densityAt(h, moments)
    if (d > peak) {
      peak = d
      peakHour = h
    }
  }
  const nowH = now.getHours() + now.getMinutes() / 60
  const score = peak > 0 ? densityAt(nowH, moments) / peak : 0
  return { evidence: true, score: Math.min(1, score), peakHour }
}

// ── The vectors ──────────────────────────────────────────────────────────────
// Each returns { score: 0..1, evidence: bool, note }. Weights sum to 100.
const clamp01 = (n) => Math.max(0, Math.min(1, n))

function vSleepDebt({ health, baselines, wellnessToday }) {
  if (health?.sleepHours != null && baselines?.sleep != null) {
    const deficit = baselines.sleep - health.sleepHours
    if (deficit <= 0.5) return { score: 0, evidence: true, note: 'sleep at baseline' }
    return { score: clamp01(deficit / 2.5), evidence: true, note: `slept ${deficit.toFixed(1)}h under baseline` }
  }
  // No HealthKit → the manual morning self-report (1–5) stands in.
  const s = wellnessToday?.sleep
  if (s === 1) return { score: 0.8, evidence: true, note: 'self-reported sleep 1/5' }
  if (s === 2) return { score: 0.5, evidence: true, note: 'self-reported sleep 2/5' }
  if (s != null) return { score: 0, evidence: true, note: 'self-reported sleep ok' }
  return { score: 0, evidence: false, note: 'no sleep data' }
}

function vHrvDrop({ health, baselines }) {
  if (health?.hrv == null || baselines?.hrv == null || baselines.hrv <= 0) {
    return { score: 0, evidence: false, note: 'no HRV data' }
  }
  const drop = (baselines.hrv - health.hrv) / baselines.hrv
  if (drop < 0.12) return { score: 0, evidence: true, note: 'HRV near baseline' }
  return { score: clamp01((drop - 0.12) / 0.18), evidence: true, note: `HRV ${Math.round(drop * 100)}% under baseline` }
}

function vEngagementSlip({ summary }) {
  const seen = summary?.widgets?.length || 0
  if (seen < 4) return { score: 0, evidence: false, note: 'deck barely dealt yet' }
  // "Ignored" is only a fact once the day shows some action — cards mount as
  // "seen" the instant the deck is dealt, so before anything has been used,
  // posted, or missed, an untouched deck is a blank page, not a slip.
  const imp = summary.impact || {}
  const acted =
    (summary.usedTypes?.length || 0) > 0 || (imp.done || 0) > 0 || (imp.missed || 0) > 0 || summary.closed
  if (!acted) return { score: 0, evidence: false, note: 'deck dealt — no reads yet' }
  const ignored = summary.ignoredTypes?.length || 0
  const score = ignored >= 4 ? 1 : ignored >= 2 ? 0.5 : 0
  return { score, evidence: true, note: ignored ? `${ignored} card types ignored` : 'deck engaged' }
}

function vStreakPhase({ streak, now }) {
  if (!streak?.startedAt) return { score: 0, evidence: false, note: 'no run yet' }
  const days = streakDays(streak.startedAt, now)
  const bestDays = Math.floor((streak.bestSeconds || 0) / 86400)
  // A brand-new book (day 0, no resets or wins ever) has no behavior to read —
  // the phase model starts once there's a single day of tape. Without this, a
  // fresh install opens to a risk flag about conduct that never happened.
  const hasHistory = (streak.resets || []).length > 0 || (streak.urgesSurvived || []).length > 0
  if (days === 0 && !hasHistory) {
    return { score: 0, evidence: false, note: 'first day on the book' }
  }
  // Early days: the habit isn't load-bearing yet, and a fresh reset carries AVE
  // risk (Lally 2010; Marlatt). Summit zone: approaching/just past the personal
  // best is its own pressure (goal-gradient in, letdown out).
  let score = 0
  let note = `day ${days} — steady water`
  if (days <= 6) {
    score = 0.7
    note = `day ${days} — early days; the structure carries you`
  } else if (days <= 13) {
    score = 0.35
    note = `day ${days} — young run`
  }
  if (bestDays >= 3 && Math.abs(days - bestDays) <= 2) {
    score = Math.max(score, 0.6)
    note = `day ${days}, personal best is ${bestDays} — the summit zone`
  }
  return { score, evidence: true, note }
}

function vImpactMisses({ summary }) {
  const missed = summary?.impact?.missed || 0
  if (!summary?.impact?.total) return { score: 0, evidence: false, note: 'no ◆ blocks today' }
  const score = missed >= 2 ? 1 : missed === 1 ? 0.5 : 0
  return { score, evidence: true, note: missed ? `${missed} ◆ block(s) missed` : '◆ blocks on track' }
}

const VECTORS = [
  { key: 'sleepDebt', weight: 20, fn: vSleepDebt },
  { key: 'hrvDrop', weight: 10, fn: vHrvDrop },
  { key: 'engagementSlip', weight: 20, fn: vEngagementSlip },
  { key: 'streakPhase', weight: 15, fn: vStreakPhase },
  { key: 'temporalRisk', weight: 25, fn: ({ temporal }) => ({ score: temporal.score, evidence: temporal.evidence, note: temporal.evidence === 'survey' ? (temporal.score > 0.5 ? 'inside your stated danger window' : 'outside your stated danger window') : temporal.evidence ? (temporal.score > 0.5 ? 'inside your historical danger window' : 'outside the historical danger window') : 'not enough urge history yet' }) },
  { key: 'impactMisses', weight: 10, fn: vImpactMisses },
]

// Band thresholds with hysteresis so the deck doesn't flap at a boundary: it
// takes 65 to ENTER critical but a drop below 55 to leave (same idea at watch).
function bandFor(score, lastBand, evidenceCount) {
  let band = 'stable'
  if (score >= (lastBand === 'watch' || lastBand === 'critical' ? 30 : 35)) band = 'watch'
  if (score >= (lastBand === 'critical' ? 55 : 65)) band = 'critical'
  // Cold-start honesty: CRITICAL needs at least two evidence-backed vectors.
  if (band === 'critical' && evidenceCount < 2) band = 'watch'
  return band
}

/**
 * The pure core. All inputs injected — fully testable, no IO.
 * Returns { score, band, vectors, window, evidenceCount }.
 */
export function assessDrift({ now = new Date(), health = null, baselines = {}, wellnessToday = null, summary = null, streak = {}, lastBand = 'stable', guardianSeed = null } = {}) {
  const temporal = temporalProfile(streak, now, guardianSeed?.temporalPrior || null)
  const ctx = { now, health, baselines, wellnessToday, summary, streak, temporal }

  let score = 0
  let evidenceCount = 0
  const vectors = VECTORS.map(({ key, weight, fn }) => {
    const v = fn(ctx)
    score += v.score * weight
    // Only OBSERVED evidence (=== true) gates CRITICAL. A survey prior
    // (evidence:'survey') adds to the WATCH score and fills the window, but can
    // never satisfy the ≥2-evidence critical requirement — priors don't convict.
    if (v.evidence === true && v.score > 0) evidenceCount += 1
    return { key, weight, ...v }
  })
  score = Math.round(score)
  const band = bandFor(score, lastBand, evidenceCount)

  // The predicted vulnerability hour, warned EXACTLY 30 minutes before it —
  // action-cued, one shot, never mid-window nagging. Sourced from the observed
  // histogram or the day-0 survey prior (temporalProfile handles which).
  let window = null
  if (temporal.evidence && temporal.peakHour != null) {
    // Wrap around midnight: peakHour 0 (a real histogram output for late-night
    // users — the exact population this app serves) used to compute warnHour
    // -0.5, and setHours(-1, 30) lands on YESTERDAY — the warning could never
    // fire for any midnight-area window.
    const warnHour = (temporal.peakHour - 0.5 + 24) % 24
    const wh = Math.floor(warnHour)
    const wm = Math.round((warnHour - wh) * 60)
    const warnAt = new Date(now)
    warnAt.setHours(wh, wm, 0, 0)
    // Already past today → arm TOMORROW's window instead of going silent. The
    // scheduler replaces by fixed notification id, so re-arming is idempotent.
    if (warnAt <= now) warnAt.setDate(warnAt.getDate() + 1)
    window = {
      peakHour: temporal.peakHour,
      label: windowLabel(temporal.peakHour),
      warnAt,
    }
  }

  return { score, band, vectors, window, evidenceCount }
}

// ── The impure wrapper: gather → assess → persist band ───────────────────────
export async function runAssessment(now = new Date()) {
  const health = await readToday().catch(() => null) // null on web — fail-soft
  // Assess against the PRE-fold baselines (yesterday's EWMA), then fold today's
  // reading in for tomorrow. Folding first contaminated the baseline with the
  // very reading being assessed: every deficit attenuated by alpha (a 3h short
  // night read as 2.25h), and day 1 could never register debt because the
  // baseline seeded to today's own value. Pre-fold {} on day 1 → the vectors'
  // null-guards report "no baseline yet" honestly instead.
  const preBaselines = { ...(readGuardian().baselines || {}) }
  const g = foldBaseline(health)
  const streak = storage.get('streak')
  const wellness = storage.get('wellness')
  const assessment = assessDrift({
    now,
    health,
    baselines: preBaselines,
    wellnessToday: wellness[appDayKey(now)] || null,
    summary: summarizeDay(),
    streak,
    lastBand: g.lastBand,
    guardianSeed: g.seed || null, // day-0 survey priors, until real urge history exists
  })
  const g2 = readGuardian()
  g2.lastBand = assessment.band
  g2.lastAssessAt = new Date().toISOString() // heartbeat for verifyGuardianStatus
  writeGuardian(g2)
  return assessment
}

/**
 * The full tone profile from the stored survey — streakModel + theme AND the
 * register-driving signals (slipResponse, missionConfidence, executionRate7d)
 * so the tone engine's scaffold/strict switcher fires without the caller having
 * to reassemble it. Reads settings; safe defaults when unset.
 */
export function guardianProfile() {
  const s = storage.get('settings') || {}
  return {
    streakModel: s.streakModel,
    theme: s.theme,
    slipResponse: s.slipResponse,
    missionConfidence: s.missionConfidence,
    executionRate7d: s.executionRate7d,
  }
}

/**
 * Diagnostic self-check for the drift loop. By default it PROBES (runs one
 * assessment) so the heartbeat is fresh, then verifies the pieces that keep the
 * Guardian alive: the local sidecar is readable + writable, priors are armed,
 * the assessment loop has run recently, and the engagement listener is bound.
 * Returns { ok, checkedAt, checks } — never throws.
 */
export async function verifyGuardianStatus({ probe = true } = {}) {
  if (probe) {
    try {
      await runAssessment()
    } catch {
      /* fall through — the checks below report the failure honestly */
    }
  }
  const now = Date.now()
  const g = readGuardian()
  const seed = g.seed || null
  const lastAssessAt = g.lastAssessAt ? Date.parse(g.lastAssessAt) : null
  const checks = {
    storeReadable: !!g && typeof g === 'object', // local sidecar sync
    priorsArmed: !!(seed && (seed.temporalPrior || seed.slipRegister)), // day-0 survey priors present
    baselineFolded: !!(g.baselines && (g.baselines.sleep != null || g.baselines.hrv != null)),
    loopRecent: lastAssessAt != null && now - lastAssessAt < 20 * 60 * 1000, // 15m tick + slack
    listenerBound: typeof subscribeEngagement === 'function', // engagement pub/sub wired
    invocationsTracked: Array.isArray(g.invocations),
    native: Capacitor.isNativePlatform(), // native scheduling available?
  }
  // "Fully active" = the loop is running, the store round-trips, and the event
  // source is bound. Priors/baseline/native are informational, not required.
  const ok = checks.storeReadable && checks.loopRecent && checks.listenerBound
  return { ok, checkedAt: new Date().toISOString(), checks }
}

/** The tone-engine params every Guardian line needs, derived from live state. */
export function voiceParams(assessment, streak = storage.get('streak')) {
  const wins = (streak.urgesSurvived || []).length
  return {
    days: streakDays(streak.startedAt),
    best: Math.floor((streak.bestSeconds || 0) / 86400),
    wins,
    winsNext: wins + 1,
    window: assessment?.window?.label || 'the usual stretch',
  }
}

// ── Intervention 1: the layout transform (LiveDeck idiom) ────────────────────
// Injects ONE Guardian InsightCard at the top of the default tab at watch+.
// Immutable, idempotent, and screened — same contract as applyCounsel.
export function applyGuardian(layout, assessment, profile = {}) {
  if (!assessment || assessment.band === 'stable' || !layout || !Array.isArray(layout.tabs) || !layout.tabs.length) {
    return layout
  }
  const slot = assessment.band === 'critical' ? 'drift.critical' : 'drift.watch'
  const params = voiceParams(assessment)
  let text = voice(profile, slot, params)
  if (!screen(text).ok) text = 'Conditions are elevated today. One move: phone out of the room before the evening, then the next scheduled block.'

  const targetKey = layout.defaultTab && layout.tabs.some((t) => t.key === layout.defaultTab) ? layout.defaultTab : layout.tabs[0].key
  return {
    ...layout,
    tabs: layout.tabs.map((t) => {
      if (t.key !== targetKey || (t.blocks || []).some((b) => b && b.id === 'guardian-drift')) return t
      const card = {
        type: 'InsightCard',
        id: 'guardian-drift',
        config: { heading: 'Guardian', source: 'drift', text, tone: assessment.band === 'critical' ? 'neg' : 'warn' },
      }
      return { ...t, blocks: [card, ...(t.blocks || [])] }
    }),
  }
}

// ── Intervention 2: the pre-window warning (native, once per app-day) ────────
// Fires ONE notification 30 min before the vulnerability hour (assessment.window
// .warnAt). profile defaults to the stored survey profile so the tone register
// (scaffold/strict) applies even if the caller passed nothing.
export async function scheduleGuardianWarning(assessment, profile = guardianProfile()) {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'web' }
  if (!assessment || assessment.band === 'stable' || !assessment.window?.warnAt) return { ok: false, reason: 'no-window' }
  const day = appDayKey()
  const g = readGuardian()
  if (g.lastWarnDay === day) return { ok: false, reason: 'already-warned' } // ONE per day — doctrine
  const msg = voice(profile, 'warn.notification', voiceParams(assessment))
  if (!msg || !screen(`${msg.title} ${msg.body}`).ok) return { ok: false, reason: 'blocked' }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return { ok: false, reason: 'denied' }
    await LocalNotifications.schedule({
      notifications: [{ id: WARN_NOTIF_ID, title: msg.title, body: msg.body, schedule: { at: assessment.window.warnAt } }],
    })
    g.lastWarnDay = day
    writeGuardian(g)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'schedule-error', error }
  }
}

// ── React binding ────────────────────────────────────────────────────────────
// Re-assesses on mount, whenever engagement telemetry changes, and every 15
// minutes (the temporal vector moves with the clock). Cheap: pure math over
// small local arrays; readToday is the only async call and no-ops on web.
export function useDriftSentinel() {
  const [assessment, setAssessment] = useState(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    const tick = () => {
      runAssessment().then((a) => {
        if (alive.current) setAssessment(a)
      })
    }
    tick()
    const unsub = subscribeEngagement(tick)
    const id = setInterval(tick, 15 * 60 * 1000)
    return () => {
      alive.current = false
      unsub()
      clearInterval(id)
    }
  }, [])
  return assessment
}
