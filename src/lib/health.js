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
    const res = await kit.isAvailable()
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
    await kit.requestAuthorization({ read: READ_TYPES, write: [] })
    return { ok: true }
  } catch (error) {
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
      const res = await kit.queryAggregated({ dataType, startDate, endDate, bucket: 'day', aggregation })
      const arr = res?.samples
      return Array.isArray(arr) ? arr.map((s) => Number(s.value)).filter(Number.isFinite) : []
    } catch {
      return []
    }
  }

  // Raw samples for a metric → HealthSample[] (or [] on failure / missing scope).
  const samples = async (dataType) => {
    try {
      const res = await kit.readSamples({ dataType, startDate, endDate, limit: 1000 })
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
