// AuthGate.jsx — decides whether you see the app or the login screen.
//
// Order of operations:
//   1. No Supabase configured?  → render children, no questions asked
//      (local-only mode). This protects the Phase 1/2 build: a missing key must
//      never lock Ian out of his own local data — Marlatt's AVE in practice.
//   2. Configured → check for a cached session (instant, from localStorage),
//      then subscribe to auth changes. No session → <Login/>. Session → app.
//
// All hooks run unconditionally at the top (Rules of Hooks); the branching is in
// the returns. `isSupabaseConfigured` is a build-time constant, so it never
// flips between renders.

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import Login from './Login.jsx'

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-muted text-sm">
      …
    </div>
  )
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  // If there's no backend wired up, we're "ready" immediately and pass through.
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    // Cached session, if any (reads localStorage — resolves basically instantly).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    // Live updates: magic-link return, sign-out, token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!isSupabaseConfigured) return children // local-only mode
  if (!ready) return <Splash /> // brief, to avoid flashing Login at an authed user
  if (!session) return <Login />
  return children
}
