// store.jsx — the bridge between storage.js and React.
//
// One context holds the app's state slices and the actions that change them.
// Every action does two things: update React state (so the UI re-renders) and
// persist through storage.js (so it survives a reload). Screens never touch
// storage.js directly — they call these actions.

import { createContext, useContext, useState } from 'react'
import * as storage from './storage.js'
import { appDayKey, dateKey } from './dates.js'
import { computeNextDue, seedTasks } from './tasks.js'

const StoreContext = createContext(null)

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
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

// Seed the recurring tasks on first run.
function initTasks() {
  const t = storage.get('tasks')
  if (t && t.length) return t
  const seeded = seedTasks()
  storage.set('tasks', seeded)
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
  function logUrgeSurvived() {
    commit('streak', setStreak, (prev) => ({
      ...prev,
      urgesSurvived: [...prev.urgesSurvived, { at: new Date().toISOString() }],
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
    const day = dateKey()
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

  // ---- Income -------------------------------------------------------------
  function addIncome({ amount, source, date }) {
    const amt = Number(amount)
    if (!amt) return
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
    commit('runs', setRuns, (prev) => [
      ...prev,
      {
        id: newId(),
        type: type || 'Easy',
        miles: Number(miles) || 0,
        minutes: Number(minutes) || 0,
        rpe: Number(rpe) || 0,
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

  // ---- Data tools ---------------------------------------------------------
  function exportData() {
    return storage.exportAll()
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
    addIncome,
    deleteIncome,
    addRun,
    deleteRun,
    saveReview,
    advanceReading,
    addReadingSection,
    exportData,
    wipeData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
