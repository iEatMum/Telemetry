// protocolForge.js — the dynamic "Outlast It" protocol builder.
//
// The old urge screen had five fixed steps. The forge keeps their SHAPE — the
// evidence-backed arc interrupt → downshift → reframe → commit (PSYCHOLOGY.md §2:
// acute exercise cuts cravings, urges crest and pass, the partner text is the
// single highest-leverage feature) — but picks each step from a library using
// the user's own outcome history. A step that has been part of survived
// protocols gets picked more; a step that was on the field for a slip gets
// benched next time. The sequence a user failed on is never dealt verbatim again.
//
// LEARNING LOOP (all existing plumbing, no new tables):
//   • an invocation ({ at, steps, severity }) is logged to the local guardian
//     sidecar when the urge screen opens (guardianEngine.recordInvocation)
//   • a WIN writes the step ids into streak.urgesSurvived via the store's
//     logUrgeSurvived(meta) — that entry SYNCS (streak_state singleton), so wins
//     travel across devices
//   • a LOSS is never self-reported in the moment (nobody logs mid-slip) — it's
//     INFERRED here: an invocation with no win that is followed by a streak
//     reset within ATTRIBUTION_HOURS is counted against its steps
//
// Selection is quiet adaptation, not a slot machine (PSYCHOLOGY.md forbids
// variable-reward reveals): no "NEW challenge unlocked!", the user just gets a
// protocol that slowly fits them better. Exploration is epsilon-greedy with a
// small epsilon — at the tiny n a single user generates (5–30 protocols), the
// Laplace-smoothed mean + forced exclusion of failed steps out-adapts anything
// fancier, and stays explainable.
//
// Pure logic; rng and history are injected so tests are deterministic.

// ── The step library ─────────────────────────────────────────────────────────
// kind: the slot a step can fill. intensity 1..3. `special` marks steps the UI
// renders with custom chrome ('partner' = the one-tap text row). `gate` names a
// survey module that must be on for the step to be dealt.
export const STEP_LIBRARY = [
  // ENVIRONMENT — break line-of-sight with the cue (Fogg friction-raise).
  { id: 'leave-room', kind: 'environment', intensity: 1, label: 'Put the phone down. Leave the room.' },
  { id: 'phone-away', kind: 'environment', intensity: 2, label: 'Phone in another room — all the way, not the next cushion.' },
  { id: 'lights-cold', kind: 'environment', intensity: 2, label: 'Lights on, window open. Change the room so the room changes you.' },

  // INTERRUPT — hard physical pattern-break (Taylor 2007: acute exercise cuts cravings).
  { id: 'pushups-20', kind: 'interrupt', intensity: 2, label: '20 pushups. Now.' },
  { id: 'hard-2min', kind: 'interrupt', intensity: 3, label: 'A hard 2-minute effort — squats, stairs, anything that costs.' },
  { id: 'walk-out-10', kind: 'interrupt', intensity: 1, label: 'Get outside and move for 10 minutes.' },
  { id: 'cold-water', kind: 'interrupt', intensity: 2, label: 'Cold water on your face and wrists — 30 seconds.' },

  // DOWNSHIFT — bring the nervous system down so the wave can pass.
  { id: 'breath-478', kind: 'downshift', intensity: 1, label: 'Breathe 4-7-8, five rounds. In 4, hold 7, out 8.' },
  { id: 'box-breath', kind: 'downshift', intensity: 1, label: 'Box breathing, 2 minutes. In 4, hold 4, out 4, hold 4.' },
  { id: 'surf-it', kind: 'downshift', intensity: 2, label: 'Name it a wave. It crests, it passes — your job is to float, not fight.' },

  // COGNITIVE — reframe while the body settles (implementation intentions).
  { id: 'name-cue', kind: 'cognitive', intensity: 1, label: 'Name the cue out loud: where you are, what you feel, what fired this.' },
  { id: 'play-tape', kind: 'cognitive', intensity: 2, label: 'Play the tape forward: tomorrow morning, both versions. Pick the one you want to wake up as.' },
  { id: 'mission-line', kind: 'cognitive', intensity: 1, label: 'Say the mission. One sentence, why you started. Out loud.' },
  { id: 'verse', kind: 'cognitive', intensity: 1, label: 'Read tonight’s verse slowly, twice.', gate: 'faith' },

  // COMMIT — witnessed accountability (the crown step; Giné 2010, StickK).
  { id: 'text-partner', kind: 'commit', intensity: 2, label: 'Text your partner — before, not after.', special: 'partner' },
  { id: 'write-line', kind: 'commit', intensity: 1, label: 'Write one line in the record: "urge hit, riding it out." Dated. Witnessed by you.' },
]

// Slot templates by severity. High severity front-loads an environment break
// (the phone IS the cue); normal keeps the classic four-beat arc.
const TEMPLATES = {
  normal: ['interrupt', 'downshift', 'cognitive', 'commit'],
  high: ['environment', 'interrupt', 'downshift', 'commit'],
}

const ATTRIBUTION_HOURS = 6 // a reset within this window indicts the protocol
const WIN_WINDOW_MIN = 45 // a survived-log within this window credits it
const EPSILON = 0.15 // exploration rate — small on purpose

// ── Outcome resolution ───────────────────────────────────────────────────────
// Fold the synced streak timeline over the local invocation log to label each
// invocation: 'survived' | 'slipped' | 'open'. Wins may also carry explicit
// step ids (logUrgeSurvived meta), which count even without a local invocation
// (a win logged on another device still teaches this one).
export function resolveOutcomes(invocations = [], streak = {}) {
  const wins = (streak.urgesSurvived || []).map((w) => ({ at: Date.parse(w.at), steps: w.steps })).filter((w) => Number.isFinite(w.at))
  const resets = (streak.resets || []).map((r) => Date.parse(r.at)).filter(Number.isFinite)

  return invocations.map((inv) => {
    const at = Date.parse(inv.at)
    if (!Number.isFinite(at)) return { ...inv, outcome: 'open' }
    const won = wins.some((w) => w.at >= at && w.at - at <= WIN_WINDOW_MIN * 60000)
    if (won) return { ...inv, outcome: 'survived' }
    const slipped = resets.some((r) => r >= at && r - at <= ATTRIBUTION_HOURS * 3600000)
    if (slipped) return { ...inv, outcome: 'slipped' }
    return { ...inv, outcome: 'open' }
  })
}

// Per-step efficacy from labeled history: Laplace-smoothed success rate
// (wins+1)/(wins+losses+2) — an unseen step sits at 0.5, one loss can't zero a
// step, one win can't canonize it. Synced win entries with steps count too.
export function stepStats(invocations = [], streak = {}) {
  const stats = {} // id → { wins, losses }
  const bump = (id, key) => {
    if (!id) return
    if (!stats[id]) stats[id] = { wins: 0, losses: 0 }
    stats[id][key] += 1
  }

  for (const inv of resolveOutcomes(invocations, streak)) {
    if (inv.outcome === 'open') continue
    for (const id of inv.steps || []) bump(id, inv.outcome === 'survived' ? 'wins' : 'losses')
  }
  // Wins synced from other devices (steps recorded on the entry itself) that
  // this device has no invocation for. "Has no invocation" must mean the same
  // thing attribution means: a win falling inside ANY local invocation's
  // WIN_WINDOW was already counted by resolveOutcomes above. The old dedupe
  // compared the win's tap-time timestamp against invocation OPEN times —
  // never equal — so every locally-survived protocol's steps were counted
  // twice and one later loss couldn't correct the Laplace ranking.
  const invTimes = invocations.map((i) => Date.parse(i.at)).filter(Number.isFinite)
  const attributed = (wAt) => invTimes.some((at) => wAt >= at && wAt - at <= WIN_WINDOW_MIN * 60000)
  for (const w of streak.urgesSurvived || []) {
    if (!Array.isArray(w.steps)) continue
    const wAt = Date.parse(w.at)
    if (Number.isFinite(wAt) && attributed(wAt)) continue
    for (const id of w.steps) bump(id, 'wins')
  }

  const out = {}
  for (const [id, s] of Object.entries(stats)) {
    out[id] = { ...s, score: (s.wins + 1) / (s.wins + s.losses + 2) }
  }
  return out
}

// The most recent slipped invocation's step set — these get benched this deal.
export function lastFailedSteps(invocations = [], streak = {}) {
  const labeled = resolveOutcomes(invocations, streak)
  for (let i = labeled.length - 1; i >= 0; i--) {
    if (labeled[i].outcome === 'slipped') return new Set(labeled[i].steps || [])
  }
  return new Set()
}

// ── The forge ────────────────────────────────────────────────────────────────

/**
 * Deal a personalized protocol.
 *   forgeProtocol({ severity, invocations, streak, modules, hasPartner, rng })
 * Returns { steps: [libraryStep...], severity } — 4 steps following the arc.
 * Guarantees: never the exact step set of the last slipped protocol; faith-gated
 * steps only when the module is on; the partner text is ALWAYS the commit step
 * when a partner exists (the crown step is not up for exploration).
 */
export function forgeProtocol({
  severity = 'normal',
  invocations = [],
  streak = {},
  modules = {},
  hasPartner = false,
  rng = Math.random,
} = {}) {
  const template = TEMPLATES[severity] || TEMPLATES.normal
  const stats = stepStats(invocations, streak)
  const benched = lastFailedSteps(invocations, streak)
  const dealt = []

  for (const kind of template) {
    // The crown step: with a partner configured, commit is always the text.
    if (kind === 'commit' && hasPartner) {
      dealt.push(byId('text-partner'))
      continue
    }
    let candidates = STEP_LIBRARY.filter(
      (s) =>
        s.kind === kind &&
        (!s.gate || modules[s.gate] === true) &&
        (s.special !== 'partner' || hasPartner) &&
        !dealt.some((d) => d.id === s.id)
    )
    // Bench last-failure steps — but only when an alternative exists; an empty
    // slot would be worse than a repeated step.
    const unbenched = candidates.filter((s) => !benched.has(s.id))
    if (unbenched.length) candidates = unbenched
    if (!candidates.length) continue

    // Epsilon-greedy: mostly the best-scoring step, sometimes a uniform draw so
    // the stats keep learning. Ties break toward lower intensity (never escalate
    // without evidence).
    let pick
    if (rng() < EPSILON) {
      pick = candidates[Math.floor(rng() * candidates.length)]
    } else {
      pick = [...candidates].sort((a, b) => {
        const sa = stats[a.id]?.score ?? 0.5
        const sb = stats[b.id]?.score ?? 0.5
        return sb - sa || a.intensity - b.intensity
      })[0]
    }
    dealt.push(pick)
  }

  // Never re-deal the exact failed hand: if the id set matches the last slipped
  // protocol, swap the first swappable step for its best alternative.
  if (benched.size && dealt.length && sameSet(dealt.map((s) => s.id), [...benched])) {
    for (let i = 0; i < dealt.length; i++) {
      const alt = STEP_LIBRARY.find(
        (s) =>
          s.kind === dealt[i].kind &&
          s.id !== dealt[i].id &&
          (!s.gate || modules[s.gate] === true) &&
          (s.special !== 'partner' || hasPartner) &&
          !dealt.some((d) => d.id === s.id)
      )
      if (alt) {
        dealt[i] = alt
        break
      }
    }
  }

  return { steps: dealt, severity }
}

function byId(id) {
  return STEP_LIBRARY.find((s) => s.id === id)
}

function sameSet(a, b) {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((x) => sb.has(x))
}
