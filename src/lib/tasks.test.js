// tasks.test.js — the recurring-task engine: recurrence math, due-gating, labels.
// Dates are built from explicit Y/M/D keys so results are time-zone independent.
import { describe, it, expect } from 'vitest'
import { computeNextDue, isDue, recurrenceLabel, seedTasks } from './tasks.js'

describe('computeNextDue', () => {
  it('daily advances one calendar day', () => {
    expect(computeNextDue('2026-06-22', { type: 'daily' })).toBe('2026-06-23')
  })

  it('weekly lands on the next occurrence of the weekday', () => {
    // 2026-06-22 is a Monday; next Saturday (weekday 6) is the 27th
    expect(computeNextDue('2026-06-22', { type: 'weekly', weekday: 6 })).toBe('2026-06-27')
    // completing ON the target weekday rolls to the following week
    expect(computeNextDue('2026-06-27', { type: 'weekly', weekday: 6 })).toBe('2026-07-04')
  })

  it('everyN days adds n days', () => {
    expect(computeNextDue('2026-06-22', { type: 'everyN', n: 3, unit: 'days' })).toBe('2026-06-25')
  })

  it('REGRESSION: monthly clamps to the month-end instead of drifting (Jan 31 → Feb 28)', () => {
    // Native setMonth would overflow Jan 31 + 1mo into Mar 3 and permanently drift.
    expect(computeNextDue('2025-01-31', { type: 'everyN', n: 1, unit: 'months' })).toBe('2025-02-28')
    // leap year keeps Feb 29
    expect(computeNextDue('2024-01-31', { type: 'everyN', n: 1, unit: 'months' })).toBe('2024-02-29')
  })

  it('one-time tasks have no next due date', () => {
    expect(computeNextDue('2026-06-22', { type: 'none' })).toBeNull()
    expect(computeNextDue('2026-06-22', undefined)).toBeNull()
  })
})

describe('isDue', () => {
  it('is due when scheduled on or before today and not done', () => {
    expect(isDue({ nextDue: '2026-06-22', done: false }, '2026-06-22')).toBe(true)
    expect(isDue({ nextDue: '2026-06-10', done: false }, '2026-06-22')).toBe(true)
  })

  it('is not due when scheduled in the future', () => {
    expect(isDue({ nextDue: '2026-06-23', done: false }, '2026-06-22')).toBe(false)
  })

  it('a completed or missing task is never due', () => {
    expect(isDue({ nextDue: '2026-06-20', done: true }, '2026-06-22')).toBe(false)
    expect(isDue(null, '2026-06-22')).toBe(false)
  })

  it('treats a missing nextDue as due-now', () => {
    expect(isDue({ done: false }, '2026-06-22')).toBe(true)
  })
})

describe('recurrenceLabel', () => {
  it('renders each recurrence type', () => {
    expect(recurrenceLabel({ type: 'daily' })).toBe('Daily')
    expect(recurrenceLabel({ type: 'weekly', weekday: 6 })).toBe('Weekly · Sat')
    expect(recurrenceLabel({ type: 'everyN', n: 1, unit: 'months' })).toBe('Monthly')
    expect(recurrenceLabel({ type: 'everyN', n: 2, unit: 'months' })).toBe('Every 2 months')
    expect(recurrenceLabel({ type: 'everyN', n: 3, unit: 'days' })).toBe('Every 3 days')
    expect(recurrenceLabel(undefined)).toBe('One-time')
  })
})

describe('seedTasks', () => {
  it('seeds the five recurring tasks with stable ids', () => {
    const seeded = seedTasks('2026-06-22')
    expect(seeded).toHaveLength(5)
    expect(seeded.every((t) => t.id.startsWith('seed-'))).toBe(true)
    expect(seeded.every((t) => t.done === false)).toBe(true)
  })
})
