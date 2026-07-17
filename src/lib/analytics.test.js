// analytics.test.js — the private tally.
//
// The contract that matters is the PRIVACY one — counts only, no content — plus
// the retention math's honesty: an un-elapsed window answers null (unknowable),
// never false (churned). localStorage is shimmed as in purchases.test.js.
import { describe, it, expect, beforeEach } from 'vitest'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { track, trackDailyOpen, retention, metricsSnapshot } = await import('./analytics.js')

const KEY = 'lockedin:__metrics'
const seed = (v) => store.set(KEY, JSON.stringify(v))

beforeEach(() => store.clear())

describe('track — named counters', () => {
  it('increments per event name and stores nothing but the count', () => {
    track('paywall_view')
    track('paywall_view')
    track('trial_start')
    const s = metricsSnapshot()
    expect(s.events).toEqual({ paywall_view: 2, trial_start: 1 })
  })

  it('ignores junk names', () => {
    track()
    track(42)
    expect(metricsSnapshot().events).toEqual({})
  })

  it('survives corrupt storage', () => {
    store.set(KEY, '{corrupt')
    expect(() => track('x')).not.toThrow()
    expect(metricsSnapshot().events.x).toBe(1)
  })
})

describe('trackDailyOpen', () => {
  it('stamps firstOpenAt once and counts opens per day', () => {
    trackDailyOpen('2026-07-11')
    trackDailyOpen('2026-07-11')
    trackDailyOpen('2026-07-12')
    const s = metricsSnapshot()
    expect(s.firstOpenAt).toBeTruthy()
    const first = s.firstOpenAt
    expect(s.days['2026-07-11'].opens).toBe(2)
    expect(s.days['2026-07-12'].opens).toBe(1)
    trackDailyOpen('2026-07-13')
    expect(metricsSnapshot().firstOpenAt).toBe(first) // never re-stamped
  })
})

describe('retention — null means unknowable, not churned', () => {
  const FIRST = '2026-07-01T12:00:00.000Z'

  it('answers null before the window has elapsed', () => {
    seed({ firstOpenAt: FIRST, days: { '2026-07-01': { opens: 1 } }, events: {} })
    const r = retention(new Date('2026-07-01T18:00:00Z'))
    expect(r.d1).toBeNull()
    expect(r.d7).toBeNull()
  })

  it('sees a day-1 return', () => {
    seed({
      firstOpenAt: FIRST,
      days: { '2026-07-01': { opens: 1 }, '2026-07-02': { opens: 1 } },
      events: {},
    })
    const r = retention(new Date('2026-07-03T12:00:00Z'))
    expect(r.d1).toBe(true)
  })

  it('a no-show after the window is an honest false', () => {
    seed({ firstOpenAt: FIRST, days: { '2026-07-01': { opens: 1 } }, events: {} })
    const r = retention(new Date('2026-07-10T12:00:00Z'))
    expect(r.d1).toBe(false)
    expect(r.d7).toBe(false)
  })

  it('a mid-week return counts for day-7', () => {
    seed({
      firstOpenAt: FIRST,
      days: { '2026-07-01': { opens: 1 }, '2026-07-05': { opens: 1 } },
      events: {},
    })
    const r = retention(new Date('2026-07-09T12:00:00Z'))
    expect(r.d7).toBe(true)
    expect(r.d1).toBe(false)
  })

  it('no first open yet → both null', () => {
    expect(retention()).toEqual({ d1: null, d7: null })
  })
})
