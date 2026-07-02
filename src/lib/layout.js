// layout.js — loads the active Server-Driven UI payload, offline-first (P3.3).
//
// Same shape of problem as record.js: a one-direction READ of server data the
// client can't author (ui_layouts is SELECT-only for the client; the architect
// edge function writes it under the service role — see 0006_generative_ui.sql).
// So there's no push, no dirty queue, no conflict — just fetch, cache, render.
//
// Offline-first + fail-soft, in priority order:
//   server (this session) → sidecar cache → bundled defaultLayout.json
// The app ALWAYS has a layout to render, even with no backend, no session, no
// network, or before migration 0006 has been run. Everything is normalized
// through uiSchema so a malformed payload can never reach the renderer.

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { normalizeLayout } from './uiSchema.js'
import defaultLayout from './defaultLayout.json'

const CACHE_KEY = 'lockedin:__layout' // sidecar — display only, never synced/exported

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to the bundled default */
  }
  return null
}

function saveCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode — the live payload still renders this session */
  }
}

// One read of the user's active layout. RLS scopes it to the signed-in user, so
// there's no filter to pass (the client couldn't widen it if it tried), and the
// table grants SELECT only — this can never write. Returns the raw payload, or a
// reason it couldn't (no backend / no active row / error) so the caller falls back.
export async function fetchActiveLayout() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local', payload: null }
  const { data, error } = await supabase
    .from('ui_layouts')
    .select('payload, schema_version, profile_version')
    .eq('is_active', true)
    .maybeSingle()
  if (error) return { ok: false, reason: 'error', error, payload: null }
  return { ok: true, payload: data?.payload || null }
}

// The best layout available synchronously, right now: a cached server payload if
// we have one, otherwise the bundled default. Returns { layout, source }.
function pickInitial() {
  const cached = loadCache()
  if (cached) return { layout: normalizeLayout(cached), source: 'cache' }
  return { layout: normalizeLayout(defaultLayout), source: 'default' }
}

// React binding. Renders instantly from cache/default, then upgrades to the
// server payload when it arrives. `source` is 'default' | 'cache' | 'server';
// `status` is 'local' | 'loading' | 'ready' | 'error' (a coarse, honest signal).
export function useLayout() {
  const initial = pickInitial()
  const [layout, setLayout] = useState(initial.layout)
  const [source, setSource] = useState(initial.source)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'local')

  useEffect(() => {
    let active = true
    if (!isSupabaseConfigured) {
      setStatus('local')
      return
    }
    ;(async () => {
      const res = await fetchActiveLayout()
      if (!active) return
      if (res.ok && res.payload) {
        setLayout(normalizeLayout(res.payload))
        setSource('server')
        setStatus('ready')
        saveCache(res.payload)
      } else if (res.reason === 'local') {
        setStatus('local')
      } else {
        // No active layout yet, or the fetch failed (offline / pre-migration).
        // Keep the cache/default already on screen — never blank.
        setStatus(res.reason === 'error' ? 'error' : 'ready')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return { layout, source, status }
}
