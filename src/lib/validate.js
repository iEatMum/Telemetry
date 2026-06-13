// validate.js — checks and balances for the data layer.
//
// sanitize(name, value) returns a cleaned copy of a store: numbers clamped to
// sane ranges, strings length-capped, malformed array items dropped, shapes
// enforced. storage.get() runs this on EVERY read, so corrupt localStorage
// (iOS eviction, a hand-edited export, a future bug) can never poison the UI.
//
// It's deliberately forgiving: unknown fields are preserved, and anything it
// can't parse falls back rather than throwing.

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
const asArr = (v) => (Array.isArray(v) ? v : [])

function str(v, max = 280) {
  return typeof v === 'string' ? v.slice(0, max) : ''
}
function num(v, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

const sanitizers = {
  settings(s) {
    if (!isObj(s)) return s
    return {
      ...s,
      name: str(s.name, 60),
      moneyGoal: num(s.moneyGoal, { min: 0, max: 10_000_000, fallback: 3500 }),
      focusShortcutName: str(s.focusShortcutName, 60) || 'Sprint',
      partners: asArr(s.partners)
        .filter(isObj)
        .slice(0, 50)
        .map((p) => ({ id: str(p.id, 40), name: str(p.name, 60), phone: str(p.phone, 30) })),
      shoes: asArr(s.shoes)
        .filter((x) => typeof x === 'string')
        .slice(0, 100)
        .map((x) => str(x, 60)),
    }
  },

  streak(s) {
    if (!isObj(s)) return s
    return {
      ...s,
      bestSeconds: num(s.bestSeconds, { min: 0, max: 4e9 }),
      cleanDates: [...new Set(asArr(s.cleanDates).filter((d) => typeof d === 'string'))], // dedupe
      resets: asArr(s.resets).filter(isObj),
      urgesSurvived: asArr(s.urgesSurvived).filter(isObj),
    }
  },

  income(list) {
    return asArr(list)
      .filter(isObj)
      .filter((e) => Number.isFinite(Number(e.amount)) && Number(e.amount) > 0)
      .map((e) => ({
        id: str(e.id, 40),
        date: str(e.date, 10),
        amount: num(e.amount, { min: 0, max: 1_000_000 }),
        source: str(e.source, 40) || 'Other',
      }))
  },

  runs(list) {
    return asArr(list)
      .filter(isObj)
      .map((r) => ({
        ...r,
        id: str(r.id, 40),
        date: str(r.date, 10),
        type: str(r.type, 20) || 'Easy',
        miles: num(r.miles, { min: 0, max: 500 }),
        minutes: num(r.minutes, { min: 0, max: 6000 }),
        rpe: num(r.rpe, { min: 0, max: 10 }),
        note: str(r.note, 280),
        shoe: str(r.shoe, 60),
        warmup: !!r.warmup,
      }))
  },

  sprints(list) {
    return asArr(list)
      .filter(isObj)
      .map((s) => ({
        ...s,
        date: str(s.date, 10),
        count: num(s.count, { min: 0, max: 1000 }),
        labels: asArr(s.labels).filter((x) => typeof x === 'string').map((x) => str(x, 120)),
      }))
  },

  tasks(list) {
    return asArr(list)
      .filter(isObj)
      .filter((t) => str(t.title, 200).trim().length > 0)
      .map((t) => ({
        ...t,
        title: str(t.title, 200),
        cat: str(t.cat, 20) || 'Life',
        history: asArr(t.history).filter(isObj),
        done: !!t.done,
      }))
  },
}

export function sanitize(name, value) {
  const fn = sanitizers[name]
  if (!fn) return value
  try {
    return fn(value)
  } catch {
    return value // never let cleaning crash a read
  }
}
