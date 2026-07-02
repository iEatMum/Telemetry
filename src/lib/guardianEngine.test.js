// guardianEngine.test.js — the drift sentinel's pure core.
//
// assessDrift is deliberately injectable: every test hands it plain data and
// checks the named vectors, the band math (with hysteresis + cold-start
// honesty), the temporal histogram, and the layout transform's guarantees.
import { describe, it, expect } from 'vitest'
import { assessDrift, temporalProfile, densityAt, urgeMoments, applyGuardian } from './guardianEngine.js'

const at = (h, d = 20) => new Date(2026, 5, d, h, 0, 0).toISOString()
const NOW_10PM = new Date(2026, 5, 25, 22, 0, 0)
const NOW_10AM = new Date(2026, 5, 25, 10, 0, 0)

// A streak whose urge history clusters at ~10pm across several nights.
const NIGHT_STREAK = {
  startedAt: at(8, 1),
  bestSeconds: 30 * 86400,
  resets: [{ at: at(22, 10) }, { at: at(22.5, 14) }],
  urgesSurvived: [{ at: at(21.5, 17) }, { at: at(22, 19) }],
}

describe('cold start honesty', () => {
  it('an empty user is stable with zero evidence', () => {
    const a = assessDrift({ now: NOW_10PM })
    expect(a.band).toBe('stable')
    expect(a.evidenceCount).toBe(0)
    expect(a.window).toBeNull()
    for (const v of a.vectors) expect(v.score).toBe(0)
  })

  it('fewer than 3 urge moments → the temporal vector stays silent', () => {
    const t = temporalProfile({ resets: [{ at: at(22) }], urgesSurvived: [] }, NOW_10PM)
    expect(t.evidence).toBe(false)
    expect(t.score).toBe(0)
  })
})

describe('the temporal histogram', () => {
  it('resets weigh double as urge moments', () => {
    const m = urgeMoments({ resets: [{ at: at(22) }], urgesSurvived: [{ at: at(9) }] })
    expect(m.find((x) => x.hour === 22).weight).toBe(2)
    expect(m.find((x) => x.hour === 9).weight).toBe(1)
  })

  it('finds the 10pm cluster and scores NOW inside it high, outside it low', () => {
    const inWindow = temporalProfile(NIGHT_STREAK, NOW_10PM)
    const outWindow = temporalProfile(NIGHT_STREAK, NOW_10AM)
    expect(inWindow.evidence).toBe(true)
    expect(inWindow.peakHour).toBeGreaterThanOrEqual(21)
    expect(inWindow.peakHour).toBeLessThanOrEqual(23)
    expect(inWindow.score).toBeGreaterThan(0.8)
    expect(outWindow.score).toBeLessThan(0.2)
  })

  it('smoothing is circular — 11:30pm and 0:30am reinforce each other', () => {
    const moments = [
      { hour: 23.5, weight: 1 },
      { hour: 0.5, weight: 1 },
    ]
    expect(densityAt(0, moments)).toBeGreaterThan(densityAt(3, moments))
  })
})

describe('vectors and bands', () => {
  it('a stacked bad day goes critical, with the window named', () => {
    const a = assessDrift({
      now: NOW_10PM,
      health: { sleepHours: 5, hrv: 40 },
      baselines: { sleep: 7.5, hrv: 55 },
      summary: {
        widgets: new Array(6).fill({}),
        ignoredTypes: ['KpiGrid', 'StatRow', 'GoalProgress', 'InsightCard'],
        impact: { total: 3, missed: 2 },
      },
      streak: { ...NIGHT_STREAK, startedAt: at(8, 23) }, // day ~2 — fragile stretch
    })
    expect(a.band).toBe('critical')
    expect(a.evidenceCount).toBeGreaterThanOrEqual(2)
    expect(a.window.label).toContain('pm')
  })

  it('a rested, engaged, mid-run day is stable even inside the window', () => {
    const a = assessDrift({
      now: NOW_10PM,
      health: { sleepHours: 7.6, hrv: 58 },
      baselines: { sleep: 7.5, hrv: 55 },
      summary: { widgets: new Array(6).fill({}), ignoredTypes: [], impact: { total: 3, missed: 0 } },
      streak: { ...NIGHT_STREAK, startedAt: at(8, 1), bestSeconds: 200 * 86400 }, // day 24, far from best
    })
    expect(a.score).toBeLessThan(35)
    expect(a.band).toBe('stable')
  })

  it('hysteresis: 60 holds critical for a lastBand=critical user, but never starts it', () => {
    const base = {
      now: NOW_10PM,
      health: { sleepHours: 5.2, hrv: 44 },
      baselines: { sleep: 7.5, hrv: 55 },
      summary: {
        widgets: new Array(6).fill({}),
        ignoredTypes: ['KpiGrid', 'StatRow'],
        impact: { total: 2, missed: 1 },
      },
      streak: NIGHT_STREAK,
    }
    const fresh = assessDrift({ ...base, lastBand: 'stable' })
    const holding = assessDrift({ ...base, lastBand: 'critical' })
    expect(fresh.score).toBeGreaterThanOrEqual(55)
    expect(fresh.score).toBeLessThan(65)
    expect(fresh.band).toBe('watch')
    expect(holding.band).toBe('critical')
  })

  it('sleep debt degrades to the manual self-report without HealthKit', () => {
    const a = assessDrift({ now: NOW_10AM, wellnessToday: { sleep: 1 } })
    const sleep = a.vectors.find((v) => v.key === 'sleepDebt')
    expect(sleep.evidence).toBe(true)
    expect(sleep.score).toBe(0.8)
  })
})

describe('applyGuardian — the layout transform', () => {
  const layout = {
    schemaVersion: 1,
    defaultTab: 'today',
    tabs: [
      { key: 'today', label: 'Today', blocks: [{ type: 'DailyBriefing', id: 'b1', config: {} }] },
      { key: 'trends', label: 'Trends', blocks: [{ type: 'KpiGrid', id: 'k1', config: {} }] },
    ],
  }

  it('stable → the layout passes through untouched', () => {
    expect(applyGuardian(layout, { band: 'stable' }, {})).toBe(layout)
  })

  it('watch → injects ONE Guardian card at the top of the default tab', () => {
    const a = { band: 'watch', window: { label: 'around 10pm' } }
    const out = applyGuardian(layout, a, { streakModel: 'avoidance' })
    const today = out.tabs.find((t) => t.key === 'today')
    expect(today.blocks[0].id).toBe('guardian-drift')
    expect(today.blocks[0].config.tone).toBe('warn')
    expect(today.blocks).toHaveLength(2)
    expect(out.tabs.find((t) => t.key === 'trends').blocks).toHaveLength(1) // other tabs untouched
    expect(layout.tabs[0].blocks).toHaveLength(1) // immutable — input unchanged
  })

  it('critical → the card carries the neg tone', () => {
    const out = applyGuardian(layout, { band: 'critical', window: null }, {})
    expect(out.tabs[0].blocks[0].config.tone).toBe('neg')
  })

  it('idempotent — applying twice never stacks two cards', () => {
    const once = applyGuardian(layout, { band: 'watch', window: null }, {})
    const twice = applyGuardian(once, { band: 'watch', window: null }, {})
    expect(twice.tabs[0].blocks.filter((b) => b.id === 'guardian-drift')).toHaveLength(1)
  })
})
