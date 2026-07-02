// store.jsx — the bridge between storage.js and React.
//
// One context holds the app's state slices and the actions that change them.
// Every action does two things: update React state (so the UI re-renders) and
// persist through storage.js (so it survives a reload). Screens never touch
// storage.js directly — they call these actions.

import { createContext, useContext, useEffect, useState } from 'react'
import * as storage from './storage.js'
import * as sync from './sync.js'
import { appDayKey, dateKey } from './dates.js'
import { computeNextDue, seedTasks } from './tasks.js'
import { synthesizeConsideration } from './guardian.js'

const StoreContext = createContext(null)

function newId() {
  // crypto.randomUUID where available (all modern iOS/desktop), else a
  // time + wider-random fallback to shrink the same-millisecond collision window.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11)
}

// On first ever launch, stamp the streak's start time (defaults can't be "now").
function initStreak() {
  const s = storage.get('streak')
  if (!s.startedAt) {
    s.startedAt = new Date().toISOString()
    storage.set('streak', s)
  }
  return s
}

// Migrate a single legacy partner (Phase 1) into the partners[] list (Phase 2),
// and keep schemaVersion current for future migrations.
function initSettings() {
  const s = storage.get('settings')
  let changed = false
  if ((!s.partners || s.partners.length === 0) && (s.partnerName || s.partnerPhone)) {
    s.partners = [{ id: newId(), name: s.partnerName || 'Partner', phone: s.partnerPhone || '' }]
    changed = true
  }
  if (s.schemaVersion !== storage.SCHEMA_VERSION) {
    s.schemaVersion = storage.SCHEMA_VERSION
    changed = true
  }
  if (changed) storage.set('settings', s)
  return s
}

// Seed the recurring tasks once, EVER. A persisted flag decides — not emptiness —
// so deleting every task doesn't resurrect the 5 seeds on the next launch.
function markTasksSeeded() {
  storage.set('settings', { ...storage.get('settings'), seededTasks: true })
}
function initTasks() {
  const t = storage.get('tasks')
  if (storage.get('settings').seededTasks) return t
  // First run, or an existing install from before the flag existed.
  if (t && t.length) {
    markTasksSeeded()
    return t
  }
  const seeded = seedTasks()
  storage.set('tasks', seeded)
  markTasksSeeded()
  return seeded
}

const CHECK_STATES = [undefined, 'done', 'missed'] // tri-state cycle

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(initSettings)
  const [streak, setStreak] = useState(initStreak)
  const [sprints, setSprints] = useState(() => storage.get('sprints'))
  const [checklist, setChecklist] = useState(() => storage.get('checklist'))
  const [tasks, setTasks] = useState(initTasks)
  const [income, setIncome] = useState(() => storage.get('income'))
  const [runs, setRuns] = useState(() => storage.get('runs'))
  const [reviews, setReviews] = useState(() => storage.get('reviews'))
  const [reading, setReading] = useState(() => storage.get('reading'))
  const [wellness, setWellness] = useState(() => storage.get('wellness'))
  const [handover, setHandover] = useState(() => storage.get('handover'))

  // ---- Sync (Phase 3) -----------------------------------------------------
  // Local-first stays local-first: the engine only does anything when Supabase
  // is configured AND signed in. When a pull brings down newer data from another
  // device, it writes through storage.js silently and calls back here so React
  // re-reads the affected slices. sync.start() is idempotent (StrictMode-safe).
  useEffect(() => {
    const setters = {
      settings: setSettings,
      streak: setStreak,
      sprints: setSprints,
      checklist: setChecklist,
      tasks: setTasks,
      income: setIncome,
      runs: setRuns,
      reviews: setReviews,
      reading: setReading,
      wellness: setWellness,
    }
    sync.start((names) => {
      for (const name of names) {
        const apply = setters[name]
        if (apply) apply(storage.get(name))
      }
    })
  }, [])

  function commit(name, setter, recompute) {
    setter((prev) => {
      const next = recompute(prev)
      if (next === prev) return prev
      storage.set(name, next)
      return next
    })
  }

  // ---- Settings -----------------------------------------------------------
  function updateSettings(patch) {
    commit('settings', setSettings, (prev) => ({ ...prev, ...patch }))
  }
  function addPartner(name, phone) {
    const n = (name || '').trim()
    if (!n) return
    commit('settings', setSettings, (prev) => ({
      ...prev,
      partners: [...(prev.partners || []), { id: newId(), name: n, phone: (phone || '').trim() }],
    }))
  }
  function removePartner(id) {
    commit('settings', setSettings, (prev) => ({
      ...prev,
      partners: (prev.partners || []).filter((p) => p.id !== id),
    }))
  }
  function addShoe(name) {
    const n = (name || '').trim()
    if (!n) return
    commit('settings', setSettings, (prev) =>
      (prev.shoes || []).includes(n) ? prev : { ...prev, shoes: [...(prev.shoes || []), n] }
    )
  }
  function removeShoe(name) {
    commit('settings', setSettings, (prev) => ({
      ...prev,
      shoes: (prev.shoes || []).filter((s) => s !== name),
    }))
  }

  // ---- Streak -------------------------------------------------------------
  function logCleanToday() {
    const key = appDayKey()
    commit('streak', setStreak, (prev) =>
      prev.cleanDates.includes(key) ? prev : { ...prev, cleanDates: [...prev.cleanDates, key] }
    )
  }
  function logReset(entry) {
    commit('streak', setStreak, (prev) => {
      const endedSeconds = prev.startedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(prev.startedAt).getTime()) / 1000))
        : 0
      const now = new Date().toISOString()
      return {
        ...prev,
        resets: [...prev.resets, { at: now, ...entry }],
        bestSeconds: Math.max(prev.bestSeconds || 0, endedSeconds),
        startedAt: now,
      }
    })
  }
  // `meta` (optional) carries the forged protocol's fingerprint — { steps:[ids],
  // severity } — so the win syncs WITH what worked (protocolForge learns from
  // these entries on every device). Zero-arg callers keep the old shape.
  function logUrgeSurvived(meta) {
    commit('streak', setStreak, (prev) => ({
      ...prev,
      urgesSurvived: [...prev.urgesSurvived, { at: new Date().toISOString(), ...(meta || {}) }],
    }))
  }

  // ---- Morning checklist (tri-state: none → done → missed) ----------------
  function cycleChecklistItem(itemKey) {
    const day = appDayKey()
    commit('checklist', setChecklist, (prev) => {
      const today = prev[day] || {}
      const cur = today[itemKey] === true ? 'done' : today[itemKey] // legacy boolean
      const idx = CHECK_STATES.indexOf(cur)
      const next = CHECK_STATES[((idx < 0 ? 0 : idx) + 1) % CHECK_STATES.length]
      return { ...prev, [day]: { ...today, [itemKey]: next } }
    })
  }

  // ---- Sprints ------------------------------------------------------------
  function completeSprint(label) {
    const day = appDayKey() // 3am rollover — a 1am sprint counts for the day you're finishing
    commit('sprints', setSprints, (prev) => {
      const idx = prev.findIndex((s) => s.date === day)
      const labels = label ? [label] : []
      if (idx === -1) return [...prev, { date: day, count: 1, labels }]
      const row = prev[idx]
      const next = prev.slice()
      next[idx] = { ...row, count: row.count + 1, labels: label ? [...row.labels, label] : row.labels }
      return next
    })
  }

  // ---- Tasks (recurring engine) -------------------------------------------
  function addTask(title, cat = 'Life', recurrence = { type: 'none' }) {
    const clean = (title || '').trim()
    if (!clean) return
    commit('tasks', setTasks, (prev) => [
      ...prev,
      { id: newId(), title: clean, cat, recurrence, nextDue: dateKey(), done: false, history: [] },
    ])
  }
  function completeTask(id) {
    const today = dateKey()
    commit('tasks', setTasks, (prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (t.recurrence?.type === 'none') {
          const done = !t.done
          return {
            ...t,
            done,
            history: done ? [...t.history, { date: today, status: 'done' }] : t.history,
          }
        }
        // Recurring: idempotent for the day — a double-tap shouldn't log two
        // 'done' entries or over-advance nextDue.
        if (t.history.some((h) => h.date === today && h.status === 'done')) return t
        return {
          ...t,
          history: [...t.history, { date: today, status: 'done' }],
          nextDue: computeNextDue(today, t.recurrence),
        }
      })
    )
  }
  function missTask(id) {
    const today = dateKey()
    commit('tasks', setTasks, (prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const history = [...t.history, { date: today, status: 'missed' }]
        if (t.recurrence?.type === 'none') return { ...t, history }
        return { ...t, history, nextDue: computeNextDue(today, t.recurrence) }
      })
    )
  }
  function deleteTask(id) {
    commit('tasks', setTasks, (prev) => prev.filter((t) => t.id !== id))
  }
  // Defer a one-time task to tomorrow — ONCE. Honest data (logs a 'pushed'),
  // keeps the list clean, and never available for Run tasks (training doesn't
  // get pushed) or recurring tasks (those use skip).
  function pushTask(id) {
    const today = dateKey()
    const t = new Date()
    t.setDate(t.getDate() + 1)
    const tomorrow = dateKey(t)
    commit('tasks', setTasks, (prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        if (task.recurrence?.type !== 'none' || task.cat === 'Run' || task.pushedOnce) return task
        return {
          ...task,
          nextDue: tomorrow,
          pushedOnce: true,
          history: [...task.history, { date: today, status: 'pushed' }],
        }
      })
    )
  }

  // ---- Income -------------------------------------------------------------
  function addIncome({ amount, source, date }) {
    const amt = Number(amount)
    // Reject 0/NaN AND negatives and absurd values — a negative would silently
    // subtract from the month's progress toward the goal.
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) return
    commit('income', setIncome, (prev) => [
      ...prev,
      { id: newId(), amount: amt, source: source || 'Other', date: date || dateKey() },
    ])
  }
  function deleteIncome(id) {
    commit('income', setIncome, (prev) => prev.filter((e) => e.id !== id))
  }

  // ---- Runs ---------------------------------------------------------------
  function addRun({ type, miles, minutes, rpe, note, shoe, warmup, date }) {
    // Clamp at the write path so no caller can store negative/absurd values.
    const m = Math.max(0, Number(miles) || 0)
    const min = Math.max(0, Number(minutes) || 0)
    if (m <= 0 && min <= 0) return // need at least distance or time
    commit('runs', setRuns, (prev) => [
      ...prev,
      {
        id: newId(),
        type: type || 'Easy',
        miles: m,
        minutes: min,
        rpe: Math.min(10, Math.max(0, Number(rpe) || 0)),
        note: note || '',
        shoe: shoe || '',
        warmup: !!warmup,
        date: date || dateKey(),
      },
    ])
  }
  function deleteRun(id) {
    commit('runs', setRuns, (prev) => prev.filter((r) => r.id !== id))
  }

  // ---- Weekly review ------------------------------------------------------
  function saveReview(entry) {
    commit('reviews', setReviews, (prev) => [...prev.filter((r) => r.weekOf !== entry.weekOf), entry])
  }

  // ---- Reading plan -------------------------------------------------------
  function advanceReading() {
    commit('reading', setReading, (prev) => {
      if (prev.index >= prev.plan.length) return prev
      const label = prev.plan[prev.index]
      return {
        ...prev,
        index: prev.index + 1,
        history: [...prev.history, { label, at: new Date().toISOString() }],
      }
    })
  }
  function addReadingSection(label) {
    const l = (label || '').trim()
    if (!l) return
    commit('reading', setReading, (prev) => ({ ...prev, plan: [...prev.plan, l] }))
  }

  // ---- Readiness check-in -------------------------------------------------
  function saveWellness(day, patch) {
    commit('wellness', setWellness, (prev) => ({
      ...prev,
      [day]: { ...(prev[day] || {}), ...patch, at: new Date().toISOString() },
    }))
  }

  // ---- Handover (the Guardian) --------------------------------------------
  // Drafts are private to this device (the slice isn't synced). Saving one lets
  // you come back to it; it never leaves the phone.
  function saveHandoverDraft({ kind = 'note', body = '', attachments = [] } = {}) {
    const id = newId()
    const now = new Date().toISOString()
    commit('handover', setHandover, (prev) => ({
      ...prev,
      drafts: [{ id, kind, body, attachments, createdAt: now, updatedAt: now }, ...prev.drafts],
    }))
    return id
  }
  function updateHandoverDraft(id, patch) {
    commit('handover', setHandover, (prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
      ),
    }))
  }
  function discardHandoverDraft(id) {
    commit('handover', setHandover, (prev) => ({
      ...prev,
      drafts: prev.drafts.filter((d) => d.id !== id),
    }))
  }
  // The ritual. Turn raw content into a Consideration for the Evening Examen, and
  // let go of the draft. Returns the Consideration so the UI can show it at once.
  // (Synthesis is a placeholder until the AI Counsel step — see guardian.js.)
  function surrenderHandover(content, draftId) {
    const consideration = {
      id: newId(),
      at: new Date().toISOString(),
      dismissed: false,
      ...synthesizeConsideration(content),
    }
    commit('handover', setHandover, (prev) => ({
      ...prev,
      considerations: [consideration, ...prev.considerations],
      drafts: draftId ? prev.drafts.filter((d) => d.id !== draftId) : prev.drafts,
    }))
    return consideration
  }
  function dismissConsideration(id) {
    commit('handover', setHandover, (prev) => ({
      ...prev,
      considerations: prev.considerations.map((c) =>
        c.id === id ? { ...c, dismissed: true } : c
      ),
    }))
  }
  // "Let it go" on a pattern-detected Counsel card — suppresses re-showing the
  // same pattern for the rest of the app-day, so a drift you've consciously taken
  // on doesn't re-indict you nightly.
  function dismissCounsel(patternKey) {
    if (!patternKey) return
    const day = appDayKey()
    commit('handover', setHandover, (prev) => {
      const ack = prev.counselAck || []
      if (ack.some((a) => a.key === patternKey && a.day === day)) return prev
      return { ...prev, counselAck: [...ack, { key: patternKey, day }] }
    })
  }

  // ---- Data tools ---------------------------------------------------------
  function exportData() {
    return storage.exportAll()
  }
  // Restore from an exported blob. Reads slices raw (no re-seeding) so the
  // imported data lands exactly as backed up.
  function importData(blob) {
    if (!storage.importAll(blob)) return false
    setSettings(storage.get('settings'))
    setStreak(storage.get('streak'))
    setSprints(storage.get('sprints'))
    setChecklist(storage.get('checklist'))
    setTasks(storage.get('tasks'))
    setIncome(storage.get('income'))
    setRuns(storage.get('runs'))
    setReviews(storage.get('reviews'))
    setReading(storage.get('reading'))
    setWellness(storage.get('wellness'))
    setHandover(storage.get('handover'))
    return true
  }
  function wipeData() {
    storage.wipeAll()
    setSettings(initSettings())
    setStreak(initStreak())
    setSprints(storage.get('sprints'))
    setChecklist(storage.get('checklist'))
    setTasks(initTasks())
    setIncome(storage.get('income'))
    setRuns(storage.get('runs'))
    setReviews(storage.get('reviews'))
    setReading(storage.get('reading'))
    setWellness(storage.get('wellness'))
    setHandover(storage.get('handover'))
  }

  const value = {
    settings,
    streak,
    sprints,
    checklist,
    tasks,
    income,
    runs,
    reviews,
    reading,
    wellness,
    handover,
    updateSettings,
    addPartner,
    removePartner,
    addShoe,
    removeShoe,
    logCleanToday,
    logReset,
    logUrgeSurvived,
    cycleChecklistItem,
    completeSprint,
    addTask,
    completeTask,
    missTask,
    deleteTask,
    pushTask,
    addIncome,
    deleteIncome,
    addRun,
    deleteRun,
    saveReview,
    advanceReading,
    addReadingSection,
    saveWellness,
    saveHandoverDraft,
    updateHandoverDraft,
    discardHandoverDraft,
    surrenderHandover,
    dismissConsideration,
    dismissCounsel,
    exportData,
    importData,
    wipeData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
