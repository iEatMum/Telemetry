// engagement.js — the Performance Loop's telemetry (client-side, no backend).
//
// The autonomous loop is: deal a deck → watch what the user actually DOES with
// it → refactor tomorrow's deck around that. This module is the "watch" half.
// Per app-day it records, for every AI-dealt card:
//   • SEEN  — the card was rendered (impression)
//   • USED  — the user actually engaged with it (any tap inside it)
// and for HIGH-IMPACT items (the ones the AI flags):
//   • done / missed — completed during the day, or still pending at day-close.
//
// At day-close it packages a "Performance Payload" — the exact object the
// Architect edge function will later consume to rebuild the deck. We build and
// STASH it locally (and log it); we do NOT send it anywhere yet (backend is
// off-limits this phase).
//
// This is LOCAL-ONLY TELEMETRY: a sidecar localStorage key, deliberately NOT app
// data — never goes through sync.js, never exported. Like record.js, it lives
// beside the real data, not inside it.

import { useEffect, useState } from 'react'
import { appDayKey } from './dates.js'

const KEY = 'lockedin:__engagement'
const PAYLOAD_KEY = 'lockedin:__perf_payload' // the last built Performance Payload

// --- tiny pub/sub so the briefing + indicator update live -------------------
const subs = new Set()
export function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}
function notify() {
  for (const fn of subs) {
    try {
      fn()
    } catch {
      /* a bad subscriber can't break a write */
    }
  }
}

// --- storage ----------------------------------------------------------------
function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to a clean slate */
  }
  return { days: {}, refactorPending: false, lastClosedDay: null }
}
function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode — this session's in-memory effects still fire */
  }
  notify()
}
function emptyDay() {
  return { widgets: {}, impact: {}, posted: {}, closed: false, closedAt: null }
}
function dayRec(state, day) {
  if (!state.days[day]) state.days[day] = emptyDay()
  // Days written before the posted-rows record existed lack the map.
  if (!state.days[day].posted) state.days[day].posted = {}
  return state.days[day]
}

// --- recording (called from BlockRenderer + the interactive widgets) --------

/** A card was rendered. If its config is flagged highImpact, register it too. */
export function recordSeen(block, day = appDayKey()) {
  if (!block || !block.id) return
  const s = read()
  const d = dayRec(s, day)
  const w = d.widgets[block.id] || { type: block.type, seen: 0, used: 0, lastUsedAt: null }
  w.seen += 1
  w.type = block.type || w.type
  d.widgets[block.id] = w
  if (block.config && block.config.highImpact) {
    if (!d.impact[block.id]) {
      d.impact[block.id] = { label: block.config.label || block.type, status: 'pending', at: null }
    }
  }
  write(s)
}

/** The user touched a card (capture-phase click in BlockRenderer). */
export function recordUse(block, day = appDayKey()) {
  if (!block || !block.id) return
  const s = read()
  const d = dayRec(s, day)
  const w = d.widgets[block.id] || { type: block.type, seen: 1, used: 0, lastUsedAt: null }
  w.used += 1
  w.lastUsedAt = new Date().toISOString()
  w.type = block.type || w.type
  d.widgets[block.id] = w
  write(s)
}

/** Declare a high-impact item exists today (e.g. a flagged schedule row). */
export function registerImpact(id, label, day = appDayKey()) {
  if (!id) return
  const s = read()
  const d = dayRec(s, day)
  if (!d.impact[id]) d.impact[id] = { label: label || id, status: 'pending', at: null }
  write(s)
}

/** Mark a high-impact item completed. */
export function completeImpact(id, day = appDayKey()) {
  if (!id) return
  const s = read()
  const d = dayRec(s, day)
  if (!d.impact[id]) d.impact[id] = { label: id, status: 'pending', at: null }
  d.impact[id].status = 'done'
  d.impact[id].at = new Date().toISOString()
  write(s)
}

/**
 * Walk a completion back to pending — the undo for a mis-tap (M3). Refused on
 * a sealed day: once closeDay() has attested the record, the tape is final.
 */
export function uncompleteImpact(id, day = appDayKey()) {
  if (!id) return
  const s = read()
  const d = dayRec(s, day)
  if (d.closed || !d.impact[id] || d.impact[id].status !== 'done') return
  d.impact[id].status = 'pending'
  d.impact[id].at = null
  write(s)
}

// --- posted rows (the heat sheet's ink) --------------------------------------
// A posted schedule row is an ENTRY IN THE BOOK, so it must survive a relaunch.
// ScheduleMatrix used to keep posts in component state only — every posted row
// silently reverted to open on reload, which read as the app losing the user's
// day. The day-keyed record lives here beside impact for the same lifecycle:
// sealed days refuse un-posting, and the day's record simply ages out.

/** A schedule row was posted. */
export function recordPost(id, day = appDayKey()) {
  if (!id) return
  const s = read()
  dayRec(s, day).posted[id] = true
  write(s)
}

/** Walk a post back (mis-tap undo). Refused once the day is sealed. */
export function unrecordPost(id, day = appDayKey()) {
  if (!id) return
  const s = read()
  const d = dayRec(s, day)
  if (d.closed) return
  delete d.posted[id]
  write(s)
}

/** The row ids posted on `day` — ScheduleMatrix seeds its state from this. */
export function postedIds(day = appDayKey()) {
  const s = read()
  return Object.keys((s.days[day] && s.days[day].posted) || {})
}

// --- analysis ---------------------------------------------------------------

function summarizeFrom(state, day) {
  const d = state.days[day] || emptyDay()
  const widgets = Object.entries(d.widgets).map(([id, w]) => ({ id, ...w, engaged: w.used > 0 }))
  const used = widgets.filter((w) => w.engaged)
  const ignored = widgets.filter((w) => !w.engaged)
  const impacts = Object.entries(d.impact).map(([id, x]) => ({ id, ...x }))
  const done = impacts.filter((i) => i.status === 'done')
  const missed = impacts.filter((i) => i.status === 'missed')
  const pending = impacts.filter((i) => i.status === 'pending')
  const rate = widgets.length ? Math.round((used.length / widgets.length) * 100) : 0
  return {
    day,
    closed: d.closed,
    closedAt: d.closedAt,
    widgets,
    used,
    ignored,
    usedTypes: [...new Set(used.map((w) => w.type))],
    ignoredTypes: [...new Set(ignored.map((w) => w.type))],
    engagementRate: rate,
    impact: {
      total: impacts.length,
      done: done.length,
      missed: missed.length,
      pending: pending.length,
      doneLabels: done.map((i) => i.label),
      missedLabels: missed.map((i) => i.label),
      pendingLabels: pending.map((i) => i.label),
    },
  }
}

/** Day metrics: engaged vs ignored cards + high-impact completion. */
export function summarizeDay(day = appDayKey()) {
  return summarizeFrom(read(), day)
}

/**
 * The human-readable "why" the AI would refactor — the lines the Daily Briefing
 * shows. Derived purely from the day's engagement, no model needed yet.
 */
export function refactorSignals(sum) {
  const out = []
  const imp = sum.impact
  // The tape can't judge behavior that hasn't happened: until something is
  // posted, missed, or used today, the only honest line is a blank-page one.
  const acted = imp.done > 0 || imp.missed > 0 || (sum.usedTypes || []).length > 0
  if (!acted && !sum.closed) {
    out.push({ tone: 'muted', text: 'Nothing on the book yet — the first posted block opens the day.' })
    return out
  }
  if (imp.total && imp.done === imp.total) {
    out.push({ tone: 'pos', text: `All ${imp.total} high-impact blocks hit. Holding the structure and raising the target.` })
  } else if (imp.missed) {
    const label = imp.missedLabels[0] || 'high-impact work'
    out.push({
      tone: 'neg',
      text: `${imp.done}/${imp.total} high-impact blocks completed (missed: ${label}). Shifting to shorter, front-loaded 90-min bursts tomorrow.`,
    })
  } else if (imp.total) {
    // Mid-day, nothing missed yet — open blocks are still open, not failures.
    const label = imp.pendingLabels[0] || 'the next block'
    out.push({ tone: 'muted', text: `${imp.done}/${imp.total} high-impact blocks posted. Still open: ${label}.` })
  }
  // Ignoring is a verdict about a finished day; mid-day it's just "not yet".
  if (sum.ignoredTypes.length && sum.closed) {
    out.push({ tone: 'warn', text: `Ignored: ${sum.ignoredTypes.join(', ')}. Demoting low-engagement cards down the deck.` })
  }
  if (sum.usedTypes.length) {
    out.push({ tone: 'pos', text: `Most-used: ${sum.usedTypes.join(', ')}. Promoting these to the top.` })
  }
  if (!out.length) {
    out.push({ tone: 'muted', text: 'Not enough signal yet — keep working the deck and the AI adapts.' })
  }
  return out
}

/**
 * Package the day's engagement for the Architect. This is the contract a future
 * POST would carry — built and stashed client-side only (no backend this phase).
 */
export function buildPerformancePayload(day = appDayKey(), state = read()) {
  const sum = summarizeFrom(state, day)
  return {
    kind: 'performance',
    day,
    generatedAt: new Date().toISOString(),
    engagement: {
      widgets: sum.widgets.map((w) => ({
        blockId: w.id,
        type: w.type,
        seen: w.seen,
        used: w.used,
        engaged: w.engaged,
      })),
      usedTypes: sum.usedTypes,
      ignoredTypes: sum.ignoredTypes,
      engagementRate: sum.engagementRate,
    },
    impact: sum.impact,
    signals: refactorSignals(sum).map((s) => s.text),
  }
}

// --- day close + refactor flag ----------------------------------------------

/**
 * "Finish the day." Any high-impact item still pending becomes a miss, the day
 * is sealed, the Performance Payload is built + stashed, and the layout is
 * flagged for a refactor. Returns the payload so the caller can log/inspect it.
 */
export function closeDay(day = appDayKey()) {
  const s = read()
  const d = dayRec(s, day)
  for (const id of Object.keys(d.impact)) {
    if (d.impact[id].status === 'pending') d.impact[id].status = 'missed'
  }
  d.closed = true
  d.closedAt = new Date().toISOString()
  s.refactorPending = true
  s.lastClosedDay = day
  const payload = buildPerformancePayload(day, s)
  try {
    localStorage.setItem(PAYLOAD_KEY, JSON.stringify(payload))
  } catch {
    /* quota — the returned payload is still usable in-session */
  }
  write(s)
  return payload
}

export function getRefactorState() {
  const s = read()
  // `pending` is a statement about TODAY — "this day is sealed; tomorrow's page
  // arrives at rollover" — so it expires with the day it sealed. Stored as a
  // bare boolean it outlived its day (nothing ever called clearRefactor), which
  // left "Rule off the day" permanently disabled from day 2: the core daily
  // loop was dead. Scoping it to lastClosedDay makes rollover itself the reset.
  const pending = !!s.refactorPending && s.lastClosedDay === appDayKey()
  return { pending, lastClosedDay: s.lastClosedDay }
}
export function clearRefactor() {
  const s = read()
  s.refactorPending = false
  write(s)
}
export function getPerformancePayload() {
  try {
    const raw = localStorage.getItem(PAYLOAD_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* none yet */
  }
  return null
}

// --- React bindings ---------------------------------------------------------
function useTick() {
  const [, setT] = useState(0)
  useEffect(() => subscribe(() => setT((t) => t + 1)), [])
}

/** Live day summary — re-renders whenever engagement changes. */
export function useEngagementSummary(day) {
  useTick()
  return summarizeDay(day)
}

/** Live refactor flag — re-renders on close/clear. */
export function useRefactorState() {
  useTick()
  return getRefactorState()
}
