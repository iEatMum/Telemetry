// storage.js — the ONE place the app talks to localStorage.
//
// Every screen reads and writes through get()/set()/update() here. Nothing else
// touches localStorage directly. That's the whole point: when Phase 3 swaps in
// Supabase, this is the only file that changes.
//
// Shape of the data lives in DEFAULTS below — it doubles as documentation.

const PREFIX = 'lockedin:'
export const SCHEMA_VERSION = 1

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
    moneyGoal: 3500,
    partnerName: '',
    partnerPhone: '',
    reportDate: '2026-08-15', // "Report to Fresno State" — editable in Settings
    focusShortcutName: 'Sprint', // iOS Shortcut the Sprint screen can trigger
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
  income: [], // [{ id, date, amount, source }]                  (Phase 2)
  runs: [], // [{ id, date, type, miles, minutes, rpe, note }]   (Phase 2)
  tasks: [], // [{ id, title, cat, recurrence, nextDue, done, history:[] }] (Phase 2)
  reviews: [], // [{ weekOf, stats:{}, worked, broke, oneChange }] (Phase 2)

  // Morning protocol checklist, keyed by app-day ('YYYY-MM-DD', rolls at 3am).
  // { '2026-06-11': { wake:false, prayer:false, run:false, phone:false } }
  checklist: {},
}

function keyOf(name) {
  return PREFIX + name
}

// Read a value. Always returns something usable — the stored value if present
// and valid, otherwise a fresh copy of the default for that key.
export function get(name) {
  const fallback = structuredClone(DEFAULTS[name])
  try {
    const raw = localStorage.getItem(keyOf(name))
    if (raw == null) return fallback
    const parsed = JSON.parse(raw)
    // For object-shaped stores, merge over defaults so new fields appear
    // automatically after an update without wiping a user's existing data.
    if (
      fallback &&
      typeof fallback === 'object' &&
      !Array.isArray(fallback)
    ) {
      return { ...fallback, ...parsed }
    }
    return parsed
  } catch (err) {
    console.warn(`[storage] could not read "${name}", using default`, err)
    return fallback
  }
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
