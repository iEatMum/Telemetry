// sync.js — the offline-first sync engine. Phase 3, Sprint 3.
//
// THE ONE RULE: the UI's reads and writes stay instant. storage.js still hits
// localStorage synchronously; syncing is something that happens *afterward*, in
// the background, and is allowed to fail silently. (Lally 2010 — the habit
// reward loop can never wait on a network round-trip.)
//
// HOW IT WORKS
//   • Each local slice maps to a Supabase table (SLICES below).
//   • storage.js calls us after every write (via storage.subscribe). We diff
//     what changed, stamp those records with a client `updated_at`, mark them
//     dirty, and schedule a debounced background push.
//   • Records are keyed by their stable id (base-36 / uuid) / day / week, so a
//     re-push is an idempotent UPSERT — never a duplicate.
//   • Conflicts resolve Last-Write-Wins on `updated_at`: the newer timestamp
//     wins on the server (a guard trigger) and on pull (mergeInto below).
//   • Not configured / not signed in / offline → every entry point is a quiet
//     no-op. The app stays 100% usable; sync just catches up later. (AVE: one
//     failure can never cascade into a lockout.)
//
// Sync bookkeeping (per-record timestamps + the dirty queue) lives in its own
// localStorage key, NOT inside the app's data — so the data shapes stay pristine
// and validate.js never has to know sync exists.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import * as storage from './storage.js'

// local slice  ->  how it lives on the server
const SLICES = {
  settings: { table: 'settings', kind: 'singleton' },
  streak: { table: 'streak_state', kind: 'singleton' },
  reading: { table: 'reading_state', kind: 'singleton' },
  income: { table: 'income', kind: 'collection' }, // [{ id, ... }]
  runs: { table: 'runs', kind: 'collection' },
  tasks: { table: 'tasks', kind: 'collection' },
  sprints: { table: 'sprints', kind: 'composite', keyField: 'date' },
  reviews: { table: 'reviews', kind: 'composite', keyField: 'weekOf' },
  checklist: { table: 'checklist', kind: 'composite' }, // object keyed by day
  wellness: { table: 'wellness', kind: 'composite' }, // object keyed by day
}

const nowISO = () => new Date().toISOString()
const asArr = (v) => (Array.isArray(v) ? v : [])

// ---- bookkeeping (sidecar; the UI never reads this) ----------------------
const META_KEY = 'lockedin:__sync'
function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through */
  }
  return { stamp: {}, dirty: {}, pulledAt: null }
}
let meta = loadMeta()
function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* quota — fine, we re-derive on next write */
  }
}
function stampFor(name) {
  if (!meta.stamp[name]) meta.stamp[name] = {}
  return meta.stamp[name]
}
function dirtyFor(name) {
  if (!meta.dirty[name]) meta.dirty[name] = {}
  return meta.dirty[name]
}

// ---- translation: local slice value <-> a Map of key -> record body ------
function records(name, value) {
  const s = SLICES[name]
  const map = new Map()
  if (value == null) return map
  if (s.kind === 'singleton') {
    map.set('_self', value)
  } else if (s.kind === 'collection') {
    for (const el of asArr(value)) if (el && el.id != null) map.set(String(el.id), el)
  } else if (s.keyField) {
    // composite array (sprints, reviews)
    for (const el of asArr(value)) {
      const k = el && el[s.keyField]
      if (k != null) map.set(String(k), el)
    }
  } else {
    // composite object (checklist: { 'YYYY-MM-DD': {...} })
    for (const [k, body] of Object.entries(value)) map.set(k, body)
  }
  return map
}

function reassemble(name, map) {
  const s = SLICES[name]
  if (s.kind === 'singleton') return map.get('_self') ?? structuredClone(storage.DEFAULTS[name])
  if (s.kind === 'collection' || s.keyField) return [...map.values()]
  const obj = {}
  for (const [k, body] of map) obj[k] = body
  return obj
}

function diff(name, prev, next) {
  const before = records(name, prev)
  const after = records(name, next)
  const changed = []
  const removed = []
  for (const [k, body] of after) {
    const old = before.get(k)
    if (old === undefined || JSON.stringify(old) !== JSON.stringify(body)) changed.push(k)
  }
  for (const k of before.keys()) if (!after.has(k)) removed.push(k)
  return { changed, removed }
}

// ---- server row shapes ---------------------------------------------------
function rowFor(name, key, body, updatedAt, uid) {
  const s = SLICES[name]
  if (s.kind === 'singleton') return { user_id: uid, data: body, updated_at: updatedAt }
  if (s.kind === 'collection') return { id: key, user_id: uid, data: body, updated_at: updatedAt }
  return { user_id: uid, k: key, data: body, updated_at: updatedAt } // composite
}
function onConflict(kind) {
  if (kind === 'singleton') return 'user_id'
  if (kind === 'collection') return 'id'
  return 'user_id,k'
}
function serverKey(s, row) {
  if (s.kind === 'collection') return String(row.id)
  if (s.kind === 'composite') return String(row.k)
  return '_self'
}

// ---- engine state --------------------------------------------------------
let started = false
let session = null
let applyListener = null
let pushTimer = null
let pushing = false
let pushQueued = false
let storageUnsub = null
let authSub = null
let onlineHandler = null

function ready() {
  return (
    isSupabaseConfigured &&
    !!session &&
    (typeof navigator === 'undefined' || navigator.onLine !== false)
  )
}

// ---- local write -> stamp + queue ----------------------------------------
function onLocalWrite(name, next, prev) {
  if (!(name in SLICES)) return
  const { changed, removed } = diff(name, prev, next)
  if (!changed.length && !removed.length) return
  const at = nowISO()
  const st = stampFor(name)
  const dt = dirtyFor(name)
  for (const k of changed) {
    st[k] = at
    dt[k] = 'put'
  }
  for (const k of removed) {
    st[k] = at
    dt[k] = 'del'
  }
  saveMeta()
  schedulePush()
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushNow()
  }, 800)
}

// ---- push: send the dirty queue up ---------------------------------------
async function pushNow() {
  if (!ready()) return
  if (pushing) {
    pushQueued = true
    return
  }
  pushing = true
  try {
    const uid = session.user.id
    for (const name of Object.keys(SLICES)) {
      const dt = meta.dirty[name]
      if (!dt || !Object.keys(dt).length) continue
      const s = SLICES[name]
      const current = records(name, storage.get(name))
      const st = stampFor(name)
      const puts = []
      const dels = []
      for (const k of Object.keys(dt)) {
        if (dt[k] === 'del' || !current.has(k)) dels.push(k)
        else puts.push(rowFor(name, k, current.get(k), st[k] || nowISO(), uid))
      }
      if (puts.length) {
        const { error } = await supabase.from(s.table).upsert(puts, { onConflict: onConflict(s.kind) })
        if (error) throw error
        for (const row of puts) delete dt[serverKey(s, row)]
      }
      for (const k of dels) {
        let q = supabase.from(s.table).delete()
        if (s.kind === 'collection') q = q.eq('id', k)
        else if (s.kind === 'composite') q = q.eq('user_id', uid).eq('k', k)
        else q = q.eq('user_id', uid)
        const { error } = await q
        if (error) throw error
        delete dt[k]
      }
      if (!Object.keys(dt).length) delete meta.dirty[name]
    }
    saveMeta()
  } catch (err) {
    // Leave the dirty queue intact; the next write/online/login retries it.
    console.warn('[sync] push failed (will retry):', err?.message || err)
  } finally {
    pushing = false
    if (pushQueued) {
      pushQueued = false
      schedulePush()
    }
  }
}

// ---- pull: fold the server's rows back in, Last-Write-Wins ---------------
async function pullAll() {
  if (!ready()) return
  const applied = []
  for (const name of Object.keys(SLICES)) {
    const s = SLICES[name]
    const { data: rows, error } = await supabase.from(s.table).select('*')
    if (error) {
      console.warn('[sync] pull failed for', name, '-', error.message)
      continue
    }
    if (mergeInto(name, rows || [])) applied.push(name)
  }
  meta.pulledAt = nowISO()
  saveMeta()
  if (applied.length && applyListener) applyListener(applied)
}

// Returns true if local data actually changed (so the store re-reads it).
function mergeInto(name, rows) {
  const s = SLICES[name]
  const merged = records(name, storage.get(name))
  const st = stampFor(name)
  const dt = meta.dirty[name] || {}
  const seen = new Set()
  let changed = false

  for (const row of rows) {
    const key = serverKey(s, row)
    seen.add(key)
    const serverAt = row.updated_at
    const localAt = st[key]
    // A pending local change at least as new as the server's wins — keep ours.
    if (dt[key] && (!serverAt || (localAt && localAt >= serverAt))) continue
    if (!localAt || (serverAt && serverAt > localAt)) {
      merged.set(key, row.data)
      st[key] = serverAt
      if (dt[key]) delete dt[key] // server superseded our stale pending change
      changed = true
    }
  }

  // Records we hold locally that the server didn't return.
  for (const key of [...merged.keys()]) {
    if (seen.has(key)) continue
    const previouslySynced = !!st[key]
    if (s.kind !== 'singleton' && previouslySynced && !dt[key]) {
      // Previously synced, no pending local edit, now absent => deleted on
      // another device. Mirror the delete. (Singletons are never deleted —
      // absence just means "not created on the server yet".)
      merged.delete(key)
      delete st[key]
      changed = true
    } else if (!dt[key]) {
      // Local-only (made offline / before first sync) — keep it and queue a push.
      if (!previouslySynced) st[key] = nowISO()
      dirtyFor(name)[key] = 'put'
    }
  }

  if (!changed) return false
  storage.set(name, reassemble(name, merged), { silent: true })
  return true
}

function cycle() {
  // Pull first (so a fresh device hydrates), then push anything still local-only.
  pullAll()
    .then(pushNow)
    .catch((e) => console.warn('[sync] cycle failed:', e?.message || e))
}

// ---- realtime: pull the instant a sibling device writes ------------------
// 0010_realtime.sql opts the synced tables into the `supabase_realtime`
// publication; here we subscribe. RLS scopes the stream to the user's OWN rows,
// so any event means "one of my records changed elsewhere" → pull it in through
// the same Last-Write-Wins merge. Debounced so a burst of row changes (or the
// echo of our own push) collapses into a single pull instead of a storm.
let realtimeChannel = null
let realtimePullTimer = null

function scheduleRealtimePull() {
  if (realtimePullTimer) clearTimeout(realtimePullTimer)
  realtimePullTimer = setTimeout(() => {
    realtimePullTimer = null
    if (!ready()) return
    pullAll().catch((e) => console.warn('[sync] realtime pull failed:', e?.message || e))
  }, 500)
}

function subscribeRealtime() {
  if (realtimeChannel || !isSupabaseConfigured || !session) return
  // No table filter: listen across the whole public schema and let RLS decide
  // which rows we're allowed to see (matches SLICES exactly under the policies).
  realtimeChannel = supabase
    .channel('sync')
    .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRealtimePull)
    .subscribe()
}

function unsubscribeRealtime() {
  if (realtimePullTimer) {
    clearTimeout(realtimePullTimer)
    realtimePullTimer = null
  }
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

// ---- lifecycle -----------------------------------------------------------
// Idempotent: safe to call on every StoreProvider mount (React StrictMode
// invokes effects more than once in dev). The latest onApply always wins.
export function start(onApply) {
  if (onApply) applyListener = onApply
  if (started) return
  if (!isSupabaseConfigured) return // local-only build: sync never runs
  started = true

  storageUnsub = storage.subscribe(onLocalWrite)

  supabase.auth.getSession().then(({ data }) => {
    session = data.session
    if (session) {
      cycle()
      subscribeRealtime() // stream sibling-device writes for the rest of the session
    }
  })

  const { data } = supabase.auth.onAuthStateChange((_event, s) => {
    const wasSignedIn = !!session
    session = s
    if (s && !wasSignedIn) {
      cycle() // just signed in: pull, then push local-only
      subscribeRealtime()
    } else if (!s && wasSignedIn) {
      unsubscribeRealtime() // signed out: drop the channel (RLS token is gone)
    }
  })
  authSub = data.subscription

  if (typeof window !== 'undefined') {
    onlineHandler = () => {
      if (session) cycle()
    }
    window.addEventListener('online', onlineHandler)
  }
}

// Teardown — not used in the app's normal lifetime (sync is a singleton), but
// handy for tests.
export function stop() {
  if (storageUnsub) storageUnsub()
  if (authSub) authSub.unsubscribe()
  if (onlineHandler && typeof window !== 'undefined') window.removeEventListener('online', onlineHandler)
  unsubscribeRealtime()
  storageUnsub = authSub = onlineHandler = null
  started = false
}

// Manual trigger (e.g. a future "Sync now" button) + a status read-out.
export function syncNow() {
  cycle()
}
export function status() {
  return {
    configured: isSupabaseConfigured,
    signedIn: !!session,
    online: ready(),
    pulledAt: meta.pulledAt,
  }
}

/**
 * Read-only: how many local records are queued (dirty) awaiting a push. The
 * status-strip chip reads this on storage events — data, not a warning; it
 * never touches sync state.
 */
export function queuedCount() {
  let n = 0
  for (const keys of Object.values(meta.dirty || {})) n += Object.keys(keys).length
  return n
}

// Exposed for unit tests only — NOT part of the public API. Lets tests drive the
// pure translation + LWW merge without a live Supabase or a browser.
export const _internals = {
  records,
  diff,
  reassemble,
  mergeInto,
  onLocalWrite,
  getMeta: () => meta,
  resetMeta: () => {
    meta = { stamp: {}, dirty: {}, pulledAt: null }
  },
}
