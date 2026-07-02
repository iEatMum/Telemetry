// stakes.test.js — the client half of the Stakes Engine.
// Signatures verified against stakes.js: checkStakes(payload) reads payload.impact
// ({ total, done, missed, pending }) OR a bare impact object, and returns
// { breached, required, completed, missed }. (The original draft asserted a
// non-existent { breach, penaltyType } shape with a { highImpactRequired } input.)
import { describe, it, expect } from 'vitest'
import { checkStakes, triggerStakesCheck } from './stakes.js'

describe('checkStakes — pure breach check', () => {
  it('detects a breach when high-impact work is incomplete', () => {
    const r = checkStakes({ done: 1, total: 2 })
    expect(r.breached).toBe(true)
    expect(r.required).toBe(2)
    expect(r.completed).toBe(1)
    expect(r.missed).toBe(1)
  })

  it('accepts a full closeDay() payload via its .impact field', () => {
    const payload = { day: '2026-06-22', impact: { total: 2, done: 2, missed: 0, pending: 0 } }
    const r = checkStakes(payload)
    expect(r.breached).toBe(false)
    expect(r.missed).toBe(0)
  })

  it('infers the target from done + missed + pending when total is absent', () => {
    const r = checkStakes({ done: 1, missed: 2, pending: 0 })
    expect(r.required).toBe(3)
    expect(r.breached).toBe(true)
    expect(r.missed).toBe(2)
  })

  it('stays dormant when there are no high-impact items (empty state)', () => {
    expect(checkStakes({}).breached).toBe(false)
    expect(checkStakes({}).required).toBe(0)
    expect(checkStakes(undefined).breached).toBe(false)
  })

  it('never reports negative misses when over-completed', () => {
    const r = checkStakes({ done: 3, total: 2 })
    expect(r.breached).toBe(false)
    expect(r.missed).toBe(0)
  })
})

describe('triggerStakesCheck — fail-soft invoker', () => {
  it('short-circuits with no consequence when there is no breach', async () => {
    const r = await triggerStakesCheck({ impact: { total: 2, done: 2 } })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-breach')
  })

  it('fails soft on a real breach without a backend session (never throws, never sends)', async () => {
    const r = await triggerStakesCheck({ done: 0, total: 2 })
    expect(r.ok).toBe(false)
    // local mode, or a configured-but-unauthenticated client — both are safe no-ops
    expect(['local', 'no-session', 'error']).toContain(r.reason)
  })
})
