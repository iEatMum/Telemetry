// tasks.js — the recurring-task engine. The "anticipate things" feature: tasks
// that come due on their own schedule, surface on Today when due, and reschedule
// themselves when you complete them.
//
// recurrence shape: { type, ... }
//   { type: 'none' }                          one-time
//   { type: 'daily' }                         every day
//   { type: 'weekly', weekday: 0..6 }         every week on that weekday (0 = Sun)
//   { type: 'everyN', n, unit: 'days'|'months' }

import { dateKey, WEEKDAYS } from './dates.js'

export const CATEGORIES = ['Faith', 'Run', 'Work', 'Life', 'Body']

// Presets offered in the "add task" UI (weekday/n filled in at creation time).
export const RECURRENCE_PRESETS = [
  { label: 'One-time', make: () => ({ type: 'none' }) },
  { label: 'Daily', make: () => ({ type: 'daily' }) },
  { label: 'Weekly', make: (d = new Date()) => ({ type: 'weekly', weekday: d.getDay() }) },
  { label: 'Monthly', make: () => ({ type: 'everyN', n: 1, unit: 'months' }) },
]

function parse(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function addMonths(date, n) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

// The next date on/after `from` that lands on `weekday`.
function onOrAfterWeekday(from, weekday) {
  const d = new Date(from)
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1)
  return d
}

// Given a completion date, when is this task due next? null for one-time.
export function computeNextDue(fromKey, recurrence) {
  const from = parse(fromKey)
  switch (recurrence?.type) {
    case 'daily':
      return dateKey(addDays(from, 1))
    case 'weekly':
      return dateKey(onOrAfterWeekday(addDays(from, 1), recurrence.weekday ?? from.getDay()))
    case 'everyN':
      return recurrence.unit === 'months'
        ? dateKey(addMonths(from, recurrence.n || 1))
        : dateKey(addDays(from, recurrence.n || 1))
    default:
      return null // 'none'
  }
}

// Is this task due to show on Today right now?
export function isDue(task, todayKey) {
  if (!task || task.recurrence?.type === 'none') return !task.done
  return (task.nextDue || todayKey) <= todayKey
}

// Human-readable schedule, for the task row.
export function recurrenceLabel(recurrence) {
  switch (recurrence?.type) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return `Weekly · ${WEEKDAYS[recurrence.weekday ?? 0].slice(0, 3)}`
    case 'everyN':
      if (recurrence.unit === 'months') return recurrence.n === 1 ? 'Monthly' : `Every ${recurrence.n} months`
      return `Every ${recurrence.n} days`
    default:
      return 'One-time'
  }
}

// First-run seed — the recurring tasks from the spec.
export function seedTasks(todayKey = dateKey()) {
  const today = parse(todayKey)
  const upcoming = (weekday) => dateKey(onOrAfterWeekday(today, weekday))
  const id = (s) => `seed-${s}`
  return [
    {
      id: id('creatine'),
      title: 'Creatine + supplements',
      cat: 'Body',
      recurrence: { type: 'daily' },
      nextDue: todayKey,
      done: false,
      history: [],
    },
    {
      id: id('room'),
      title: 'Clean room',
      cat: 'Life',
      recurrence: { type: 'weekly', weekday: 6 }, // Saturday
      nextDue: upcoming(6),
      done: false,
      history: [],
    },
    {
      id: id('laundry'),
      title: 'Laundry',
      cat: 'Life',
      recurrence: { type: 'weekly', weekday: 0 }, // Sunday
      nextDue: upcoming(0),
      done: false,
      history: [],
    },
    {
      id: id('car'),
      title: 'Car check — oil, tires, fluids',
      cat: 'Life',
      recurrence: { type: 'everyN', n: 1, unit: 'months' },
      nextDue: todayKey,
      done: false,
      history: [],
    },
    {
      id: id('nap'),
      title: 'Nap after long run',
      cat: 'Body',
      recurrence: { type: 'weekly', weekday: 0 }, // Sunday
      nextDue: upcoming(0),
      done: false,
      history: [],
    },
  ]
}
