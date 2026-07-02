// wellness.test.js — the manual morning self-report score + resting-HR drift.
// Deliberately a holistic charge readout, never a pass/fail (Marlatt AVE), so the
// tests assert verdict copy stays supportive, not the all-or-nothing framing.
import { describe, it, expect } from 'vitest'
import { readiness, rhrTrend, DIMS } from './wellness.js'

describe('readiness', () => {
  it('returns null when nothing is logged', () => {
    expect(readiness(null)).toBeNull()
    expect(readiness({})).toBeNull()
  })

  it('averages the three dims and marks complete', () => {
    const r = readiness({ sleep: 5, legs: 5, mind: 5 })
    expect(r.score).toBe(5)
    expect(r.label).toBe('Dialed in')
    expect(r.complete).toBe(true)
  })

  it('scores a partial entry but flags it incomplete', () => {
    const r = readiness({ sleep: 3 })
    expect(r.score).toBe(3)
    expect(r.label).toBe('Steady')
    expect(r.complete).toBe(false)
  })

  it('rounds the average and clamps to 1–5', () => {
    expect(readiness({ sleep: 4, legs: 2, mind: 3 }).score).toBe(3) // avg 3.0
    expect(readiness({ sleep: 1, legs: 1, mind: 1 }).label).toBe('Running on empty')
  })

  it('ignores zero / sub-1 values instead of dragging the score down', () => {
    const r = readiness({ sleep: 0, legs: 4, mind: 4 })
    expect(r.score).toBe(4) // 0 dropped, avg of [4,4]
    expect(r.complete).toBe(false)
  })

  it('exposes exactly three dimensions', () => {
    expect(DIMS).toHaveLength(3)
  })
})

describe('rhrTrend', () => {
  it('returns null without a reading today', () => {
    expect(rhrTrend({}, '2026-06-22', 0)).toBeNull()
  })

  it('needs at least 3 prior days before judging elevation', () => {
    const r = rhrTrend({ '2026-06-20': { rhr: 50 } }, '2026-06-22', 52)
    expect(r.baseline).toBeNull()
    expect(r.elevated).toBe(false)
  })

  it('flags elevation at +5 over the baseline', () => {
    const past = {
      '2026-06-19': { rhr: 50 },
      '2026-06-20': { rhr: 50 },
      '2026-06-21': { rhr: 50 },
    }
    expect(rhrTrend(past, '2026-06-22', 56).elevated).toBe(true)
    expect(rhrTrend(past, '2026-06-22', 53).elevated).toBe(false)
    expect(rhrTrend(past, '2026-06-22', 56).baseline).toBe(50)
  })
})
