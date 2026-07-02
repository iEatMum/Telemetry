// readiness.test.js — the HealthKit readiness band + low-day target downgrade.
// Signatures verified against readiness.js (NOT the original draft, which used a
// non-existent `intensity` field and ignored the 'moderate' band).
import { describe, it, expect } from 'vitest'
import { calculateReadinessScore, adjustDailyTargets } from './readiness.js'

describe('calculateReadinessScore', () => {
  it('flags LOW when either signal is poor', () => {
    expect(calculateReadinessScore(5, 50)).toBe('low') // short sleep
    expect(calculateReadinessScore(7, 30)).toBe('low') // low HRV
  })

  it('flags HIGH only when BOTH signals are strong', () => {
    expect(calculateReadinessScore(8, 70)).toBe('high')
    // strong sleep but mediocre HRV is not a green light
    expect(calculateReadinessScore(8, 55)).toBe('moderate')
  })

  it('is MODERATE in the middle band', () => {
    expect(calculateReadinessScore(7, 55)).toBe('moderate')
  })

  it('treats ABSENT data (null / undefined) as neutral moderate, never a false low', () => {
    expect(calculateReadinessScore(undefined, undefined)).toBe('moderate')
    expect(calculateReadinessScore(null, null)).toBe('moderate')
    expect(calculateReadinessScore(8, undefined)).toBe('moderate') // a missing HRV alone is not a low
    expect(calculateReadinessScore(null, 70)).toBe('moderate') // missing sleep alone is not a low
  })

  it('treats an explicit 0 as a real (poor) reading → low, distinct from "missing"', () => {
    // The guard null-checks BEFORE coercing, so 0 is not collapsed into "absent".
    expect(calculateReadinessScore(0, 0)).toBe('low')
    expect(calculateReadinessScore(0, 70)).toBe('low')
  })

  it('handles the band boundaries the way the thresholds read', () => {
    expect(calculateReadinessScore(6, 40)).toBe('moderate') // strict < / > , so on-the-line is not low/high
    expect(calculateReadinessScore(7.5, 61)).toBe('moderate') // sleep must be > 7.5
    expect(calculateReadinessScore(7.6, 61)).toBe('high')
  })
})

describe('adjustDailyTargets', () => {
  const schedule = [
    { time: '06:00', block: 'Long run 8mi', status: 'open', impact: 'high' },
    { time: '10:00', block: 'Bench heavy 5x5', status: 'open', impact: 'high' },
    { time: '14:00', block: 'Email triage', status: 'open', impact: 'normal' },
    { time: '16:00', block: 'Easy mobility', status: 'open', impact: 'normal' },
  ]

  it('returns the schedule untouched for high / moderate days (identity)', () => {
    expect(adjustDailyTargets(schedule, 'high')).toBe(schedule)
    expect(adjustDailyTargets(schedule, 'moderate')).toBe(schedule)
  })

  it('guards non-array input', () => {
    expect(adjustDailyTargets(undefined, 'low')).toBe(undefined)
    expect(adjustDailyTargets(null, 'low')).toBe(null)
  })

  it('on a LOW day, strips every high-impact flag so recovery is not scored as a miss', () => {
    const out = adjustDailyTargets(schedule, 'low')
    expect(out.find((r) => r.impact === 'high')).toBeUndefined()
  })

  it('downgrades hard blocks to maintenance and tags them', () => {
    const out = adjustDailyTargets(schedule, 'low')
    const longRun = out.find((r) => /recovery walk/i.test(r.block))
    expect(longRun).toBeDefined()
    expect(longRun.adjusted).toBe('readiness:low')
    expect(longRun.impact).toBe('normal')
  })

  it('reduces volume (~60%, front-loaded) and inserts recovery buffers', () => {
    const out = adjustDailyTargets(schedule, 'low')
    // keep = ceil(4 * 0.6) = 3 source rows considered; both kept hard rows add a buffer
    expect(out.some((r) => r.buffer === true)).toBe(true)
    // a buffer is added after each downgraded hard block, so output grows past the kept count
    expect(out.length).toBeGreaterThan(3)
  })
})
