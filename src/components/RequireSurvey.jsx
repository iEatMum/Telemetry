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
import * as storage from '../lib/storage.js'

const SURVEY_KEY = 'lockedin:__survey'

// Synchronous local read — either the raw survey blob or, for a returning device
// hydrated by sync.js, the survey-derived streakModel that rides the settings slice.
function hasLocalSurvey() {
  try {
    if (localStorage.getItem(SURVEY_KEY)) return true
  } catch {
    /* storage disabled — fall through to the settings check */
  }
  try {
    return !!storage.get('settings')?.streakModel
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
        const { data: sess } = await supabase.auth.getUser()
        if (!sess?.user) return alive && setState('need')
        const { data, error } = await supabase
          .from('user_profile')
          .select('survey')
          .eq('user_id', sess.user.id)
          .maybeSingle()
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
        // Offline / transient — don't trap a real user behind a network failure.
        if (alive) setState('ok')
      }
    })()
    return () => {
      alive = false
    }
  }, [state])

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <span className="animate-pulse-accent font-clock text-[11px] uppercase tracking-widest2">
          Syncing profile…
        </span>
      </div>
    )
  }
  if (state === 'need') return <Onboarding />
  return children
}
