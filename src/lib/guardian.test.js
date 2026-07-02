// guardian.test.js — the banned-word tripwire (screen()).
//
// screen() is the one Guardian constraint enforced in code today: no alert may
// carry self-as-bad language, even if a template is hand-edited or (later) a model
// generates it. Matching is word-boundary + optional trailing 's', so short faith
// words like "god"/"sin" are safe to list without snagging "good"/"using".
import { describe, it, expect } from 'vitest'
import { screen } from './guardian.js'

describe('screen — banned-word tripwire', () => {
  it('passes clean, on-voice text', () => {
    const r = screen('This is data, not a verdict. Name the cue, set the next rep.')
    expect(r.ok).toBe(true)
    expect(r.banned).toBeNull()
  })

  it('trips on a self-as-bad word and reports which one', () => {
    const r = screen('You are weak.')
    expect(r.ok).toBe(false)
    expect(r.banned).toBe('weak')
  })

  it('is case-insensitive and normalizes the reported word', () => {
    expect(screen('WEAK.').banned).toBe('weak')
  })

  it('catches the simple plural form', () => {
    const r = screen('a list of failures')
    expect(r.ok).toBe(false)
    expect(r.banned).toBe('failure')
  })

  it('does NOT snag longer words that merely contain a banned substring', () => {
    // "using" contains s-i-n, "good" is adjacent to "god" — word boundaries keep
    // both clean. This is the exact false-positive the \b...s?\b rule guards.
    const r = screen('I am using good tools today')
    expect(r.ok).toBe(true)
    expect(r.banned).toBeNull()
  })

  it('treats null/undefined as empty (never throws)', () => {
    expect(screen(undefined).ok).toBe(true)
    expect(screen(null).ok).toBe(true)
  })
})
