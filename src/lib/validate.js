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

// A readiness dimension: 1–5, or undefined if unset/garbage.
const level = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return Math.min(5, Math.max(1, Math.round(n)))
}

// The known theme skins (mirrors THEMES in theme.jsx — kept inline so validate.js
// stays dependency-free). Pre-Split-Ledger keys are MAPPED here rather than
// dropped: this sanitizer runs on every storage read, so if it discarded a
// legacy value ThemeProvider would never get the chance to migrate it. A
// corrupt/unknown value is dropped to undefined so it can never reach the
// data-theme attribute; ThemeProvider then uses the default.
const THEME_SKINS = ['split_book', 'lamplight', 'carbon']
const LEGACY_SKINS = { zen: 'split_book', night_ops: 'lamplight', terminal: 'carbon' }
function themeKey(v) {
  if (THEME_SKINS.includes(v)) return v
  if (Object.prototype.hasOwnProperty.call(LEGACY_SKINS, v)) return LEGACY_SKINS[v]
  return undefined
}

const sanitizers = {
  // Readiness check-in: object keyed by app-day, each a small self-report.
  wellness(obj) {
    if (!isObj(obj)) return {}
    const out = {}
    for (const [day, e] of Object.entries(obj)) {
      if (!isObj(e)) continue
      const rhr = Number(e.rhr)
      out[day] = {
        ...e,
        sleep: level(e.sleep),
        legs: level(e.legs),
        mind: level(e.mind),
        rhr: Number.isFinite(rhr) && rhr > 0 ? Math.min(220, Math.max(20, Math.round(rhr))) : undefined,
      }
    }
    return out
  },

  settings(s) {
    if (!isObj(s)) return s
    return {
      ...s,
      name: str(s.name, 60),
      moneyGoal: num(s.moneyGoal, { min: 0, max: 10_000_000, fallback: 3500 }),
      focusShortcutName: str(s.focusShortcutName, 60) || 'Sprint',
      theme: themeKey(s.theme),
      partners: asArr(s.partners)
        .filter(isObj)
        .slice(0, 50)
        .map((p) => ({ id: str(p.id, 40), name: str(p.name, 60), phone: str(p.phone, 30) })),
      shoes: asArr(s.shoes)
        .filter((x) => typeof x === 'string')
        .slice(0, 100)
        .map((x) => str(x, 60)),
      // Dictated day blocks — user-authored, so cleaned like any import: a
      // block with no label is an empty line and drops.
      dayBlocks: asArr(s.dayBlocks)
        .filter(isObj)
        .slice(0, 12)
        .map((b) => ({
          id: str(b.id, 40),
          time: str(b.time, 5),
          block: str(b.block, 80),
          impact: b.impact === 'high' ? 'high' : undefined,
        }))
        .filter((b) => b.block),
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

  // The Guardian's Handover. Caps everything hard — drafts hold pasted reports,
  // so an uncapped body could blow the localStorage quota and brick a read.
  handover(h) {
    if (!isObj(h)) return { drafts: [], considerations: [] }
    const drafts = asArr(h.drafts)
      .filter(isObj)
      .slice(0, 50)
      .map((d) => ({
        id: str(d.id, 40),
        kind: str(d.kind, 20) || 'note',
        body: str(d.body, 5000),
        attachments: asArr(d.attachments)
          .filter(isObj)
          .slice(0, 20)
          .map((a) => ({ name: str(a.name, 200), size: num(a.size, { min: 0, max: 1e9 }), type: str(a.type, 80) })),
        createdAt: str(d.createdAt, 40),
        updatedAt: str(d.updatedAt, 40),
      }))
    const considerations = asArr(h.considerations)
      .filter(isObj)
      .slice(0, 200)
      .map((c) => ({
        id: str(c.id, 40),
        heading: str(c.heading, 40) || 'Consider',
        source: str(c.source, 20),
        text: str(c.text, 2000),
        synthesis: str(c.synthesis, 20),
        at: str(c.at, 40),
        dismissed: !!c.dismissed,
      }))
    const counselAck = asArr(h.counselAck)
      .filter(isObj)
      .slice(0, 100)
      .map((a) => ({ key: str(a.key, 40), day: str(a.day, 10) }))
    return { drafts, considerations, counselAck }
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
