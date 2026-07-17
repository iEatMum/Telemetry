// guardianSeed.js — day-0 PRIORS for the drift sentinel, derived from onboarding.
//
// guardianEngine.js is built to learn a user's danger hours from real urge
// moments — but its heaviest vector (temporalRisk, weight 25) and the pre-window
// notification both stay DARK until ≥3 moments are logged, i.e. through exactly
// the fragile first week. This module converts the approved survey answers into
// a `seed` the engine reads as a PRIOR, and writes it into the SAME sidecar key
// guardianEngine owns (lockedin:__guardian, under `.seed`).
//
// BINDING CONSTRAINTS (the approved §2 contract — do not loosen):
//   • Priors, not verdicts. A survey window fills the {window} token and can
//     nudge WATCH readiness, but assessDrift() only counts OBSERVED evidence
//     toward the CRITICAL gate — a seed can never force critical.
//   • One push/day is unchanged. The seed re-aims the single daily push
//     (e.g. ghost → reserve it for the re-entry cue); it never adds one.
//   • The slip-INSTANT line stays one compassionate voice for everyone
//     (toneEngine hard rule 1). `slipRegister` only arms the NEXT-DAY re-entry
//     push, the subsequent-day drift register, and the cross-mechanic SMS
//     framing — never urge.slipped.
//   • Observation overrides the prior. `source:'survey'` is stamped so the
//     moment real telemetry exists, the histogram wins.

// Mirrors guardianEngine.js's private KEY (kept as a literal to avoid a circular
// import; both must point at the same sidecar).
const GUARDIAN_KEY = 'lockedin:__guardian'

// dangerWindow enum → a synthetic peak hour (0..23.99). post-wake is relative to
// the user's own wake time; the rest are fixed circadian anchors.
const WINDOW_HOURS = { 'midday-slump': 14.0, evening: 20.0, 'late-night': 23.0 }

function wakeHour(wakeTime) {
  if (typeof wakeTime !== 'string') return 6
  const [h, m] = wakeTime.split(':').map(Number)
  if (!Number.isFinite(h)) return 6
  return Math.min(23.5, h + (Number.isFinite(m) ? m / 60 : 0))
}

/**
 * Pure: the guardian seed for a completed onboarding `answers` slice. Only emits
 * the fields the answers justify — an absent answer contributes nothing.
 */
export function deriveGuardianSeed(answers = {}) {
  const seed = { source: 'survey' }

  // dangerWindow → temporal prior (fills {window} + arms the pre-window push).
  const dw = answers.dangerWindow
  let peakHour = null
  if (dw === 'post-wake') peakHour = Math.min(23.99, wakeHour(answers.wakeTime) + 1)
  else if (dw in WINDOW_HOURS) peakHour = WINDOW_HOURS[dw]
  if (peakHour != null) seed.temporalPrior = { peakHour, source: 'survey' }

  // executionRate7d ≤2 → ramp tier: honor the fragile-early-days weighting and
  // reserve the day's push for the morning anchor cue. WATCH only, never critical.
  if (Number.isInteger(answers.executionRate7d) && answers.executionRate7d <= 2) seed.coldStartFloor = true

  // missionConfidence ≤3 → low task-efficacy: force the compassion register and
  // scaffold instead of push (pressure lands as pre-committed
  // punishment on a user who doesn’t believe he can win).
  if (Number.isInteger(answers.missionConfidence) && answers.missionConfidence <= 3) seed.efficacyFloor = true

  // slipResponse → post-RESET register + cross-mechanic framing (never the
  // slip-instant line — that stays one voice per toneEngine hard rule 1).
  if (typeof answers.slipResponse === 'string' && answers.slipResponse) {
    seed.slipRegister = answers.slipResponse
    if (answers.slipResponse === 'ghost') seed.reentryPriority = true
    if (answers.slipResponse === 'critic' || answers.slipResponse === 'spiral') seed.smsReframe = 'action-report'
  }

  // anchorHabit → names the real morning cue ('none' = no anchor to name).
  if (typeof answers.anchorHabit === 'string' && answers.anchorHabit && answers.anchorHabit !== 'none') {
    seed.anchorCue = answers.anchorHabit
  }

  return seed
}

/**
 * Merge the seed into the guardian sidecar without clobbering the engine's own
 * bookkeeping (baselines, invocations, lastBand…). Fail-soft on quota/parse.
 */
export function writeGuardianSeed(seed) {
  try {
    let g = {}
    try {
      const raw = localStorage.getItem(GUARDIAN_KEY)
      if (raw) g = JSON.parse(raw) || {}
    } catch {
      g = {}
    }
    g.seed = seed
    localStorage.setItem(GUARDIAN_KEY, JSON.stringify(g))
    return true
  } catch {
    return false // in-memory only this session; the engine falls back to no prior
  }
}

/** Read just the seed back (null if none / unreadable). */
export function readGuardianSeed() {
  try {
    const raw = localStorage.getItem(GUARDIAN_KEY)
    if (!raw) return null
    return JSON.parse(raw)?.seed || null
  } catch {
    return null
  }
}
