// liveLayout.js — build a real Server-Driven UI payload from the LOCAL store.
//
// This is the bridge that turns the terminal deck from "sample config" into the
// actual app: it reads the live slices (streak, checklist, tasks, sprints,
// wellness, runs, income, engagement) and emits the same {tabs:[{blocks}]} shape
// the widgets already render. Local-first — no backend involved. When the
// Architect backend is live it will REPLACE this with an AI-authored payload;
// until then (and always, as the offline fallback) this is the source of truth.
//
// Composition doctrine (handoff spec §5 — the forge's layout rules):
//   • TODAY's deck order adapts to the motivational profile (streakModel):
//     avoidance leads with the chain, accumulation with the lifetime piles,
//     engagement with the next rep only. The client stays profile-blind for
//     SERVER layouts — this ordering lives only in the local fallback, which is
//     this build's forge.
//   • Day-0 override (all profiles): a reset within 48h promotes the lifetime
//     StatRow to slot 1 and demotes the current-run streak stat — zero is never
//     the dominant numeral (R4).
//   • The faith module renders ONE un-scored card, only when opted in (R3) —
//     it closes the TRENDS page (M2 folded MIND into TRENDS), after the data,
//     never among the metrics.
//   • Sundays push a REVIEW tab (R6) — the weekly reckoning arrives as a face,
//     not a buried modal.
//
// Honesty notes baked in:
//   • EnergyTrendLine has no hourly-energy source, so it's mapped to the 14-day
//     readiness trend (energy's closest real signal). Empty until you log
//     readiness check-ins → the widget shows its own "no data" state.
//   • The perps-era MarketSentimentWidget is GONE (M2 de-perps): the reflective
//     page reads as a ledger — the week's balance, not a market.

import { streakDays, dateKey, appDayKey, lastNDates, isAppSunday } from './dates.js'
import { isDue } from './tasks.js'
import { readiness } from './wellness.js'
import { refactorSignals, summarizeDay } from './engagement.js'
import { verseForDay } from './verses.js'

const norm = (v) => (v === true ? 'done' : v || 'open')
const shortDay = (key) => {
  const [, m, d] = key.split('-')
  return `${+m}/${+d}`
}

const DAY0_MS = 48 * 60 * 60 * 1000

/**
 * True in the day-0 window (R4) — the deck leads with the lifetime pile + first
 * block instead of a wall of zeros. Fires within 48h of the last reset, AND for
 * a brand-new book (no resets yet) within 48h of the streak's start. Without the
 * second clause a fresh install — the single most loaded moment, right after a
 * 15-step onboarding — got the full-zeros layout it was designed to avoid.
 */
function isDay0(store) {
  const s = store.streak || {}
  const last = (s.resets || []).at(-1)
  if (last) return Date.now() - Date.parse(last.at) < DAY0_MS
  return !!s.startedAt && Date.now() - Date.parse(s.startedAt) < DAY0_MS
}

// ── Density (executionRate7d → how many active blocks the deck carries) ───────
// The survey's behavioral baseline scales the schedule: a ramp user gets a short,
// winnable deck; an elite user gets the full stack. This is the client forge's
// density override — the honest seam for it (normalizeLayout stays purely
// defensive; business scaling lives here where the payload is composed).
export function densityTier(executionRate7d) {
  if (Number.isInteger(executionRate7d)) {
    if (executionRate7d <= 2) return 'ramp'
    if (executionRate7d >= 6) return 'elite'
  }
  return 'standard'
}
const DENSITY_CAP = { ramp: 3, standard: 6, elite: Infinity }

// Trim ScheduleMatrix rows to the tier's cap. High-impact rows are NEVER hidden
// (they're the day's spine); only lower-impact rows are shed to hit the budget.
export function applyDensity(rows, tier) {
  const cap = DENSITY_CAP[tier] ?? Infinity
  if (rows.length <= cap) return rows
  const highCount = rows.filter((r) => r.impact === 'high').length
  let lowBudget = Math.max(0, cap - highCount)
  return rows.filter((r) => {
    if (r.impact === 'high') return true
    if (lowBudget > 0) { lowBudget--; return true }
    return false
  })
}

// focusGoal → the high-impact focus block injected right after the anchor, so
// EVERY goal (not just running/gym) seeds a real anchor the DeepWorkTimer can
// name. Without this, a Deep-work or Reading user's only high-impact block was
// "Morning run" — a schedule that flatly contradicts the answer they just gave.
const FOCUS_BLOCK = {
  running: { block: 'Track / tempo session', impact: 'high' },
  gym: { block: 'Lift — main session', impact: 'high' },
  work: { block: 'Deep work — first block', impact: 'high' },
  reading: { block: 'Reading block', impact: 'high' },
  all: { block: 'Priority block', impact: 'high' },
}

// The row the focus block anchors to: the settings.anchorHabit cue matched to
// a base row; falls back to the wake row (the reliable morning anchor).
function anchorIndex(rows, anchorHabit) {
  const map = { 'evening-meal': 'phone' }
  const wants = map[anchorHabit] || 'wake'
  const byTag = rows.findIndex((r) => r._tag === wants)
  return byTag >= 0 ? byTag : 0
}

// Dictated blocks slot into the day by their time; untimed ones follow the
// last timed dictation (they read as "then, that day": after the plan's spine).
function insertByTime(rows, dictated) {
  for (const d of dictated) {
    const row = { time: d.time || '', block: d.block, status: 'open', impact: d.impact }
    if (d.time) {
      const at = rows.findIndex((r) => r.time && r.time > d.time)
      rows.splice(at >= 0 ? at : rows.length, 0, row)
    } else {
      rows.push(row)
    }
  }
  return rows
}

// ── Today ───────────────────────────────────────────────────────────────────
// The day's spine is DICTATED, not invented (there is no "Morning run" here —
// a schedule the user didn't write is someone else's life): the wake/phone
// bookends come from the user's own answers, the focus block from their stated
// goal, and everything between is settings.dayBlocks — the blocks they wrote
// in onboarding's "dictate your day" or the day-plan editor.
function scheduleRows(store) {
  const { settings, checklist, tasks } = store
  const today = checklist[appDayKey()] || {}
  const rows = [
    { _tag: 'wake', time: settings.wakeTime || '06:45', block: 'Wake — feet on floor', status: norm(today.wake), impact: 'high' },
    { _tag: 'phone', time: settings.bedTime || '22:15', block: 'Phone out of the room', status: norm(today.phone) },
  ]

  // focusGoal → inject the focus block immediately after the anchor cue.
  const focus = FOCUS_BLOCK[settings.focusGoal]
  if (focus) {
    const at = anchorIndex(rows, settings.anchorHabit)
    rows.splice(at + 1, 0, { time: '', status: 'open', ...focus })
  }

  // The user's own dictation lands next — timed blocks in time order.
  insertByTime(rows, Array.isArray(settings.dayBlocks) ? settings.dayBlocks : [])

  const tk = dateKey()
  for (const t of tasks.filter((t) => isDue(t, tk))) {
    rows.push({ time: '', block: t.title, status: 'open' })
  }
  for (const t of tasks.filter((t) => t.recurrence?.type === 'none' && t.done && t.history?.at(-1)?.date === tk)) {
    rows.push({ time: '', block: t.title, status: 'done' })
  }
  // Keep the internal _tag on the rows — deepWorkBlock needs it to skip the wake
  // row. It's stripped at the ScheduleMatrix payload boundary (buildLiveLayout).
  return rows
}

// The day's anchor block — the first still-open high-impact row becomes the
// DeepWorkTimer (the deck's ONE accent anchor, R1). The wake and phone rows are
// NEVER the timer: a 50-minute countdown titled "Wake — feet on floor" is
// nonsense and burns the deck's one lane-red element on a non-block. No honest
// anchor → no widget; a server layout can always compose one.
function deepWorkBlock(rows) {
  const anchor = rows.find(
    (r) => r.impact === 'high' && r.status === 'open' && r._tag !== 'wake' && r._tag !== 'phone'
  )
  if (!anchor) return null
  return {
    type: 'DeepWorkTimer',
    id: 'live-deepwork',
    config: { label: anchor.block, minutes: 50, at: anchor.time || undefined, highImpact: true },
  }
}

// Split Ledger grammar: personal totals NEVER wear the accent — lane-red is
// reserved for commitment (the seal, Start, ◆). Dominance comes from the mono
// numeral itself, so every pulse tile prints in ink. (The old `demoteStreak`
// day-0/engagement demotion is now the universal state.)
function pulseTiles(store) {
  const days = streakDays(store.streak.startedAt)
  const tk = dateKey()
  const sprintsToday = store.sprints.find((s) => s.date === tk)?.count || 0
  return [
    { label: 'Streak', value: String(days), unit: 'days' },
    { label: 'Sprints', value: String(sprintsToday), unit: 'today' },
    { label: 'Clean', value: String(store.streak.cleanDates.length), unit: 'lifetime' },
    { label: 'Outlasted', value: String(store.streak.urgesSurvived.length), unit: 'urges' },
  ]
}

// Only targets a shipping user can actually move: readiness (the wellness
// check-in) and the focus-goal item (sprints / reading — real store activity).
// The personal-era income + mileage rows died with the Money/Train screens:
// with no input surface left, those bars could never move — dead instruments
// dressed as goals, seeded with defaults a fresh user never chose.
function goalItems(store) {
  const items = []
  const r = readiness(store.wellness[appDayKey()])
  if (r) {
    items.push({
      label: 'Readiness',
      value: r.score,
      max: 5,
      right: `${r.score} / 5 · ${r.label}`,
      // Effort shortfall is never neg (R2) — a low readiness is caution data.
      tone: r.score >= 4 ? 'pos' : 'warn',
    })
  }
  // focusGoal seeds one domain-specific weekly target (mirrors the athletic
  // block it injected into the schedule).
  const fg = focusGoalItem(store)
  if (fg) items.push(fg)
  return items
}

// The GoalProgress item derived from focusGoal. Counts real store activity where
// a signal exists (gym → runs tagged as sessions; reading → plan index; work →
// sprints), else surfaces the target at zero so the bar is honest, not faked.
function focusGoalItem(store) {
  const wk = new Set(lastNDates(7))
  switch (store.settings?.focusGoal) {
    case 'gym': {
      const sessions = store.sprints.filter((s) => wk.has(s.date)).length
      return { label: 'Weekly sessions', value: sessions, max: 4, right: `${sessions} / 4`, tone: 'pos' }
    }
    case 'reading': {
      const idx = store.reading?.index || 0
      const total = Array.isArray(store.reading?.plan) ? store.reading.plan.length : 21
      return { label: 'Reading plan', value: idx, max: total, right: `${idx} / ${total}`, tone: 'accent' }
    }
    case 'work': {
      const sprintsWk = store.sprints.filter((s) => wk.has(s.date)).reduce((n, s) => n + (s.count || 0), 0)
      return { label: 'Weekly deep-work', value: sprintsWk, max: 20, right: `${sprintsWk} / 20`, tone: 'accent' }
    }
    default:
      return null // running has no in-app input in v1; 'all' adds nothing extra
  }
}

function briefingConfig(summary) {
  const imp = summary.impact || { total: 0, done: 0, missed: 0, pending: 0 }
  // Impact shortfall is about the person's day — warn at most, never neg (R2),
  // and an untouched day is muted: open blocks aren't a warning until missed.
  const impactTone = !imp.total
    ? 'muted'
    : imp.done === imp.total
      ? 'pos'
      : imp.missed
        ? 'warn'
        : 'muted'
  const rate = summary.engagementRate || 0
  return {
    date: `${appDayKey()} · live`,
    stats: [
      { label: 'Impact', value: `${imp.done}/${imp.total || 0}`, tone: impactTone },
      // Engagement is information, not a grade — it earns pos, never warn.
      { label: 'Engaged', value: `${rate}%`, tone: rate >= 50 ? 'pos' : 'muted' },
      { label: 'Cards', value: `${(summary.used || []).length}/${(summary.widgets || []).length}`, tone: 'muted' },
    ],
    // §7: a driver about the user's action plan may be warn, never neg — neg is
    // reserved for external conditions. Mapped here so the signal source stays
    // honest while the surface obeys the rule.
    drivers: refactorSignals(safeSummary(summary)).map((d) =>
      d.tone === 'neg' ? { ...d, tone: 'warn' } : d
    ),
  }
}

// ── Trends ───────────────────────────────────────────────────────────────────
function energyPoints(store) {
  // When health activity is linked, the trend line rides the (mock) activity
  // stream; otherwise it falls back to the real 14-day readiness signal.
  const hi = store.settings?.healthIntegration
  if (healthLinked(hi, 'activity')) return mockStream('activity').map((v, i) => ({ t: `d${i + 1}`, v }))
  const keys = [...lastNDates(14)].sort() // chronological
  const pts = []
  for (const k of keys) {
    const r = readiness(store.wellness[k])
    if (r) pts.push({ t: shortDay(k), v: r.score * 20 })
  }
  return pts
}

// ── Health integration → BiometricChart streams (mocked, Supabase paused) ─────
// True when linking is on AND the given metric was selected.
function healthLinked(hi, metric) {
  return !!(hi && hi.linked && Array.isArray(hi.synchronizedMetrics) && hi.synchronizedMetrics.includes(metric))
}

// Deterministic 14-point mock stream per metric (no RNG — reproducible in tests
// and demos). Real device data replaces these via health.js when authorized.
const MOCK_STREAMS = {
  sleep: [6.8, 7.1, 7.5, 6.4, 7.2, 7.8, 7.0, 6.9, 7.4, 7.6, 6.7, 7.3, 7.1, 7.5],
  activity: [42, 55, 61, 38, 70, 66, 48, 52, 74, 59, 45, 63, 68, 57],
  'heart-rate': [58, 56, 61, 59, 55, 57, 60, 58, 54, 56, 62, 59, 57, 55],
}
function mockStream(metric) {
  return MOCK_STREAMS[metric] || []
}

const METRIC_META = {
  sleep: { label: 'Sleep · 14d', unit: 'h', tone: 'accent' },
  activity: { label: 'Activity · 14d', unit: 'pts', tone: 'pos' },
  'heart-rate': { label: 'Resting HR · 14d', unit: 'bpm', tone: 'warn' },
}

// One BiometricChart config for a linked metric, hydrated from the mock stream.
function biometricBlock(metric) {
  const data = mockStream(metric)
  const meta = METRIC_META[metric] || { label: metric, unit: '', tone: 'accent' }
  const last = data[data.length - 1]
  const prev = data[data.length - 2] ?? last
  const delta = Number.isFinite(last) && Number.isFinite(prev) ? Math.round((last - prev) * 10) / 10 : 0
  return {
    type: 'BiometricChart',
    id: `live-bio-${metric}`,
    config: { label: meta.label, value: last, unit: meta.unit, delta, tone: meta.tone, data },
  }
}

// The Trends biometric section: functional data arrays when linked, or a single
// functional "Integration Disabled" card when not.
function biometricBlocks(store) {
  const hi = store.settings?.healthIntegration
  const metrics = (hi && hi.linked && Array.isArray(hi.synchronizedMetrics)) ? hi.synchronizedMetrics : []
  if (!metrics.length) {
    return [{
      type: 'InsightCard',
      id: 'live-bio-off',
      config: {
        heading: 'Biometrics',
        source: 'health',
        text: 'Not linked — tap Connect Apple Health on the HEALTH surface to stream sleep, activity, and heart-rate.',
        tone: 'muted',
      },
    }]
  }
  return ['sleep', 'activity', 'heart-rate'].filter((m) => metrics.includes(m)).map(biometricBlock)
}

// ── Lifetime / margin note (shared by TRENDS + the Sunday review) ─────────────
function lifetimeStats(store) {
  const best = Math.floor((store.streak.bestSeconds || 0) / 86400)
  return [
    // Personal total — ink, never accent (Split Ledger seal reservation).
    { label: 'Clean days', value: String(store.streak.cleanDates.length) },
    { label: 'Outlasted', value: String(store.streak.urgesSurvived.length) },
    { label: 'Best', value: `${best}d` },
  ]
}

function lifetimeBlock(store, id = 'live-stats') {
  return {
    type: 'StatRow',
    id,
    config: { title: 'Lifetime', cols: 3, items: lifetimeStats(store) },
  }
}

// The brand-new book's one orienting card — how to work the page, in three
// lines, instead of a wall of zeroed instruments. Gone by day two.
function firstStepsBlock() {
  return {
    type: 'InsightCard',
    id: 'live-first-steps',
    config: {
      heading: 'First steps',
      source: 'live',
      text: 'Tap a line when it happens — that posts it to the book. "Dictate the day" below edits your blocks. Slipping? The night page is one tap down, HELP is always on the nav. The tour replays from Settings.',
      tone: 'muted',
    },
  }
}

// The ONE un-scored card (R3): a verse, a reading position, a cue. No numbers,
// no deltas, no verdicts — "offered, not performed". Faith opt-in only.
function faithBlock(store) {
  const v = verseForDay()
  const reading = store.reading || {}
  const section = Array.isArray(reading.plan) ? reading.plan[reading.index] : null
  return {
    type: 'FaithCard',
    id: 'live-faith',
    config: {
      verse: v.text,
      ref: v.ref,
      position: section || undefined,
      cue: 'One section, when you choose. Offered, not performed.',
    },
  }
}

// ── Review (Sunday) ──────────────────────────────────────────────────────────
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function weekGridDays() {
  const keys = [...lastNDates(7)].sort() // chronological, ends today
  return keys.map((k) => {
    const s = summarizeDay(k)
    const imp = s.impact || { total: 0, done: 0 }
    return {
      d: DOW[new Date(`${k}T12:00:00`).getDay()],
      pct: imp.total ? Math.round((imp.done / imp.total) * 100) : 0,
      sealed: !!s.closed,
    }
  })
}

function reviewTab(store, sig) {
  return {
    key: 'review',
    label: 'Review',
    blocks: [
      { type: 'WeekGrid', id: 'live-week', config: { title: 'The week', days: weekGridDays() } },
      lifetimeBlock(store, 'live-week-lifetime'),
      {
        type: 'InsightCard',
        id: 'live-week-counsel',
        config: {
          heading: 'Counsel',
          source: 'weekly',
          text: sig[0]?.text || 'A quiet week of signal. The deck holds; the work continues.',
          tone: sig[0]?.tone === 'neg' ? 'warn' : sig[0]?.tone, // weekly counsel is weather, softened
        },
      },
    ],
  }
}

function safeSummary(s) {
  return {
    impact: s?.impact || { total: 0, done: 0, missed: 0, pending: 0, missedLabels: [], pendingLabels: [] },
    ignoredTypes: s?.ignoredTypes || [],
    usedTypes: s?.usedTypes || [],
    engagementRate: s?.engagementRate || 0,
    // refactorSignals only judges "ignored" on a sealed day — carry the seal.
    closed: !!s?.closed,
  }
}

/**
 * The whole live payload. `store` is the useStore() value; `summary` is the
 * useEngagementSummary() value (both optional-safe). `opts.assessment` (the
 * Guardian drift read) is accepted from callers but currently unused — it fed
 * the retired sentiment widget and stays in the signature for the server forge.
 * Run the result through normalizeLayout before handing it to LayoutHost.
 */
// eslint-disable-next-line no-unused-vars
export function buildLiveLayout(store, summary, opts = {}) {
  const sum = safeSummary(summary)
  const sig = refactorSignals(sum)
  const day0 = isDay0(store)
  const model = store.settings?.streakModel

  // executionRate7d scales how many active blocks the schedule carries.
  const tier = densityTier(store.settings?.executionRate7d)
  const rows = applyDensity(scheduleRows(store), tier)
  const briefing = { type: 'DailyBriefing', id: 'live-briefing', config: briefingConfig(summary || {}) }
  // Strip the internal _tag here, at the payload boundary (deep uses it above).
  const sched = { type: 'ScheduleMatrix', id: 'live-sched', config: { title: 'Today', rows: rows.map(({ _tag, ...r }) => r) } }
  const deep = deepWorkBlock(rows)
  const kpis = { type: 'KpiGrid', id: 'live-kpis', config: { title: 'Pulse', cols: 2, items: pulseTiles(store) } }
  // No live targets (no check-in yet, no focus item) → no block: an empty
  // Targets card is furniture, and furniture lies.
  const goalRows = goalItems(store)
  const goals = goalRows.length
    ? { type: 'GoalProgress', id: 'live-goals', config: { title: 'Targets', items: goalRows } }
    : null
  const lifetimeToday = lifetimeBlock(store, 'live-lifetime-today')

  // §5 deck order per profile; day-0 overrides them all (lifetime piles lead —
  // the numbers a reset can never touch).
  //
  // A BRAND-NEW book (day-0 with nothing ever written) is stricter still: no
  // briefing (0/0 stats), no pulse tiles (four zeros), no lifetime pile (more
  // zeros) — a wall of empty instruments is the "too much information" first
  // minute in card form. The first page is the schedule they just dictated,
  // the timer that runs it, and a first-steps card that opens the tour. The
  // full deck earns its way in as real data appears.
  const brandNew = day0 && (store.streak?.cleanDates?.length || 0) === 0 && !(store.streak?.resets || []).length
  let todayBlocks
  if (brandNew) {
    todayBlocks = [firstStepsBlock(), sched, deep]
  } else if (day0) {
    todayBlocks = [lifetimeToday, briefing, sched, deep, goals, kpis]
  } else if (model === 'accumulation') {
    todayBlocks = [lifetimeToday, briefing, sched, deep, kpis, goals]
  } else if (model === 'engagement') {
    todayBlocks = [deep, sched, briefing, goals, kpis]
  } else {
    // avoidance + untyped: the chain (streak tile) stays visible early.
    todayBlocks = [briefing, kpis, sched, deep, goals]
  }
  todayBlocks = todayBlocks.filter(Boolean)

  // TRENDS is the whole reflective page now (M2 folded MIND into it): the
  // coach's margin note leads, then the body's signals, then the week's balance
  // and the lifetime piles. The faith card (R3, opt-in, un-scored) closes the
  // page — offered after the data, never among the metrics.
  const trendsBlocks = [
    { type: 'InsightCard', id: 'live-insight', config: { heading: 'Counsel', source: 'live', text: sig[0]?.text || 'Keep working the deck — the AI adapts as it learns what you use.', tone: sig[0]?.tone === 'neg' ? 'warn' : sig[0]?.tone } },
    { type: 'EnergyTrendLine', id: 'live-energy', config: { label: healthLinked(store.settings?.healthIntegration, 'activity') ? 'Activity · 14d' : 'Readiness · 14d', unit: '/100', points: energyPoints(store) } },
    ...biometricBlocks(store),
    { type: 'WeekGrid', id: 'live-balance', config: { title: "The week's balance", days: weekGridDays() } },
    lifetimeBlock(store),
  ]
  if (store.settings?.modules?.faith) trendsBlocks.push(faithBlock(store))

  const tabs = [
    { key: 'today', label: 'Today', blocks: todayBlocks },
    { key: 'trends', label: 'Trends', blocks: trendsBlocks },
  ]
  if (isAppSunday()) tabs.push(reviewTab(store, sig))

  return {
    schemaVersion: 1,
    defaultTab: 'today',
    tabs,
  }
}
