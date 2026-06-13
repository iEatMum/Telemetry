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

// Read a value. Always returns something usable — the stored value if present
// and valid, otherwise a fresh copy of the default for that key.
export function get(name) {
  const fallback = structuredClone(DEFAULTS[name])
  let value = fallback
  try {
    const raw = localStorage.getItem(keyOf(name))
    if (raw != null) {
      const parsed = JSON.parse(raw)
      if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
        // Object store: merge over defaults so new fields appear after an update,
        // but only if the stored value is itself a plain object (corruption to an
        // array/primitive under iOS eviction falls back to a clean default).
        value = !parsed || typeof parsed !== 'object' || Array.isArray(parsed) ? fallback : { ...fallback, ...parsed }
      } else if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        value = fallback // array store corrupted to a non-array
      } else {
        value = parsed
      }
    }
  } catch (err) {
    console.warn(`[storage] could not read "${name}", using default`, err)
    value = fallback
  }
  // Final checks-and-balances pass: clamp/cap/drop anything out of shape.
  return sanitize(name, value)
}

// Write a value. Returns the value so callers can chain.
export function set(name, value) {
  try {
    localStorage.setItem(keyOf(name), JSON.stringify(value))
  } catch (err) {
    // Quota or private-mode failures shouldn't crash the app.
    console.warn(`[storage] could not write "${name}"`, err)
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
  return out
}

// Replace everything from an exported blob (used by import / future sync).
export function importAll(blob) {
  if (!blob || !blob.data) return false
  for (const name of Object.keys(DEFAULTS)) {
    if (name in blob.data) set(name, blob.data[name])
  }
  return true
}

// The "wipe all data" button (double-confirmed in the UI).
export function wipeAll() {
  for (const name of Object.keys(DEFAULTS)) {
    try {
      localStorage.removeItem(keyOf(name))
    } catch {
      /* ignore */
    }
  }
}
