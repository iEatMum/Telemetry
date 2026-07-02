// readiness.js — turn OBJECTIVE health metrics (sleep + HRV) into a readiness
// band, and downgrade the day's targets when the body isn't recovered.
//
// PURE logic, no native deps: the metrics are passed in by the caller (the
// client health bridge — see lib/health.js). This is distinct from wellness.js,
// which scores a MANUAL morning self-report; readiness.js scores HealthKit data.

// 'low' | 'moderate' | 'high'. Guards MISSING values so absent data is neutral,
// never a false 'low'. Note: null/undefined are "missing" (→ moderate), but an
// explicit 0 is a real, poor reading (→ low) — Number(null) === 0 would otherwise
// collapse the two, so we null-check before coercing. The health bridge must send
// undefined (not null/0) when a sensor value is genuinely absent.
export function calculateReadinessScore(sleepHours, hrv) {
  if (sleepHours == null || hrv == null) return 'moderate' // absent → neutral
  const s = Number(sleepHours)
  const h = Number(hrv)
  if (Number.isNaN(s) || Number.isNaN(h)) return 'moderate' // unparseable → neutral
  if (s < 6 || h < 40) return 'low' // either signal poor → recover
  if (s > 7.5 && h > 60) return 'high' // both strong → green light
  return 'moderate'
}

// Intensity → maintenance substitutions for a low-readiness day.
const INTENSITY_DOWNGRADES = [
  [/long\s*run/i, 'Recovery walk — 20 min'],
  [/run\s*\d|\d\s*mi(le)?s?\s*run|run\s*\d+\s*mi/i, 'Walk 2 miles — easy zone 2'],
  [/sprint|interval|track\s*work|tempo/i, 'Mobility + easy shakeout'],
  [/lift|heavy|max|squat|deadlift|bench/i, 'Light technique work — 50% load'],
  [/hiit|hard|all[-\s]?out/i, 'Easy aerobic — conversational pace'],
]

function downgradeBlock(label) {
  for (const [re, repl] of INTENSITY_DOWNGRADES) if (re.test(label)) return repl
  return label
}

// Adjust a schedule (array of ScheduleMatrix rows: { time, block, status, impact })
// for the day's readiness band.
//   'high'      → keep as-is (full send).
//   'moderate'  → keep as-is (default; only the extremes act).
//   'low'       → reduce volume (front-loaded ~60% of blocks), downgrade
//                 high-intensity / high-impact blocks to maintenance (and drop
//                 their ◆ high-impact flag so a recovery day isn't scored as a
//                 miss), and insert a 30-min recovery buffer after each.
export function adjustDailyTargets(originalTargets, readinessScore) {
  if (readinessScore !== 'low' || !Array.isArray(originalTargets)) return originalTargets

  const keep = Math.max(1, Math.ceil(originalTargets.length * 0.6)) // reduce card count
  const out = []
  for (const r of originalTargets.slice(0, keep)) {
    const label = r.block || ''
    const downgraded = downgradeBlock(label)
    const wasHard = r.impact === 'high' || downgraded !== label
    out.push(wasHard ? { ...r, block: downgraded, impact: 'normal', adjusted: 'readiness:low' } : r)
    if (wasHard) {
      out.push({ time: '', block: 'Recovery buffer — 30 min', status: 'open', impact: 'normal', buffer: true })
    }
  }
  return out
}
