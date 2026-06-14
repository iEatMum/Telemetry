// wellness.js — the readiness check-in's logic. A fast morning self-report
// (sleep / legs / head, each 1–5) that computes ONE "readiness" charge + a
// training cue. Deliberately NOT a sleep-hours pass/fail — a holistic charge
// readout, so it never imports the all-or-nothing failure framing the app
// avoids (Marlatt AVE). The cue makes it a tool, not a diary.

export const DIMS = [
  { key: 'sleep', label: 'Sleep', opts: ['Wrecked', 'Rough', 'OK', 'Good', 'Locked'] },
  { key: 'legs', label: 'Legs', opts: ['Dead', 'Heavy', 'Normal', 'Fresh', 'Springy'] },
  { key: 'mind', label: 'Head', opts: ['Foggy', 'Flat', 'Steady', 'Sharp', 'Dialed'] },
]

// 1–5 → a tactical verdict + a training cue. Never "you failed."
const VERDICTS = {
  1: { label: 'Running on empty', cue: 'Easy or full rest. Sleep is tonight’s workout.' },
  2: { label: 'Low battery', cue: 'Keep it easy — recovery is the work today.' },
  3: { label: 'Steady', cue: 'Normal day. Execute the plan.' },
  4: { label: 'Charged', cue: 'Good to push. Green-ish light.' },
  5: { label: 'Dialed in', cue: 'Green light — attack the workout.' },
}

// readiness(entry) -> { score 1–5, label, cue, complete } | null if nothing logged.
export function readiness(entry) {
  if (!entry) return null
  const vals = DIMS.map((d) => entry[d.key]).filter((v) => typeof v === 'number' && v >= 1)
  if (!vals.length) return null
  const score = Math.max(1, Math.min(5, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)))
  return { score, ...VERDICTS[score], complete: vals.length === DIMS.length }
}

// Resting-HR drift vs a recent baseline, for the "your HR's up" nudge. Needs a
// few prior days with rhr. Returns { rhr, baseline, elevated } | null.
export function rhrTrend(wellness, todayKey, todayRhr) {
  if (!todayRhr) return null
  const past = Object.entries(wellness || {})
    .filter(([day, e]) => day < todayKey && e && Number(e.rhr) > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
    .map(([, e]) => Number(e.rhr))
  if (past.length < 3) return { rhr: todayRhr, baseline: null, elevated: false }
  const baseline = Math.round(past.reduce((a, b) => a + b, 0) / past.length)
  return { rhr: todayRhr, baseline, elevated: todayRhr >= baseline + 5 }
}
