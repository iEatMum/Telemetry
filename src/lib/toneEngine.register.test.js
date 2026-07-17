// toneEngine.register.test.js — the scaffold/strict register switcher + its
// hard safety boundaries.
import { describe, it, expect } from 'vitest'
import { voice, pickRegister } from './toneEngine.js'
import { screen } from './guardian.js'

describe('pickRegister — slipResponse + confidence → register', () => {
  it('ghost + low confidence → scaffold (the task’s named case)', () => {
    expect(pickRegister({ slipResponse: 'ghost', missionConfidence: 2 })).toBe('scaffold')
  })
  it('any shame-reactive profile → scaffold, never strict — even when confident', () => {
    expect(pickRegister({ slipResponse: 'ghost', missionConfidence: 9 })).toBe('scaffold')
    expect(pickRegister({ slipResponse: 'critic', executionRate7d: 7 })).toBe('scaffold')
  })
  it('confident, high baseline, not fragile → strict', () => {
    expect(pickRegister({ slipResponse: 'shrug', missionConfidence: 9 })).toBe('strict')
    expect(pickRegister({ slipResponse: 'shrug', executionRate7d: 7 })).toBe('strict')
  })
  it('no signals → standard', () => {
    expect(pickRegister({})).toBe('standard')
    expect(pickRegister({ slipResponse: 'shrug', missionConfidence: 5 })).toBe('standard')
  })
})

describe('voice — register applies to WARNING copy only', () => {
  const ghost = { streakModel: 'avoidance', slipResponse: 'ghost', missionConfidence: 2 }
  const strict = { streakModel: 'avoidance', slipResponse: 'shrug', missionConfidence: 9 }

  it('scaffold adds the supportive beat to a drift warning', () => {
    const out = voice(ghost, 'drift.watch', { days: 12, window: 'around 10pm' })
    expect(out).toContain('one small move is the whole ask')
  })
  it('strict adds the high-friction beat to a drift warning', () => {
    const out = voice(strict, 'drift.watch', { days: 12, window: 'around 10pm' })
    expect(out).toContain('No negotiation')
  })
  it('the register lands on the notification BODY, not the title', () => {
    const out = voice(ghost, 'warn.notification', { days: 12, winsNext: 3, window: 'around 10pm' })
    expect(out.body).toContain('one small move is the whole ask')
    expect(out.title).not.toContain('one small move')
  })

  it('NEVER touches the one-voice post-slip line (hard rule 1)', () => {
    const base = voice({ streakModel: 'avoidance' }, 'urge.slipped', {})
    const withReg = voice(ghost, 'urge.slipped', {})
    expect(withReg).toBe(base) // register excluded → identical
    expect(withReg).not.toContain('No negotiation')
    expect(withReg).not.toContain('one small move')
  })

  it('standard profile leaves warning copy unchanged (regression guard)', () => {
    const plain = voice({ streakModel: 'avoidance' }, 'drift.watch', { days: 12, window: 'x' })
    expect(plain).not.toContain('one small move')
    expect(plain).not.toContain('No negotiation')
  })
})

describe('register beats are shame-safe (screen passes)', () => {
  const profiles = [
    { streakModel: 'avoidance', slipResponse: 'ghost', missionConfidence: 2 }, // scaffold
    { streakModel: 'avoidance', slipResponse: 'shrug', missionConfidence: 9 }, // strict
    { streakModel: 'accumulation', slipResponse: 'spiral', missionConfidence: 1 },
    { streakModel: 'engagement', executionRate7d: 7 },
  ]
  const params = { days: 9, best: 12, wins: 3, winsNext: 4, window: 'around 10pm' }
  for (const p of profiles) {
    for (const slot of ['drift.watch', 'drift.critical', 'warn.notification']) {
      it(`${slot} clears screen() for ${JSON.stringify(p)}`, () => {
        const out = voice(p, slot, params)
        const text = typeof out === 'string' ? out : `${out.title} ${out.body}`
        expect(screen(text).ok).toBe(true)
      })
    }
  }
})
