// guardianSeed.test.js — the day-0 priors derivation + the binding §2 rules.
import { describe, it, expect } from 'vitest'
import { deriveGuardianSeed } from './guardianSeed.js'
import { assessDrift, temporalProfile } from './guardianEngine.js'

describe('deriveGuardianSeed — dangerWindow → temporal prior', () => {
  it('fixed windows map to their circadian anchor hour', () => {
    expect(deriveGuardianSeed({ dangerWindow: 'late-night' }).temporalPrior.peakHour).toBe(23.0)
    expect(deriveGuardianSeed({ dangerWindow: 'evening' }).temporalPrior.peakHour).toBe(20.0)
    expect(deriveGuardianSeed({ dangerWindow: 'midday-slump' }).temporalPrior.peakHour).toBe(14.0)
  })
  it('post-wake is relative to the user’s wake time (+1h)', () => {
    expect(deriveGuardianSeed({ dangerWindow: 'post-wake', wakeTime: '05:30' }).temporalPrior.peakHour).toBe(6.5)
  })
  it('no dangerWindow → no temporal prior', () => {
    expect(deriveGuardianSeed({}).temporalPrior).toBeUndefined()
  })
})

describe('deriveGuardianSeed — the other arming signals', () => {
  it('executionRate7d ≤2 raises the cold-start floor; higher does not', () => {
    expect(deriveGuardianSeed({ executionRate7d: 1 }).coldStartFloor).toBe(true)
    expect(deriveGuardianSeed({ executionRate7d: 5 }).coldStartFloor).toBeUndefined()
  })
  it('missionConfidence ≤3 raises the efficacy floor', () => {
    expect(deriveGuardianSeed({ missionConfidence: 2 }).efficacyFloor).toBe(true)
    expect(deriveGuardianSeed({ missionConfidence: 8 }).efficacyFloor).toBeUndefined()
  })
  it('slipResponse arms register, re-entry, and SMS reframe correctly', () => {
    expect(deriveGuardianSeed({ slipResponse: 'ghost' })).toMatchObject({ slipRegister: 'ghost', reentryPriority: true })
    expect(deriveGuardianSeed({ slipResponse: 'critic' }).smsReframe).toBe('action-report')
    expect(deriveGuardianSeed({ slipResponse: 'spiral' }).smsReframe).toBe('action-report')
    const shrug = deriveGuardianSeed({ slipResponse: 'shrug' })
    expect(shrug.slipRegister).toBe('shrug')
    expect(shrug.reentryPriority).toBeUndefined()
    expect(shrug.smsReframe).toBeUndefined()
  })
  it('anchorHabit names a cue, but "none" names nothing', () => {
    expect(deriveGuardianSeed({ anchorHabit: 'workout' }).anchorCue).toBe('workout')
    expect(deriveGuardianSeed({ anchorHabit: 'none' }).anchorCue).toBeUndefined()
  })
})

describe('§2 binding rules — the seed is a PRIOR, never a verdict', () => {
  const NIGHT = new Date(2026, 5, 25, 23, 0, 0) // right inside a late-night prior
  const seed = { temporalPrior: { peakHour: 23.0, source: 'survey' } }

  it('a survey window fills the {window} on day 0 (no urge history)', () => {
    const t = temporalProfile({ resets: [], urgesSurvived: [] }, NIGHT, seed.temporalPrior)
    expect(t.evidence).toBe('survey')
    expect(t.peakHour).toBe(23.0)
    const a = assessDrift({ now: NIGHT, streak: {}, guardianSeed: seed })
    expect(a.window).not.toBeNull()
    expect(a.window.peakHour).toBe(23.0) // scheduleGuardianWarning + {window} now have a source
  })

  it('the survey prior does NOT count toward the ≥2-evidence critical gate', () => {
    // A near-max survey score PLUS one real strong vector must still not reach
    // critical — only one OBSERVED evidence vector exists.
    const a = assessDrift({
      now: NIGHT,
      streak: {},
      wellnessToday: { sleep: 1 }, // one real evidence vector
      guardianSeed: seed,
    })
    expect(a.band).not.toBe('critical')
    expect(a.evidenceCount).toBe(1) // the survey temporal vector is excluded
  })

  it('a survey prior ALONE cannot even reach watch (score-capped below threshold)', () => {
    const a = assessDrift({ now: NIGHT, streak: {}, guardianSeed: seed })
    expect(a.band).toBe('stable')
  })

  it('with no seed, behavior is identical to before (regression guard)', () => {
    const a = assessDrift({ now: NIGHT, streak: {} })
    expect(a.window).toBeNull()
    expect(a.band).toBe('stable')
  })
})
