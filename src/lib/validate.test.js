// validate.test.js — the storage checks-and-balances layer.
//
// sanitize(name, value) runs on EVERY storage.get(), so corrupt localStorage (iOS
// eviction, a hand-edited export, a future bug) can never poison the UI. It clamps
// numbers, caps strings, drops malformed array items, and (added here) whitelists
// settings.theme so a garbage value can't reach the data-theme attribute.
import { describe, it, expect } from 'vitest'
import { sanitize } from './validate.js'

describe('sanitize — settings', () => {
  it('caps strings, clamps numbers, and drops malformed collections', () => {
    const s = sanitize('settings', {
      name: 'x'.repeat(100),
      moneyGoal: -5,
      partners: 'not-an-array',
      shoes: [123, 'ok'],
    })
    expect(s.name.length).toBe(60)
    expect(s.moneyGoal).toBe(0) // clamped to min 0
    expect(Array.isArray(s.partners)).toBe(true)
    expect(s.partners.length).toBe(0)
    expect(s.shoes).toEqual(['ok']) // non-string dropped
  })

  it('keeps a valid theme and preserves the psych-profile fields', () => {
    const s = sanitize('settings', { theme: 'night_ops', streakModel: 'avoidance', stake: { preference: 'social' } })
    expect(s.theme).toBe('night_ops')
    expect(s.streakModel).toBe('avoidance')
    expect(s.stake).toEqual({ preference: 'social' })
  })

  it('drops an unknown/corrupt theme to undefined', () => {
    expect(sanitize('settings', { theme: 'hacker' }).theme).toBeUndefined()
    expect(sanitize('settings', {}).theme).toBeUndefined()
  })

  it('never throws on a non-object', () => {
    expect(() => sanitize('settings', null)).not.toThrow()
  })
})

describe('sanitize — collections', () => {
  it('clamps run fields to sane ranges', () => {
    const r = sanitize('runs', [{ id: 'a', miles: 9999, minutes: -3, rpe: 50 }])
    expect(r[0].miles).toBe(500)
    expect(r[0].minutes).toBe(0)
    expect(r[0].rpe).toBe(10)
  })

  it('drops non-positive income entries', () => {
    const inc = sanitize('income', [
      { id: 'a', amount: 10 },
      { id: 'b', amount: 0 },
      { id: 'c', amount: -5 },
    ])
    expect(inc.length).toBe(1)
    expect(inc[0].amount).toBe(10)
  })

  it('hard-caps a handover draft body', () => {
    const h = sanitize('handover', { drafts: [{ id: 'd', body: 'y'.repeat(6000) }], considerations: [], counselAck: [] })
    expect(h.drafts[0].body.length).toBe(5000)
  })
})

describe('sanitize — unknown slice', () => {
  it('passes an unknown slice through untouched', () => {
    expect(sanitize('somethingElse', { foo: 1 })).toEqual({ foo: 1 })
  })
})
