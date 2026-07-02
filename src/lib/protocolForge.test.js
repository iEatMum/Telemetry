// protocolForge.test.js — the adaptive Outlast It builder.
//
// The contract under test: the arc holds (interrupt → downshift → reframe →
// commit), the partner text is the un-explorable crown step, gated steps stay
// gated, outcomes are attributed honestly, and a failed hand is never re-dealt.
import { describe, it, expect } from 'vitest'
import {
  STEP_LIBRARY,
  forgeProtocol,
  resolveOutcomes,
  stepStats,
  lastFailedSteps,
} from './protocolForge.js'

// Deterministic "rng": pops values off a script; 0.99 → always exploit.
const rngOf = (vals) => {
  let i = 0
  return () => (i < vals.length ? vals[i++] : 0.99)
}

const iso = (h) => new Date(2026, 5, 20, h, 0, 0).toISOString()

describe('forgeProtocol — the arc', () => {
  it('deals the normal 4-beat arc', () => {
    const { steps } = forgeProtocol({ rng: rngOf([]) })
    expect(steps.map((s) => s.kind)).toEqual(['interrupt', 'downshift', 'cognitive', 'commit'])
  })

  it('high severity front-loads an environment break', () => {
    const { steps } = forgeProtocol({ severity: 'high', rng: rngOf([]) })
    expect(steps[0].kind).toBe('environment')
  })

  it('with a partner, commit is ALWAYS the text (the crown step)', () => {
    for (const eps of [0.01, 0.99]) {
      const { steps } = forgeProtocol({ hasPartner: true, rng: rngOf([eps]) })
      expect(steps.find((s) => s.kind === 'commit').id).toBe('text-partner')
    }
  })

  it('without a partner the text step is never dealt', () => {
    const { steps } = forgeProtocol({ hasPartner: false, rng: rngOf([]) })
    expect(steps.some((s) => s.id === 'text-partner')).toBe(false)
  })

  it('faith-gated steps only appear when the module is on', () => {
    // Force exploration into the cognitive slot repeatedly; verse must never
    // surface without the gate.
    for (let i = 0; i < 20; i++) {
      const { steps } = forgeProtocol({ modules: {}, rng: rngOf([0.01, 0.01, 0.01, 0.01, (i % 10) / 10]) })
      expect(steps.some((s) => s.id === 'verse')).toBe(false)
    }
    const withFaith = STEP_LIBRARY.filter((s) => s.kind === 'cognitive' && (!s.gate || true))
    expect(withFaith.some((s) => s.id === 'verse')).toBe(true) // library sanity
  })
})

describe('outcome attribution', () => {
  it('a win logged within 45 minutes marks the invocation survived', () => {
    const inv = [{ at: iso(21), steps: ['pushups-20'], severity: 'normal' }]
    const streak = { urgesSurvived: [{ at: iso(21.25) }], resets: [] }
    expect(resolveOutcomes(inv, streak)[0].outcome).toBe('survived')
  })

  it('a reset within 6 hours marks it slipped', () => {
    const inv = [{ at: iso(20), steps: ['pushups-20'], severity: 'normal' }]
    const streak = { urgesSurvived: [], resets: [{ at: iso(23) }] }
    expect(resolveOutcomes(inv, streak)[0].outcome).toBe('slipped')
  })

  it('nothing following → open (never counted)', () => {
    const inv = [{ at: iso(20), steps: ['pushups-20'], severity: 'normal' }]
    expect(resolveOutcomes(inv, {})[0].outcome).toBe('open')
    expect(stepStats(inv, {})).toEqual({})
  })

  it('stepStats is Laplace-smoothed — one loss cannot zero a step', () => {
    const inv = [{ at: iso(20), steps: ['pushups-20'], severity: 'normal' }]
    const streak = { urgesSurvived: [], resets: [{ at: iso(22) }] }
    const stats = stepStats(inv, streak)
    expect(stats['pushups-20'].losses).toBe(1)
    expect(stats['pushups-20'].score).toBeCloseTo(1 / 3) // (0+1)/(1+2)
  })

  it('synced wins from another device (steps on the entry) still teach', () => {
    const streak = { urgesSurvived: [{ at: iso(9), steps: ['cold-water'] }], resets: [] }
    const stats = stepStats([], streak)
    expect(stats['cold-water'].wins).toBe(1)
  })
})

describe('adaptation — failure changes the next hand', () => {
  const failedInv = [{ at: iso(20), steps: ['pushups-20', 'breath-478', 'name-cue', 'write-line'], severity: 'normal' }]
  const failedStreak = { urgesSurvived: [], resets: [{ at: iso(22) }] }

  it('lastFailedSteps surfaces the benched set', () => {
    expect([...lastFailedSteps(failedInv, failedStreak)].sort()).toEqual(
      ['breath-478', 'name-cue', 'pushups-20', 'write-line'].sort()
    )
  })

  it('benched steps are avoided when alternatives exist', () => {
    const { steps } = forgeProtocol({ invocations: failedInv, streak: failedStreak, rng: rngOf([]) })
    const dealt = steps.map((s) => s.id)
    // At least the interrupt and downshift slots must have moved off the failed hand.
    expect(dealt).not.toContain('pushups-20')
    expect(dealt).not.toContain('breath-478')
  })

  it('the exact failed hand is never re-dealt', () => {
    for (let seed = 0; seed < 10; seed++) {
      const { steps } = forgeProtocol({
        invocations: failedInv,
        streak: failedStreak,
        rng: rngOf([seed / 10, seed / 10, seed / 10, seed / 10]),
      })
      const dealt = steps.map((s) => s.id).sort()
      expect(dealt).not.toEqual(['breath-478', 'name-cue', 'pushups-20', 'write-line'].sort())
    }
  })
})
