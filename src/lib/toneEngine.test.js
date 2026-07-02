// toneEngine.test.js — psychological mirroring, and the guardrails around it.
//
// The two hard rules from PSYCHOLOGY.md get enforced here as tests, not vibes:
// every line must clear guardian.screen() (banned-word tripwire), and post-slip
// copy must be ONE compassionate voice regardless of profile.
import { describe, it, expect } from 'vitest'
import { voice, allLines, windowLabel } from './toneEngine.js'
import { screen } from './guardian.js'

const P = { days: 12, best: 30, wins: 38, winsNext: 39, window: 'around 10pm' }

describe('the lexicon clears the shame tripwire', () => {
  it('every slot × model line passes guardian.screen()', () => {
    for (const { slot, model, text } of allLines()) {
      const check = screen(text)
      expect(check.ok, `${slot}/${model} tripped on "${check.banned}"`).toBe(true)
    }
  })
})

describe('profile mirroring', () => {
  it('the same drift reads differently per streakModel', () => {
    const a = voice({ streakModel: 'avoidance' }, 'drift.watch', P)
    const b = voice({ streakModel: 'accumulation' }, 'drift.watch', P)
    const c = voice({ streakModel: 'engagement' }, 'drift.watch', P)
    expect(new Set([a, b, c]).size).toBe(3)
    expect(a).toContain('Day 12') // loss framing protects the chain
    expect(b).toContain('38') // stacking framing counts the pile
    expect(c).toContain('show up') // contact framing lowers the bar
  })

  it('POST-SLIP COPY IS ONE VOICE — no loss framing after a loss (AVE)', () => {
    const lines = ['avoidance', 'accumulation', 'engagement'].map((m) =>
      voice({ streakModel: m }, 'urge.slipped', P)
    )
    expect(new Set(lines).size).toBe(1) // identical for all profiles
    expect(lines[0]).toContain('Everyone resets')
    expect(lines[0]).not.toMatch(/day \d|chain|streak|lost/i)
  })

  it('unknown model falls back to engagement (the gentlest voice)', () => {
    expect(voice({ streakModel: 'zzz' }, 'urge.open', P)).toBe(
      voice({ streakModel: 'engagement' }, 'urge.open', P)
    )
  })

  it('unknown slot returns empty string, never throws', () => {
    expect(voice({ streakModel: 'avoidance' }, 'nope.nothing', P)).toBe('')
  })
})

describe('notification slot', () => {
  it('returns { title, body } with params filled', () => {
    const n = voice({ streakModel: 'avoidance' }, 'warn.notification', P)
    expect(n.title).toContain('12')
    expect(n.body).toContain('around 10pm')
  })

  it('missing params render as — , never "undefined"', () => {
    const n = voice({ streakModel: 'accumulation' }, 'warn.notification', {})
    expect(`${n.title} ${n.body}`).not.toContain('undefined')
  })
})

describe('theme register', () => {
  it('terminal uppercases the notification title', () => {
    const n = voice({ streakModel: 'engagement', theme: 'terminal' }, 'warn.notification', P)
    expect(n.title).toBe(n.title.toUpperCase())
  })

  it('zen softens the urge-screen imperative', () => {
    const z = voice({ streakModel: 'engagement', theme: 'zen' }, 'urge.open', P)
    expect(z).toContain('Walk the steps')
    expect(z).not.toContain('Work the steps.')
  })
})

describe('windowLabel', () => {
  it('maps hours to human labels', () => {
    expect(windowLabel(22)).toBe('around 10pm')
    expect(windowLabel(0)).toBe('around 12am')
    expect(windowLabel(12)).toBe('around 12pm')
  })
  it('degrades gracefully without a window', () => {
    expect(windowLabel(null)).toBe('the usual stretch')
  })
})
