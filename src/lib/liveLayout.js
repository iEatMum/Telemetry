// liveLayout.js — build a real Server-Driven UI payload from the LOCAL store.
//
// This is the bridge that turns the terminal deck from "sample config" into the
// actual app: it reads the live slices (streak, checklist, tasks, sprints,
// wellness, runs, income, engagement) and emits the same {tabs:[{blocks}]} shape
// the widgets already render. Local-first — no backend involved. When the
// Architect backend is live it will REPLACE this with an AI-authored payload;
// until then (and always, as the offline fallback) this is the source of truth.
//
// Honesty notes baked in:
//   • EnergyTrendLine has no hourly-energy source, so it's mapped to the 14-day
//     readiness trend (energy's closest real signal). Empty until you log
//     readiness check-ins → the widget shows its own "no data" state.
//   • MarketSentimentWidget has no live BTC/S&P feed, so it's reframed as your
//     INTERNAL markets — Streak / Readiness / Focus as three tradeable assets.

import { streakDays, dateKey, appDayKey, lastNDates } from './dates.js'
import { isDue } from './tasks.js'
import { readiness } from './wellness.js'
import { refactorSignals } from './engagement.js'

const norm = (v) => (v === true ? 'done' : v || 'open')
const shortDay = (key) => {
  const [, m, d] = key.split('-')
  return `${+m}/${+d}`
}

// ── Today ───────────────────────────────────────────────────────────────────
function scheduleRows(store) {
  const { settings, checklist, tasks } = store
  const today = checklist[appDayKey()] || {}
  const rows = [
    { time: settings.wakeTime || '06:45', block: 'Wake — feet on floor', status: norm(today.wake), impact: 'high' },
    { time: '', block: 'Morning run', status: norm(today.run), impact: 'high' },
    { time: settings.bedTime || '22:15', block: 'Phone out of the room', status: norm(today.phone) },
  ]
  const tk = dateKey()
  for (const t of tasks.filter((t) => isDue(t, tk))) {
    rows.push({ time: '', block: t.title, status: 'open' })
  }
  for (const t of tasks.filter((t) => t.recurrence?.type === 'none' && t.done && t.history?.at(-1)?.date === tk)) {
    rows.push({ time: '', block: t.title, status: 'done' })
  }
  return rows
}

function pulseTiles(store) {
  const days = streakDays(store.streak.startedAt)
  const tk = dateKey()
  const sprintsToday = store.sprints.find((s) => s.date === tk)?.count || 0
  return [
    { label: 'Streak', value: String(days), unit: 'days', accent: true },
    { label: 'Sprints', value: String(sprintsToday), unit: 'today' },
    { label: 'Clean', value: String(store.streak.cleanDates.length), unit: 'lifetime' },
    { label: 'Outlasted', value: String(store.streak.urgesSurvived.length), unit: 'urges' },
  ]
}

function goalItems(store) {
  const tk = dateKey()
  const month = tk.slice(0, 7)
  const moneyMonth = store.income
    .filter((e) => (e.date || '').startsWith(month))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const goal = store.settings.moneyGoal || 3500
  const weekKeys = new Set(lastNDates(7))
  const miles = store.runs
    .filter((r) => weekKeys.has(r.date))
    .reduce((s, r) => s + (Number(r.miles) || 0), 0)
  const items = [
    { label: 'Monthly income', value: moneyMonth, max: goal, right: `$${moneyMonth} / $${goal}`, tone: 'accent' },
    {
      label: 'Weekly mileage',
      value: miles,
      max: store.settings.weeklyMileageGoal || 35,
      right: `${miles.toFixed(miles % 1 ? 1 : 0)} mi`,
      tone: 'pos',
    },
  ]
  const r = readiness(store.wellness[appDayKey()])
  if (r) {
    items.push({
      label: 'Readiness',
      value: r.score,
      max: 5,
      right: `${r.score} / 5 · ${r.label}`,
      tone: r.score >= 4 ? 'pos' : r.score <= 2 ? 'neg' : 'warn',
    })
  }
  return items
}

function briefingConfig(summary) {
  const imp = summary.impact || { total: 0, done: 0, missed: 0, pending: 0 }
  const impactTone = !imp.total ? 'muted' : imp.done === imp.total ? 'pos' : 'neg'
  const rate = summary.engagementRate || 0
  return {
    date: `${appDayKey()} · live`,
    stats: [
      { label: 'Impact', value: `${imp.done}/${imp.total || 0}`, tone: impactTone },
      { label: 'Engaged', value: `${rate}%`, tone: rate >= 50 ? 'pos' : 'warn' },
      { label: 'Cards', value: `${(summary.used || []).length}/${(summary.widgets || []).length}`, tone: 'muted' },
    ],
    drivers: refactorSignals(safeSummary(summary)),
  }
}

// ── Trends ───────────────────────────────────────────────────────────────────
function energyPoints(store) {
  const keys = [...lastNDates(14)].sort() // chronological
  const pts = []
  for (const k of keys) {
    const r = readiness(store.wellness[k])
    if (r) pts.push({ t: shortDay(k), v: r.score * 20 })
  }
  return pts
}

function internalMarkets(store, summary) {
  const days = streakDays(store.streak.startedAt)
  const r = readiness(store.wellness[appDayKey()])
  const readyVal = r ? r.score * 20 : 0
  const focus = summary.engagementRate || 0
  // Composite 0..100: streak (capped 30d) + readiness + focus, averaged.
  const score = Math.round((Math.min(days, 30) / 30) * 100 * 0.34 + readyVal * 0.33 + focus * 0.33)
  return {
    label: 'Internal Markets',
    status: 'Live',
    sentiment: { score },
    tickers: [
      { symbol: 'Streak', last: String(days), changePct: 0 },
      { symbol: 'Readiness', last: r ? String(readyVal) : '—', changePct: 0 },
      { symbol: 'Focus', last: String(focus), changePct: 0, focus: true },
    ],
  }
}

// ── Mind ─────────────────────────────────────────────────────────────────────
function lifetimeStats(store) {
  const best = Math.floor((store.streak.bestSeconds || 0) / 86400)
  return [
    { label: 'Clean days', value: String(store.streak.cleanDates.length), accent: true },
    { label: 'Outlasted', value: String(store.streak.urgesSurvived.length) },
    { label: 'Best', value: `${best}d` },
  ]
}

function safeSummary(s) {
  return {
    impact: s?.impact || { total: 0, done: 0, missed: 0, pending: 0, missedLabels: [], pendingLabels: [] },
    ignoredTypes: s?.ignoredTypes || [],
    usedTypes: s?.usedTypes || [],
    engagementRate: s?.engagementRate || 0,
  }
}

/**
 * The whole live payload. `store` is the useStore() value; `summary` is the
 * useEngagementSummary() value (both optional-safe). Run the result through
 * normalizeLayout before handing it to LayoutHost.
 */
export function buildLiveLayout(store, summary) {
  const sum = safeSummary(summary)
  const sig = refactorSignals(sum)

  return {
    schemaVersion: 1,
    defaultTab: 'today',
    tabs: [
      {
        key: 'today',
        label: 'Today',
        blocks: [
          { type: 'DailyBriefing', id: 'live-briefing', config: briefingConfig(summary || {}) },
          { type: 'ScheduleMatrix', id: 'live-sched', config: { title: 'Today', rows: scheduleRows(store) } },
          { type: 'KpiGrid', id: 'live-kpis', config: { title: 'Pulse', cols: 2, items: pulseTiles(store) } },
          { type: 'GoalProgress', id: 'live-goals', config: { title: 'Targets', items: goalItems(store) } },
        ],
      },
      {
        key: 'trends',
        label: 'Trends',
        blocks: [
          { type: 'EnergyTrendLine', id: 'live-energy', config: { label: 'Readiness · 14d', unit: '/100', points: energyPoints(store) } },
          { type: 'MarketSentimentWidget', id: 'live-mkt', config: internalMarkets(store, summary || {}) },
        ],
      },
      {
        key: 'mind',
        label: 'Mind',
        blocks: [
          { type: 'InsightCard', id: 'live-insight', config: { heading: 'Counsel', source: 'live', text: sig[0]?.text || 'Keep working the deck — the AI adapts as it learns what you use.', tone: sig[0]?.tone } },
          { type: 'StatRow', id: 'live-stats', config: { title: 'Lifetime', cols: 3, items: lifetimeStats(store) } },
        ],
      },
    ],
  }
}
