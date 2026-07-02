// counsel.js — the Guardian's brain. Pattern detection over the WITNESSED
// checkpoints (record.js rows), cross-referenced with the curated Library, into
// a single "Consider" card recommending one resource for the next 24h.
//
// SOURCE OF TRUTH: only the Referee's checkpoints (kind/verdict/at). These carry
// NO free text, so there is nothing of the user's raw words to echo — the
// no-echo rule is satisfied by construction. Output is still run through
// screen() (banned-word safety) and danger patterns route to the partner.
//
// WHAT IS / ISN'T AI: detectPatterns + counselFor below are a DETERMINISTIC,
// rule-based stand-in. The real content-aware synthesis is meant to run
// SERVER-SIDE — a Supabase Edge Function that takes the detected pattern + the
// Library + persona.systemPrompt and returns the card text — so no API key ever
// ships in the client. This file is the contract that function fills; until it
// exists, the rules below produce an honest, on-voice card (marked synthesis:'local').

import library from './counselLibrary.json'
import { screen } from './guardian.js'

const isHit = (r) => r && r.verdict === 'hit'

// Length of the leading run (from newest) where pred holds.
function leadingRun(rows, pred) {
  let n = 0
  for (const r of rows) {
    if (pred(r)) n++
    else break
  }
  return n
}

// Detect drift patterns. `checkpoints` are newest-first record.js rows:
// { kind:'wake'|'bedtime', verdict:'hit'|'late'|'missed', at, created_at }.
export function detectPatterns(checkpoints = []) {
  // Guard the elements, not just the array — a single null/garbage row must not
  // throw and crash the Examen's Consider section.
  const rows = (Array.isArray(checkpoints) ? checkpoints : []).filter((r) => r && typeof r === 'object')
  const wake = rows.filter((r) => r.kind === 'wake')
  const bed = rows.filter((r) => r.kind === 'bedtime')
  const patterns = []

  const lateWakeRun = leadingRun(wake, (r) => !isHit(r))
  if (lateWakeRun >= 2) {
    patterns.push({
      key: 'late-wake',
      severity: lateWakeRun >= 3 ? 'high' : 'med',
      count: lateWakeRun,
      danger: false,
      summary: `${lateWakeRun} mornings running, the wake-up has slipped past the line.`,
    })
  }

  // Missed phone-down at night = the high-risk window for this user. Danger.
  const recentBed = bed.slice(0, 5)
  const missedBed = recentBed.filter((r) => r.verdict === 'missed').length
  if (missedBed >= 2) {
    patterns.push({
      key: 'evening-drift',
      severity: missedBed >= 3 ? 'high' : 'med',
      count: missedBed,
      danger: true,
      // Neutral, normalizing — names the hard stretch, not a verdict on him, and
      // sets up the partner hand-off in the action below (PSYCHOLOGY.md §2: data,
      // not shame; route danger to a person, not solo willpower).
      summary: `The phone's stayed up past the night line ${missedBed} of the last ${recentBed.length} nights — and that's the stretch where it's hardest to do alone.`,
    })
  } else {
    const lateBedRun = leadingRun(bed, (r) => !isHit(r))
    if (lateBedRun >= 2) {
      patterns.push({
        key: 'missed-bedtime',
        severity: lateBedRun >= 3 ? 'high' : 'med',
        count: lateBedRun,
        danger: false,
        summary: `${lateBedRun} nights running, phone-down came late.`,
      })
    }
  }

  // General drift only if nothing sharper fired.
  if (!patterns.length) {
    const recent = rows.slice(0, 8)
    const misses = recent.filter((r) => !isHit(r)).length
    if (recent.length >= 4 && misses / recent.length >= 0.5) {
      patterns.push({
        key: 'consistency',
        severity: 'med',
        count: misses,
        danger: false,
        summary: `About half the recent checkpoints drifted. Not a verdict — a pattern to name.`,
      })
    }
  }

  return patterns
}

// The single strongest detected drift (or null) — what the client sends to the
// server-side AI Counsel for synthesis.
export function strongestPattern(checkpoints) {
  const patterns = detectPatterns(checkpoints)
  return patterns.length ? strongest(patterns) : null
}

function strongest(patterns) {
  const rank = { high: 3, med: 2, low: 1 }
  // Danger ALWAYS takes precedence over a merely-higher-severity safe pattern.
  // The rule is that any danger pattern routes to the partner — so when one is
  // present, it must be the card that shows, even if a non-danger run is longer.
  return [...patterns].sort((a, b) => {
    if (!!a.danger !== !!b.danger) return a.danger ? -1 : 1
    return (rank[b.severity] || 0) - (rank[a.severity] || 0)
  })[0]
}

export function selectResource(patternKey) {
  const all = Array.isArray(library.resources) ? library.resources : []
  const tagged = all.filter((r) => (r.tags || []).includes(patternKey))
  if (tagged.length) return tagged[0]
  const general = all.filter((r) => (r.tags || []).includes('general'))
  return general[0] || all[0] || null
}

function actionFor(key) {
  return (
    {
      'late-wake': 'lock the wake — phone charging in the other room, feet on the floor when it rings.',
      'missed-bedtime': 'set the phone down at the line tonight. One clean night resets the pattern.',
      consistency: 'pick the ONE checkpoint that slipped most and hold just that one tomorrow.',
    }[key] || 'name the cue, set the next rep.'
  )
}

// Build the single Consider card for the strongest detected drift, or null if
// nothing is drifting. Enforces the Guardian rules: no shame, danger routes to
// the partner, output screened for banned words.
export function counselFor(checkpoints, { partnerName } = {}) {
  const patterns = detectPatterns(checkpoints)
  if (!patterns.length) return null
  const p = strongest(patterns)

  // Screen the recommended resource too: the Library is hand-edited, so a title
  // or author carrying shame language must not slip into the card around the
  // banned-word rail. If it trips, drop the resource rather than ship it.
  let resource = selectResource(p.key)
  if (resource && !screen(`${resource.title || ''} ${resource.by || ''}`).ok) resource = null

  const action = p.danger
    ? `For the next 24 hours: when the window opens tonight, text ${partnerName || 'your partner'} one line before — not after. Phone out of the room.`
    : `For the next 24 hours: ${actionFor(p.key)}`

  const text = `${p.summary} ${action}`
  const safe = screen(text)

  return {
    heading: 'Consider',
    source: 'counsel',
    synthesis: 'local',
    pattern: p.key,
    danger: p.danger,
    text: safe.ok ? text : `A pattern is forming in the record. ${action}`,
    resource: resource
      ? { type: resource.type, title: resource.title, by: resource.by, url: resource.url || '' }
      : null,
  }
}
