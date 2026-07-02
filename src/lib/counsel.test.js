// counsel.test.js — the Guardian's pattern brain over witnessed checkpoints.
//
// checkpoints are newest-first record.js rows: { kind:'wake'|'bedtime',
// verdict:'hit'|'late'|'missed' }. detectPatterns names the drift; strongest()
// must let a DANGER pattern (evening phone-down misses → route to the partner)
// win over a merely-higher-severity safe one; counselFor builds the card.
import { describe, it, expect } from 'vitest'
import { detectPatterns, strongestPattern, counselFor } from './counsel.js'

const wake = (verdict) => ({ kind: 'wake', verdict })
const bed = (verdict) => ({ kind: 'bedtime', verdict })

describe('detectPatterns', () => {
  it('returns nothing for an empty record', () => {
    expect(detectPatterns([])).toEqual([])
  })

  it('never throws on garbage rows', () => {
    expect(detectPatterns([null, 5, 'x', {}, undefined])).toEqual([])
  })

  it('flags a late-wake run of 2+ leading (newest-first) mornings', () => {
    const p = detectPatterns([wake('late'), wake('missed'), wake('hit')])
    const late = p.find((x) => x.key === 'late-wake')
    expect(late).toBeTruthy()
    expect(late.count).toBe(2)
    expect(late.severity).toBe('med')
    expect(late.danger).toBe(false)
  })

  it('escalates a 3+ run to high severity', () => {
    const p = detectPatterns([wake('missed'), wake('late'), wake('missed')])
    expect(p.find((x) => x.key === 'late-wake').severity).toBe('high')
  })

  it('flags evening-drift as DANGER when phone-down is missed 2+ of the last 5 nights', () => {
    const p = detectPatterns([bed('missed'), bed('missed'), bed('hit')])
    const drift = p.find((x) => x.key === 'evening-drift')
    expect(drift).toBeTruthy()
    expect(drift.danger).toBe(true)
  })
})

describe('strongestPattern — danger beats severity', () => {
  it('returns null when nothing is drifting', () => {
    expect(strongestPattern([])).toBeNull()
  })

  it('picks the danger pattern over a longer, higher-severity safe run', () => {
    // 3 missed wakes (would be a HIGH-severity late-wake) AND 2 missed bedtimes
    // (a MED-severity danger). The danger one must be the card that shows.
    const rows = [wake('missed'), wake('missed'), wake('missed'), bed('missed'), bed('missed')]
    expect(detectPatterns(rows).length).toBe(2)
    expect(strongestPattern(rows).key).toBe('evening-drift')
  })
})

describe('counselFor', () => {
  it('returns null when there is no drift', () => {
    expect(counselFor([], { partnerName: 'Sam' })).toBeNull()
  })

  it('routes a danger pattern to the named partner', () => {
    const rows = [bed('missed'), bed('missed'), bed('hit')]
    const card = counselFor(rows, { partnerName: 'Sam' })
    expect(card.heading).toBe('Consider')
    expect(card.synthesis).toBe('local')
    expect(card.danger).toBe(true)
    expect(card.pattern).toBe('evening-drift')
    expect(card.text).toContain('Sam')
  })

  it('builds a non-danger card for a wake-time slip', () => {
    const card = counselFor([wake('late'), wake('late')])
    expect(card.heading).toBe('Consider')
    expect(card.pattern).toBe('late-wake')
    expect(card.danger).toBe(false)
    expect(typeof card.text).toBe('string')
    expect(card.text.length).toBeGreaterThan(0)
  })
})
