// dates.test.js — local-time date logic, incl. the 3am "app day" rollover.
// Dates are constructed from components (local time) so assertions don't depend
// on the machine's time zone.
import { describe, it, expect } from 'vitest'
import {
  dateKey, appDayKey, daysUntil, streakDays, elapsedParts,
  isSunday, lastNDates, daysInMonth, daysLeftInMonth, longDate, greeting,
  WEEKDAYS, MONTHS,
} from './dates.js'

describe('dateKey', () => {
  it('formats YYYY-MM-DD with zero padding', () => {
    expect(dateKey(new Date(2026, 5, 22))).toBe('2026-06-22')
    expect(dateKey(new Date(2026, 0, 4))).toBe('2026-01-04')
  })
})

describe('appDayKey — 3am rollover', () => {
  it('counts the small hours as the previous day', () => {
    expect(appDayKey(new Date(2026, 5, 22, 1, 30))).toBe('2026-06-21')
    expect(appDayKey(new Date(2026, 5, 22, 2, 59, 59))).toBe('2026-06-21')
  })

  it('rolls to the new day at exactly 3am', () => {
    expect(appDayKey(new Date(2026, 5, 22, 3, 0, 0))).toBe('2026-06-22')
    expect(appDayKey(new Date(2026, 5, 22, 23, 0, 0))).toBe('2026-06-22')
  })
})

describe('daysUntil', () => {
  it('counts forward, backward, and guards null', () => {
    expect(daysUntil('2026-06-25', new Date(2026, 5, 22))).toBe(3)
    expect(daysUntil('2026-06-20', new Date(2026, 5, 22))).toBe(-2)
    expect(daysUntil(null, new Date(2026, 5, 22))).toBeNull()
  })
})

describe('elapsedParts / streakDays', () => {
  it('breaks an exact 2-day span into whole days', () => {
    const from = new Date(2026, 5, 20, 12, 0, 0).toISOString()
    const to = new Date(2026, 5, 22, 12, 0, 0)
    expect(streakDays(from, to)).toBe(2)
  })

  it('returns zeros for a missing start', () => {
    expect(elapsedParts(null)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })
  })
})

describe('calendar helpers', () => {
  it('isSunday', () => {
    expect(isSunday(new Date(2026, 5, 21))).toBe(true) // 2026-06-21 is a Sunday
    expect(isSunday(new Date(2026, 5, 22))).toBe(false)
  })

  it('lastNDates returns oldest → newest keys', () => {
    expect(lastNDates(3, new Date(2026, 5, 22))).toEqual(['2026-06-20', '2026-06-21', '2026-06-22'])
  })

  it('daysInMonth / daysLeftInMonth', () => {
    expect(daysInMonth(new Date(2026, 5, 1))).toBe(30) // June
    expect(daysLeftInMonth(new Date(2026, 5, 22))).toBe(9) // 30 - 22 + 1
  })
})

describe('display strings', () => {
  it('longDate and greeting', () => {
    expect(longDate(new Date(2026, 5, 22))).toBe('Monday, June 22')
    expect(greeting(new Date(2026, 5, 22, 7, 0))).toBe('Good morning')
    expect(greeting(new Date(2026, 5, 22, 22, 0))).toBe('Late night')
    expect(greeting(new Date(2026, 5, 22, 4, 0))).toBe('Still up')
  })

  it('exposes weekday/month tables', () => {
    expect(WEEKDAYS).toHaveLength(7)
    expect(MONTHS).toHaveLength(12)
    expect(WEEKDAYS[1]).toBe('Monday')
  })
})
