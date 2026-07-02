// record.js — The Record: a READ-ONLY window onto the Referee's witnessed
// verdicts (the `checkpoints` table). This is the "Witnessed Ledger."
//
// WHY THIS LIVES BESIDE sync.js, NOT INSIDE IT
//   sync.js is a two-way, last-write-wins engine for CLAIMED data — the things
//   you tell the app about yourself (streak, checklist, tasks…). It pushes local
//   edits up and merges server edits down, with a dirty queue and conflict rules.
//
//   Checkpoints are the opposite kind of data. They are WITNESSED, not claimed:
//   written only by the Referee edge function under the service role, guarded by
//   an RLS policy that grants the client SELECT and nothing else (see
//   0002_checkpoints.sql — there is deliberately no insert/update/delete policy).
//   The client can NEVER write them, so there is no dirty queue, no push, no
//   conflict to resolve — the server is the sole source of truth.
//
//   Routing that through the read/write sync path would be wrong technically (the
//   push/delete/merge logic doesn't apply) and wrong in spirit: witnessed data
//   must not travel the same road as the data you can edit. That separation is
//   the whole point of the pivot, so we make it structural.
//
//   The Record is therefore a one-direction read: fetch the latest verdicts, show
//   them, and keep a DISPLAY-ONLY snapshot in a sidecar cache so the ledger isn't
//   blank offline. Nothing in this file ever mutates a checkpoint.

import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const CACHE_KEY = 'lockedin:__record' // sidecar — NOT app data, never synced/exported
const DEFAULT_LIMIT = 100

// Only the columns the ledger renders — keeps the cache small and intent clear.
const COLUMNS = 'id, kind, target, actual, at, verdict, created_at'

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* a blank ledger is a fine fallback */
  }
  return { fetchedAt: null, rows: [] }
}

function saveCache(snapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota / private mode — the live fetch still works this session */
  }
}

// One read of the witnessed log, newest first. Ordered by created_at to match
// the table's index (checkpoints_user_idx). RLS scopes the result to the signed-in
// user, so there is no user filter to pass — the client couldn't widen it if it
// tried. This function only ever reads.
export async function fetchRecord({ limit = DEFAULT_LIMIT } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: 'local', rows: [] }
  }
  const { data, error } = await supabase
    .from('checkpoints')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { ok: false, reason: 'error', error, rows: [] }
  return { ok: true, rows: data || [] }
}

// React binding for the ledger screen. Returns the rows plus a coarse status the
// UI can speak to honestly:
//   'local'   — no backend wired up (Phase 1/2 style) → the ledger explains itself
//   'loading' — first fetch in flight (a cached snapshot may already be showing)
//   'ready'   — live rows from the server
//   'error'   — fetch failed (offline, etc.) → keep showing the cached snapshot
export function useRecord({ limit = DEFAULT_LIMIT } = {}) {
  const initial = loadCache()
  const [rows, setRows] = useState(initial.rows)
  const [fetchedAt, setFetchedAt] = useState(initial.fetchedAt)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'local')

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus('local')
      return
    }
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading'))
    const res = await fetchRecord({ limit })
    if (res.ok) {
      const at = new Date().toISOString()
      setRows(res.rows)
      setFetchedAt(at)
      setStatus('ready')
      saveCache({ fetchedAt: at, rows: res.rows })
    } else if (res.reason === 'local') {
      setStatus('local')
    } else {
      setStatus('error') // leave the cached rows on screen
    }
  }, [limit])

  // Fetches whenever the screen mounts (the tab is opened). No manual refresh
  // button — that would be chrome the ledger is meant to be free of.
  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, fetchedAt, status, refresh }
}
