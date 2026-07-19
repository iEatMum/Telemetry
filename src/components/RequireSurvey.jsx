// RequireSurvey.jsx — the intake gate.
//
// The app is unusable without a survey baseline: the AI Architect (P4.2) and the
// behavioral streak engine both read it. This wrapper hard-gates on its absence,
// checking two sources cheapest-first, exactly as the spec calls for — "the local
// profile OR the database session state reflects a null survey baseline":
//   1. LOCAL   — a survey written on this device (instant, offline-first).
//   2. DATABASE— a returning user on a fresh device: their user_profile row.
// Only when BOTH are empty do we route into Onboarding.
//
// AVE (Anti-Vulnerability Engineering): a network failure must never lock a real
// user out — a signed-in probe that errors falls through to the local-first deck.

import { useEffect, useState } from 'react'
import Onboarding from '../pages/Onboarding.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { latestSnapshot, restoreSnapshot } from '../lib/snapshots.js'

const SURVEY_KEY = 'lockedin:__survey'

// Synchronous local read. ONLY the raw survey blob counts as "interviewed".
// There used to be a fallback here — any settings slice carrying a streakModel
// passed the gate — but that let stale data from an old build wave a user past
// onboarding: the app never asked its questions, then dealt a deck calibrated
// to nobody. The one case the fallback served (returning user, fresh device,
// settings hydrated by sync) is already covered by the async DB probe below,
// which fetches the survey itself and re-seeds this blob.
function hasLocalSurvey() {
  try {
    return !!localStorage.getItem(SURVEY_KEY)
  } catch {
    return false
  }
}

export default function RequireSurvey({ children }) {
  // 'ok' resolves synchronously; only a signed-in miss needs the async DB probe.
  const [state, setState] = useState(() => (hasLocalSurvey() ? 'ok' : 'checking'))

  useEffect(() => {
    if (state !== 'checking') return
    let alive = true
    ;(async () => {
      // No backend / no session → nothing to hydrate; gate straight to intake.
      if (!isSupabaseConfigured || !supabase) return alive && setState('need')
      try {
        // getSession is a LOCAL read (no round-trip) — getUser here meant any
        // persisted session on a flaky connection blocked the entire boot,
        // crisis nav included, for the OS fetch timeout. And the profile fetch
        // races a 4s clock: past it we take the same fallback the catch below
        // already documents — interview rather than hang (P1).
        const { data: sess } = await supabase.auth.getSession()
        const user = sess?.session?.user
        if (!user) return alive && setState('need')
        const timeout = new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 4000))
        const probe = supabase.from('user_profile').select('survey').eq('user_id', user.id).maybeSingle()
        const res = await Promise.race([probe, timeout])
        if (res.timedOut) return alive && setState('need')
        const { data, error } = res
        if (error || !data?.survey) return alive && setState('need')
        // Returning user on a fresh device: seed the local marker so future loads
        // pass instantly, then let them in.
        try {
          localStorage.setItem(SURVEY_KEY, JSON.stringify(data.survey))
        } catch {
          /* quota — the DB stays source of truth */
        }
        if (alive) setState('ok')
      } catch {
        // Offline / transient with NO local survey: onboarding is the only
        // surface that works from here (it's fully offline), and dropping into
        // a deck with no baseline is the exact state this gate exists to
        // prevent. AVE still holds — nobody is locked out, they're interviewed.
        if (alive) setState('need')
      }
    })()
    return () => {
      alive = false
    }
  }, [state])

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <span className="animate-pulse-accent font-clock text-[0.6875rem] uppercase tracking-widest2">
          Syncing profile…
        </span>
      </div>
    )
  }
  if (state === 'need') return <MaybeRestore />
  return children
}

// The empty-boot backstop (P1 "the book survives"): a missing survey on a device
// that HAS a sandbox snapshot is almost never a new user — it's iOS having
// purged WKWebView storage out from under an existing one. Sending that person
// back through onboarding silently discards their whole record. So before the
// interview, one async peek at the sandbox: if a snapshot exists, offer it.
// A genuinely new install has no snapshot and never sees this (the web build
// short-circuits the same way — latestSnapshot() is null off-native).
function MaybeRestore() {
  const [snap, setSnap] = useState(undefined) // undefined=looking · null=none → onboard
  useEffect(() => {
    let alive = true
    Promise.race([latestSnapshot(), new Promise((r) => setTimeout(() => r(null), 6000))]).then(
      (s) => alive && setSnap(s),
      () => alive && setSnap(null)
    )
    return () => {
      alive = false
    }
  }, [])

  if (snap === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <span className="animate-pulse-accent font-clock text-[0.6875rem] uppercase tracking-widest2">
          Opening the book…
        </span>
      </div>
    )
  }
  if (snap === null) return <Onboarding />

  const restore = () => {
    if (restoreSnapshot(snap)) window.location.reload()
    else setSnap(null) // nothing restorable after all — interview as normal
  }
  const day = snap.day || (snap.at || '').slice(0, 10)
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-ink">
      <div className="w-full max-w-[420px]">
        <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">The book was found</span>
        <h1 className="mt-3 text-[1.625rem] font-semibold leading-tight">
          This phone holds a copy of your record from {day}.
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          The app’s storage came up empty — that can happen when iOS clears space — but your book was kept safe
          on this device. Restore it and pick up where you left off, or start a new one.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={restore}
            className="min-h-[48px] rounded-md bg-accent px-6 font-clock text-[0.8125rem] font-semibold uppercase tracking-widest2 text-accent-ink"
          >
            Restore my book
          </button>
          <button
            type="button"
            onClick={() => setSnap(null)}
            className="min-h-[44px] rounded-md border border-line px-6 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted"
          >
            Start fresh instead
          </button>
        </div>
      </div>
    </div>
  )
}
