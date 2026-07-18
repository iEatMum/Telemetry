// storage.js — the ONE place the app talks to localStorage.
//
// Every screen reads and writes through get()/set()/update() here. Nothing else
// touches localStorage directly. That's the whole point: when Phase 3 swaps in
// Supabase, this is the only file that changes.
//
// Shape of the data lives in DEFAULTS below — it doubles as documentation.

import { sanitize } from './validate.js'

const PREFIX = 'lockedin:'
export const SCHEMA_VERSION = 2

// Today's date as the app sees it (used for a couple of defaults below).
// The real day-rollover logic (3am) lives in dates.js.
function nowISO() {
  return new Date().toISOString()
}

// The complete data model. Each key is its own localStorage entry.
export const DEFAULTS = {
  settings: {
    name: '',
    wakeTime: '06:45',
    bedTime: '22:15', // "phone out of the bedroom by 10:15pm"
    moneyGoal: 3500,
    // Phase 2: multiple accountability partners on the HELP button.
    // partnerName/partnerPhone are kept for one-time migration (see store.jsx).
    partners: [], // [{ id, name, phone }]
    partnerName: '',
    partnerPhone: '',
    shoes: [], // ['Vaporfly', 'Daily trainer', ...] — tag runs to track mileage
    reportDate: '2026-08-15', // "Report to Fresno State" — editable in Settings
    focusShortcutName: 'Sprint', // iOS Shortcut the Sprint screen can trigger
    seededTasks: false, // set true once starter tasks are seeded — see store.jsx
    // The DICTATED day — blocks the user wrote themselves (onboarding's
    // "dictate your day" step and the day-plan editor). The book takes
    // dictation; it never invents a life. [{ id, time:'HH:MM'|'', block, impact:'high'|undefined }]
    dayBlocks: [],
    schemaVersion: SCHEMA_VERSION,
  },

  // startedAt drives the live race-clock. It's null here and stamped with the
  // real timestamp on first run (see store.jsx), because defaults must be static.
  streak: {
    startedAt: null, // ISO string: the instant the current clean streak began
    cleanDates: [], // ['YYYY-MM-DD', ...] days marked clean (calendar grid)
    resets: [], // [{ at, date, time, place, device, feeling }]
    urgesSurvived: [], // [{ at }]  — wins, not just losses
    bestSeconds: 0, // longest completed streak, in seconds
  },

  sprints: [], // [{ date:'YYYY-MM-DD', count:Number, labels:[String] }]
  income: [], // [{ id, date, amount, source }]
  runs: [], // [{ id, date, type, miles, minutes, rpe, note, shoe, warmup }]
  // recurrence: { type:'none'|'daily'|'weekly'|'everyN', weekday?, n?, unit? }
  tasks: [], // [{ id, title, cat, recurrence, nextDue, done, history:[] }]
  reviews: [], // [{ weekOf, stats:{}, worked, broke, oneChange }]

  // Morning protocol checklist, keyed by app-day ('YYYY-MM-DD', rolls at 3am).
  // Each item is tri-state: undefined | 'done' | 'missed' (a miss is data, not failure).
  // { '2026-06-11': { wake:'done', prayer:'missed', run:undefined, phone:'done' } }
  checklist: {},

  // Morning readiness check-in, keyed by app-day ('YYYY-MM-DD', rolls at 3am).
  // A fast self-report — sleep/legs/mind each 1–5, optional resting HR. Not a
  // sleep-hours pass/fail (that re-imports all-or-nothing); a charge readout.
  // { '2026-06-13': { sleep:4, legs:3, mind:5, rhr:48, at:'…' } }
  wellness: {},

  // The Guardian's Handover (Phase 4). PRIVATE BY CONSTRUCTION: this slice is
  // deliberately NOT in sync.js's SLICES map, so a draft can never be pushed to
  // the server — the sync engine doesn't even know it exists. A draft is what
  // you're still holding; on "Surrender" it becomes a Consideration (the
  // Guardian's insight for the Evening Examen) and the raw draft is let go. The
  // raw input never leaves the device.
  handover: {
    drafts: [], // [{ id, kind, body, attachments:[{name,size,type}], createdAt, updatedAt }]
    considerations: [], // [{ id, heading, source, text, synthesis, at, dismissed }]
    counselAck: [], // [{ key, day }] — Counsel patterns acknowledged ("let go") for that app-day
  },

  // A reading plan you move through one section at a time (Ian's ask).
  // index points at the current section; advancing logs to history.
  reading: {
    index: 0,
    history: [], // [{ label, at }]
    plan: [
      'John 1', 'John 2', 'John 3', 'John 4', 'John 5', 'John 6', 'John 7',
      'John 8', 'John 9', 'John 10', 'John 11', 'John 12', 'John 13', 'John 14',
      'John 15', 'John 16', 'John 17', 'John 18', 'John 19', 'John 20', 'John 21',
    ],
  },
}

function keyOf(name) {
  return PREFIX + name
}

// --- failure honesty (MASTERPLAN P1 · "the book survives") ------------------
// A write the store couldn't take, or a page too damaged to read, must surface —
// silent loss in an app whose promise is "the book keeps the record" is the one
// unforgivable failure. Alerts are deduped per (kind,name) per session and kept
// in a list the banner can read even if it mounts after the event fired.
const seenAlerts = new Set()
const alertLog = []
export function storageAlerts() {
  return alertLog.slice()
}
function raiseAlert(kind, name) {
  const key = `${kind}:${name}`
  if (seenAlerts.has(key)) return
  seenAlerts.add(key)
  const detail = { kind, name, at: nowISO() }
  alertLog.push(detail)
  if (typeof window !== 'undefined') {
    // Deferred: get() runs during React render; dispatching (→ setState in a
    // listener) synchronously from there is a render-phase update.
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('telemetry:storage-alert', { detail }))
      } catch {
        /* no CustomEvent — the log still has it */
      }
    }, 0)
  }
}

// A page that won't parse is QUARANTINED, not discarded: the raw string moves to
// a __quarantine sidecar (wiped with everything else on wipeAll) so nothing is
// silently destroyed, and the slice heals to its default.
function quarantine(name, raw) {
  try {
    localStorage.setItem(keyOf('__quarantine:' + name), raw)
  } catch {
    /* quota — the alert still fires; the raw value stays where it was */
  }
  raiseAlert('corrupt', name)
}

// --- change notifications (the sync engine's only hook into storage) -------
// sync.js doesn't reach into this file; it subscribes. Every non-silent write
// notifies subscribers with (name, nextValue, prevValue). Reads and writes stay
// synchronous — the notification is the LAST thing set() does, never a blocker.
const subscribers = new Set()
export function subscribe(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

// The currently-stored value, parsed but NOT sanitized — lets a subscriber diff
// exactly what changed. Falls back to the slice's default shape.
function readRaw(name) {
  try {
    const raw = localStorage.getItem(keyOf(name))
    if (raw != null) return JSON.parse(raw)
  } catch {
    /* fall through to default */
  }
  return structuredClone(DEFAULTS[name])
}

// Read a value. Always returns something usable — the stored value if present
// and valid, otherwise a fresh copy of the default for that key.
export function get(name) {
  const fallback = structuredClone(DEFAULTS[name])
  let value = fallback
  let raw = null
  try {
    raw = localStorage.getItem(keyOf(name))
    if (raw != null) {
      const parsed = JSON.parse(raw)
      if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
        // Object store: merge over defaults so new fields appear after an update,
        // but only if the stored value is itself a plain object (corruption to an
        // array/primitive under iOS eviction falls back to a clean default).
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          quarantine(name, raw)
          value = fallback
        } else {
          value = { ...fallback, ...parsed }
        }
      } else if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        quarantine(name, raw) // array store corrupted to a non-array
        value = fallback
      } else {
        value = parsed
      }
    }
  } catch (err) {
    console.warn(`[storage] could not read "${name}", using default`, err)
    if (raw != null) quarantine(name, raw)
    value = fallback
  }
  // Final checks-and-balances pass: clamp/cap/drop anything out of shape.
  return sanitize(name, value)
}

// Write a value. Returns the value so callers can chain.
//
// `opts.silent` skips the change notification — the sync engine uses it when it
// applies data pulled from the server, so a pull can't echo back out as a push.
export function set(name, value, opts = {}) {
  const announce = !opts.silent && subscribers.size > 0
  const prev = announce ? readRaw(name) : undefined
  try {
    localStorage.setItem(keyOf(name), JSON.stringify(value))
  } catch (err) {
    // Quota or private-mode failures shouldn't crash the app — but they must
    // SURFACE: the user believes this write is in the book.
    console.warn(`[storage] could not write "${name}"`, err)
    raiseAlert('write-failed', name)
  }
  if (announce) {
    for (const fn of subscribers) {
      try {
        fn(name, value, prev)
      } catch (err) {
        console.warn('[storage] write subscriber failed', err)
      }
    }
  }
  return value
}

// Read, transform, write — the common case.
export function update(name, fn) {
  return set(name, fn(get(name)))
}

// Everything, as one object — for the Settings "export all data" download (Phase 2).
export function exportAll() {
  const out = { exportedAt: nowISO(), schemaVersion: SCHEMA_VERSION, data: {} }
  for (const name of Object.keys(DEFAULTS)) out.data[name] = get(name)
  // Raw Handover drafts (untransformed input — possibly a relapse confession)
  // are deliberately kept OUT of a portable backup that could land in iCloud /
  // Files / a shared file. Considerations (derived, never quoting the raw words)
  // stay. Drafts are meant to be surrendered, not archived.
  if (out.data.handover) out.data.handover = { ...out.data.handover, drafts: [] }
  return out
}

// Replace everything from an exported blob (used by import / future sync).
export function importAll(blob) {
  if (!blob || !blob.data) return false
  for (const name of Object.keys(DEFAULTS)) {
    if (!(name in blob.data)) continue
    // Drafts are DEVICE-PRIVATE by construction: exportAll strips them, so a
    // backup's handover always carries drafts:[]. Writing that verbatim used to
    // delete the live device's drafts on restore — possibly a relapse
    // confession, gone from the surface labeled fail-soft. The current device's
    // drafts survive an import; everything else in the slice is replaced.
    if (name === 'handover') {
      const current = get('handover')
      set('handover', { ...blob.data.handover, drafts: current?.drafts || [] })
      continue
    }
    set(name, blob.data[name])
  }
  return true
}

// The "wipe all data" button (double-confirmed in the UI). Clears the whole book
// AND every behavioral sidecar under the lockedin: prefix — the Guardian's
// learned danger-hour histogram + urge history (__guardian), engagement/metrics
// telemetry, the sync queue, the survey, share milestones, cached layout, etc.
// A "fresh start" must not leave a profile of the user's worst hours behind on a
// shared or handed-down phone. The lone survivor is the entitlement (__coach):
// it's Apple's truth, not the user's data, so a data wipe must not forfeit a paid
// subscription (and refreshEntitlement re-mirrors it on next launch anyway).
export function wipeAll() {
  const keep = new Set([keyOf('__coach')])
  const doomed = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && !keep.has(k)) doomed.push(k)
    }
  } catch {
    /* enumeration unavailable — fall back to the known model keys below */
  }
  // Fallback: if enumeration found nothing (or threw), at least clear the model.
  if (!doomed.length) for (const name of Object.keys(DEFAULTS)) doomed.push(keyOf(name))
  for (const k of doomed) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
