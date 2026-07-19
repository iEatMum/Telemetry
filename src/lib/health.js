// health.js — Apple Health / Health Connect intake on native, fail-soft elsewhere.
//
// Reads steps / sleep / resting-HR / HRV via @capgo/capacitor-health (HealthKit
// on iOS 14+, Health Connect on Android 8+). Fail-soft contract: every function
// no-ops (returns null / { ok:false }) on web, in the simulator, or when the
// native plugin / SDK is missing or denied — it NEVER throws, so importing this
// can never break a build or crash the deck.
//
// To make it live (see SHIPPING.md → "Health"):
//   1. The dep is already declared: @capgo/capacitor-health. Run `npx cap sync ios`.
//   2. Xcode: enable the HealthKit capability + entitlement (a real DEVICE is
//      required — no simulator — and a distributable build needs the $99 program).
//   3. Info.plist: NSHealthShareUsageDescription (+ NSHealthUpdateUsageDescription).
//   4. await requestHealthAuth() once, then readToday() — on the device.

import { Capacitor } from '@capacitor/core'

// P3 hang-proofing: no native health promise may hold the UI hostage. Every
// plugin call races a hard clock; a timeout resolves to the fallback and logs a
// [health] line to the Xcode console, so a stall names its own leg instead of
// spinning "Connecting…" forever. 25s on the auth call — the iOS grant sheet is
// modal and a human is reading it; 8s on data reads, which have no UI.
const AUTH_TIMEOUT_MS = 25_000
const READ_TIMEOUT_MS = 8_000
function timebox(promise, ms, fallback, label) {
  return Promise.race([
    promise.then((v) => {
      console.log(`[health] ${label} → ok`)
      return v
    }),
    new Promise((resolve) =>
      setTimeout(() => {
        console.warn(`[health] ${label} → TIMEOUT after ${ms}ms (native promise never settled)`)
        resolve(fallback)
      }, ms)
    ),
  ])
}

// @capgo's HealthDataType string literals (verbatim from its TS API). We
// authorize all four, then read each via whichever query the plugin supports.
const READ_TYPES = ['steps', 'sleep', 'heartRate', 'heartRateVariability']

// Sleep states that count as actually-asleep — everything except 'awake'/'inBed'.
const ASLEEP = new Set(['asleep', 'rem', 'deep', 'light'])

// Lazy, defensive import — only on native, never throws if the plugin is absent.
// Returns the named `Health` export (the @capgo plugin object) or null.
async function loadKit() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import('@capgo/capacitor-health')
    return mod.Health || mod.default || null
  } catch {
    return null // plugin not installed / not built for this platform
  }
}

// True only when the native SDK is actually present AND reports availability
// (isAvailable() is false on web and on a device without HealthKit/Health
// Connect). Never throws.
export async function isHealthAvailable() {
  const kit = await loadKit()
  if (!kit) return false
  try {
    const res = await timebox(kit.isAvailable(), READ_TIMEOUT_MS, null, 'isAvailable')
    return res?.available === true
  } catch {
    return false
  }
}

// Request READ authorization for the metrics we consume. Returns
//   { ok:false, reason:'unavailable' }  when there is no native plugin/SDK,
//   { ok:true }                          when the request resolves,
//   { ok:false, reason:'denied', error } if the request throws.
// We do NOT inspect the returned AuthorizationStatus: on iOS HealthKit
// deliberately does not report read-permission denials (its readDenied list is
// unreliable), so a resolved call is treated as ok and readToday() simply
// degrades to nulls if the user actually declined.
export async function requestHealthAuth() {
  const kit = await loadKit()
  if (!kit) return { ok: false, reason: 'unavailable' }
  try {
    const res = await timebox(
      kit.requestAuthorization({ read: READ_TYPES, write: [] }).then(() => ({ ok: true })),
      AUTH_TIMEOUT_MS,
      { ok: false, reason: 'timeout' },
      'requestAuthorization'
    )
    return res
  } catch (error) {
    console.warn('[health] requestAuthorization → rejected:', error?.message || error)
    return { ok: false, reason: 'denied', error }
  }
}

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Total minutes covered by a set of [startMs, endMs] intervals, merging overlaps
// so a sleep session sample and its stage samples over the same span count once.
function unionMinutes(intervals) {
  const valid = intervals.filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s)
  if (!valid.length) return 0
  valid.sort((a, b) => a[0] - b[0])
  let total = 0
  let [curStart, curEnd] = valid[0]
  for (let i = 1; i < valid.length; i++) {
    const [s, e] = valid[i]
    if (s > curEnd) {
      total += curEnd - curStart
      curStart = s
      curEnd = e
    } else if (e > curEnd) {
      curEnd = e
    }
  }
  total += curEnd - curStart
  return total / 60000
}

// Today's snapshot: { steps, sleepHours, restingHR, hrv } with nulls for anything
// unavailable. Never throws. Uses the right tool per metric:
//   - steps / resting-HR → queryAggregated (sum / min over the day). Aggregating
//     avoids the readSamples row cap, which would silently UNDER-count the many
//     per-delta step samples a device emits in a day.
//   - sleep / HRV → readSamples (the @capgo API forbids aggregating these).
export async function readToday() {
  const kit = await loadKit()
  if (!kit) return null
  const startDate = startOfTodayISO()
  const endDate = new Date().toISOString() // exclusive in @capgo
  const out = { steps: null, sleepHours: null, restingHR: null, hrv: null }

  // Aggregate a metric into day buckets → the finite bucket values (or [] on any
  // failure / missing scope). Only valid for @capgo's aggregatable types.
  const aggregate = async (dataType, aggregation) => {
    try {
      const res = await timebox(
        kit.queryAggregated({ dataType, startDate, endDate, bucket: 'day', aggregation }),
        READ_TIMEOUT_MS,
        null,
        `queryAggregated:${dataType}`
      )
      const arr = res?.samples
      return Array.isArray(arr) ? arr.map((s) => Number(s.value)).filter(Number.isFinite) : []
    } catch {
      return []
    }
  }

  // Raw samples for a metric → HealthSample[] (or [] on failure / missing scope).
  const samples = async (dataType) => {
    try {
      const res = await timebox(
        kit.readSamples({ dataType, startDate, endDate, limit: 1000 }),
        READ_TIMEOUT_MS,
        null,
        `readSamples:${dataType}`
      )
      const arr = res?.samples
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  // Steps — daily SUM via aggregation (summing raw delta samples would truncate).
  const stepBuckets = await aggregate('steps', 'sum')
  if (stepBuckets.length) out.steps = Math.round(stepBuckets.reduce((s, v) => s + v, 0))

  // Resting HR — daily MIN heart rate as a proxy (HealthKit's own restingHR type
  // isn't in our scopes; the day's lowest bpm is a stable stand-in).
  const hrMins = await aggregate('heartRate', 'min')
  if (hrMins.length) out.restingHR = Math.round(Math.min(...hrMins))

  // Sleep — total ASLEEP time WITHOUT double-counting. Platforms emit both a
  // session sample and stage samples over the same span, so we collect asleep
  // intervals (preferring per-sample stages when present, else the sample's own
  // state) and merge the union — never summing raw minutes, which would inflate.
  const sleep = await samples('sleep')
  if (sleep.length) {
    const intervals = []
    for (const r of sleep) {
      if (Array.isArray(r.stages) && r.stages.length) {
        for (const st of r.stages) {
          if (ASLEEP.has(st.stage)) intervals.push([Date.parse(st.startDate), Date.parse(st.endDate)])
        }
      } else if (r.sleepState && ASLEEP.has(r.sleepState)) {
        intervals.push([Date.parse(r.startDate), Date.parse(r.endDate)])
      }
    }
    const minutes = unionMinutes(intervals)
    if (minutes > 0) out.sleepHours = Math.round((minutes / 60) * 10) / 10
  }

  // HRV (SDNN) — @capgo dataType 'heartRateVariability', value already in ms.
  // Average the day's samples. Any failure / missing type leaves hrv = null.
  const hrv = await samples('heartRateVariability')
  if (hrv.length) {
    const vals = hrv.map((r) => Number(r.value)).filter(Number.isFinite)
    if (vals.length) out.hrv = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  }

  return out
}

// Map a Health snapshot to a WellnessSheet merge-patch ({ sleep:1-5, rhr }), so
// "Fill from Health" can prefill the morning check-in. Returns null for a falsy
// snapshot so a web/simulator null from readToday() simply no-ops upstream.
//   - sleep: undefined when sleepHours is null (leave the dim unset), else a 1-5
//     band; an explicit 0 hours maps to 1 (a real, poor reading).
//   - rhr:   restingHR if present, else undefined (so saveWellness clears it).
export function toReadinessInputs(snapshot) {
  if (!snapshot) return null
  const h = snapshot.sleepHours
  const sleep = h == null ? undefined : h >= 8 ? 5 : h >= 7 ? 4 : h >= 6 ? 3 : h >= 5 ? 2 : 1
  return { sleep, rhr: snapshot.restingHR ?? undefined }
}

// ── V3: the FULL instrument panel (watch → Health → Telemetry) ───────────────
// Every read-type the installed plugin supports, with the right reduction per
// metric. `samples` + a reducer is used for everything (uniform + safe: the
// plugin forbids aggregation on several types); the four core guardian metrics
// keep their tuned paths in readToday() above.
//   sum      — additive counts over the day (steps, distance, calories…)
//   avg      — physiological rates (HR, SpO2, respiratory, HRV)
//   last     — body measurements where the newest reading IS the value
//   minutes  — interval union (mindfulness, workouts, exercise time)
export const HEALTH_METRICS = [
  { key: 'steps', type: 'steps', reduce: 'sum', unit: 'steps', label: 'Steps' },
  { key: 'distance', type: 'distance', reduce: 'sum', unit: 'm', label: 'Walk + run distance' },
  { key: 'flightsClimbed', type: 'flightsClimbed', reduce: 'sum', unit: 'floors', label: 'Flights climbed' },
  { key: 'distanceCycling', type: 'distanceCycling', reduce: 'sum', unit: 'm', label: 'Cycling distance' },
  { key: 'activeCalories', type: 'calories', reduce: 'sum', unit: 'kcal', label: 'Active energy' },
  { key: 'basalCalories', type: 'basalCalories', reduce: 'sum', unit: 'kcal', label: 'Resting energy' },
  { key: 'totalCalories', type: 'totalCalories', reduce: 'sum', unit: 'kcal', label: 'Total energy' },
  { key: 'exerciseTime', type: 'exerciseTime', reduce: 'minutes', unit: 'min', label: 'Exercise minutes' },
  { key: 'workouts', type: 'workouts', reduce: 'minutes', unit: 'min', label: 'Workout time' },
  { key: 'mindfulness', type: 'mindfulness', reduce: 'minutes', unit: 'min', label: 'Mindful minutes' },
  { key: 'heartRate', type: 'heartRate', reduce: 'avg', unit: 'bpm', label: 'Heart rate (avg)' },
  { key: 'restingHeartRate', type: 'restingHeartRate', reduce: 'last', unit: 'bpm', label: 'Resting heart rate' },
  { key: 'hrv', type: 'heartRateVariability', reduce: 'avg', unit: 'ms', label: 'Heart-rate variability' },
  { key: 'respiratoryRate', type: 'respiratoryRate', reduce: 'avg', unit: 'br/min', label: 'Respiratory rate' },
  { key: 'oxygenSaturation', type: 'oxygenSaturation', reduce: 'avg', unit: '%', label: 'Blood oxygen' },
  { key: 'vo2Max', type: 'vo2Max', reduce: 'last', unit: 'mL/min/kg', label: 'VO₂ max' },
  { key: 'bloodPressure', type: 'bloodPressure', reduce: 'last', unit: 'mmHg', label: 'Blood pressure' },
  { key: 'bloodGlucose', type: 'bloodGlucose', reduce: 'last', unit: 'mg/dL', label: 'Blood glucose' },
  { key: 'bodyTemperature', type: 'bodyTemperature', reduce: 'last', unit: '°C', label: 'Body temperature' },
  { key: 'weight', type: 'weight', reduce: 'last', unit: 'kg', label: 'Weight' },
  { key: 'height', type: 'height', reduce: 'last', unit: 'cm', label: 'Height' },
  { key: 'bodyFat', type: 'bodyFat', reduce: 'last', unit: '%', label: 'Body fat' },
]

// The full read-authorization set: the 4 guardian core types + every panel type.
export const ALL_READ_TYPES = [...new Set([...READ_TYPES, ...HEALTH_METRICS.map((m) => m.type)])]

/** Request read access to the WHOLE panel (the V3 grant). Same contract as
 *  requestHealthAuth; iOS shows one sheet with per-metric switches. */
export async function requestFullHealthAuth() {
  const kit = await loadKit()
  if (!kit) return { ok: false, reason: 'unavailable' }
  try {
    const res = await timebox(
      kit.requestAuthorization({ read: ALL_READ_TYPES, write: [] }).then(() => ({ ok: true })),
      AUTH_TIMEOUT_MS,
      { ok: false, reason: 'timeout' },
      'requestFullAuth'
    )
    return res
  } catch (error) {
    console.warn('[health] requestFullAuth → rejected:', error?.message || error)
    return { ok: false, reason: 'denied', error }
  }
}

function reduceSamples(rows, mode) {
  if (!rows.length) return null
  if (mode === 'minutes') {
    const mins = unionMinutes(rows.map((r) => [Date.parse(r.startDate), Date.parse(r.endDate)]))
    return mins > 0 ? Math.round(mins) : null
  }
  const vals = rows.map((r) => Number(r.value)).filter(Number.isFinite)
  if (!vals.length) return null
  if (mode === 'sum') return Math.round(vals.reduce((s, v) => s + v, 0))
  if (mode === 'avg') return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  // 'last' — samples arrive newest-first by default (ascending:false)
  return Math.round(vals[0] * 10) / 10
}

/** Today's FULL snapshot: { [key]: number|null } for every HEALTH_METRICS row,
 *  plus sleepHours from the tuned reader. Never throws; null everywhere on web. */
export async function readAllToday() {
  const kit = await loadKit()
  const out = { sleepHours: null }
  for (const m of HEALTH_METRICS) out[m.key] = null
  if (!kit) return out
  const startDate = startOfTodayISO()
  const endDate = new Date().toISOString()
  // Sequential on purpose: HealthKit fans one query at a time more reliably
  // than 22 concurrent reads, and each leg is individually timeboxed.
  for (const m of HEALTH_METRICS) {
    try {
      const res = await timebox(
        kit.readSamples({ dataType: m.type, startDate, endDate, limit: 1000 }),
        READ_TIMEOUT_MS,
        null,
        `readSamples:${m.type}`
      )
      const rows = Array.isArray(res?.samples) ? res.samples : []
      out[m.key] = reduceSamples(rows, m.reduce)
    } catch {
      /* scope missing / type unsupported on this device — stays null */
    }
  }
  const core = await readToday()
  if (core) {
    out.sleepHours = core.sleepHours
    // The tuned aggregate beats a sample sum for steps (row-cap safe).
    if (core.steps != null) out.steps = core.steps
  }
  return out
}
