// engagement.test.js — the Performance Loop's core, pinned at last. This module
// had ZERO coverage while housing the two worst shipped bugs found by the
// functionality tournament: a refactorPending flag that never expired (killing
// "Rule off the day" from day 2 forever) and heat-sheet posts that lived only
// in component state. These tests pin the fixes.
import { describe, it, expect, beforeEach } from 'vitest'
import { appDayKey } from './dates.js'
import {
  closeDay,
  getRefactorState,
  recordPost,
  unrecordPost,
  postedIds,
  registerImpact,
  completeImpact,
  summarizeDay,
} from './engagement.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

beforeEach(() => store.clear())

describe('refactorPending expires with the day it sealed (the day-2 revival)', () => {
  it('sealing TODAY leaves the flag pending for the rest of today', () => {
    closeDay(appDayKey())
    expect(getRefactorState().pending).toBe(true)
  })
  it('a seal from a PREVIOUS app-day no longer pins the button — rollover is the reset', () => {
    closeDay('2026-07-15') // yesterday's seal, persisted exactly as shipped builds wrote it
    const s = getRefactorState()
    expect(s.pending).toBe(false) // the old code returned true here FOREVER
    expect(s.lastClosedDay).toBe('2026-07-15')
  })
  it('the day after a seal, the day can be sealed again (the loop lives)', () => {
    closeDay('2026-07-15')
    expect(getRefactorState().pending).toBe(false)
    closeDay(appDayKey()) // day 2's seal must be possible
    expect(getRefactorState().pending).toBe(true)
  })
})

describe('posted rows persist per app-day (the heat sheet keeps its ink)', () => {
  it('a posted row survives a "reload" (fresh read of the record)', () => {
    recordPost('sched:1')
    expect(postedIds()).toContain('sched:1')
  })
  it('un-posting removes it; days are independent', () => {
    recordPost('sched:1')
    recordPost('sched:2', '2026-07-15')
    unrecordPost('sched:1')
    expect(postedIds()).not.toContain('sched:1')
    expect(postedIds('2026-07-15')).toContain('sched:2')
  })
  it('a sealed day refuses the walk-back — the tape is final', () => {
    recordPost('sched:1')
    closeDay(appDayKey())
    unrecordPost('sched:1')
    expect(postedIds()).toContain('sched:1')
  })
  it('pre-fix day records (no posted map) read cleanly', () => {
    // A record written by a build before `posted` existed.
    store.set(
      'lockedin:__engagement',
      JSON.stringify({ days: { [appDayKey()]: { widgets: {}, impact: {}, closed: false, closedAt: null } }, refactorPending: false, lastClosedDay: null })
    )
    expect(postedIds()).toEqual([])
    recordPost('sched:0') // and writes cleanly onto the migrated shape
    expect(postedIds()).toContain('sched:0')
  })
})

describe('impact + close interplay (regression net around the fixes)', () => {
  it('closeDay marks pending impact as missed and seals', () => {
    registerImpact('row-a', 'Deep work')
    completeImpact('row-a')
    registerImpact('row-b', 'Run')
    closeDay(appDayKey())
    const sum = summarizeDay()
    expect(sum.closed).toBe(true)
    expect(sum.impact.done).toBe(1)
    expect(sum.impact.missed).toBe(1)
  })
})
