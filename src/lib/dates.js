// dates.js — all date/time logic, in the device's LOCAL time zone.
//
// The one non-obvious rule: the "app day" rolls over at 3:00am, not midnight.
// So the morning checklist you tick at 12:30am still belongs to the day before —
// you haven't slept yet. Everything that resets "daily" uses appDayKey().

const DAY_ROLLOVER_HOUR = 3

// 'YYYY-MM-DD' in local time (plain calendar date, no rollover).
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM-DD' for the app's notion of "today" — before 3am counts as yesterday.
export function appDayKey(d = new Date()) {
  const shifted = new Date(d)
  if (shifted.getHours() < DAY_ROLLOVER_HOUR) {
    shifted.setDate(shifted.getDate() - 1)
  }
  return dateKey(shifted)
}

// 1–366. Used to rotate the daily verse so it's stable for the whole day.
export function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d - start
  return Math.floor(diff / 86400000)
}

// Break an elapsed span into days/hours/minutes/seconds for the race-clock.
export function elapsedParts(fromISO, to = new Date()) {
  if (!fromISO) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 }
  const start = new Date(fromISO).getTime()
  const totalSeconds = Math.max(0, Math.floor((to.getTime() - start) / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, totalSeconds }
}

// Whole days only — the "n day streak" number.
export function streakDays(fromISO, to = new Date()) {
  return elapsedParts(fromISO, to).days
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// "Thursday, June 11"
export function longDate(d = new Date()) {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// Greeting that matches the time of day (he opens this at 6:45am and 10:15pm).
export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night'
}

export function isSunday(d = new Date()) {
  return d.getDay() === 0
}

// Calendar scaffolding for a month: which weekday the 1st lands on + day count.
export function monthInfo(year, month /* 0-based */) {
  const first = new Date(year, month, 1)
  return {
    year,
    month,
    label: `${MONTHS[month]} ${year}`,
    firstWeekday: first.getDay(), // 0 = Sunday
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  }
}

// The last n calendar dates (oldest → newest) as keys — for the sprint bar chart.
export function lastNDates(n, end = new Date()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    out.push(dateKey(d))
  }
  return out
}

// Days between today and a target date (e.g. report-to-college). Negative = past.
export function daysUntil(targetKey, from = new Date()) {
  if (!targetKey) return null
  const [y, m, d] = targetKey.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((target - base) / 86400000)
}

export { WEEKDAYS, MONTHS }
