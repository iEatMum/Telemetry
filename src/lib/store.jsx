// store.jsx — the bridge between storage.js and React.
//
// One context holds the app's state slices and the actions that change them.
// Every action does two things: update React state (so the UI re-renders) and
// persist through storage.js (so it survives a reload). Screens never touch
// storage.js directly — they call these actions. That keeps data flow obvious.

import { createContext, useContext, useState } from 'react'
import * as storage from './storage.js'
import { appDayKey, dateKey } from './dates.js'

// Tiny id generator for manual tasks/entries. Time-based + random suffix is
// plenty for a single-user, single-device app.
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const StoreContext = createContext(null)

// On first ever launch, stamp the streak's start time (defaults can't be "now").
function initStreak() {
  const s = storage.get('streak')
  if (!s.startedAt) {
    s.startedAt = new Date().toISOString()
    storage.set('streak', s)
  }
  return s
}

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(() => storage.get('settings'))
  const [streak, setStreak] = useState(initStreak)
  const [sprints, setSprints] = useState(() => storage.get('sprints'))
  const [checklist, setChecklist] = useState(() => storage.get('checklist'))
  const [tasks, setTasks] = useState(() => storage.get('tasks'))
  // Read-only in Phase 1 (always empty) so the Today stat row can show real
  // zeros today and just light up when Phase 2 adds the actions.
  const [income] = useState(() => storage.get('income'))
  const [runs] = useState(() => storage.get('runs'))

  // Small helper: persist + set state from a "compute next from prev" function.
  function commit(name, setter, recompute) {
    setter((prev) => {
      const next = recompute(prev)
      if (next === prev) return prev // no-op guard (e.g. already logged)
      storage.set(name, next)
      return next
    })
  }

  // ---- Settings -----------------------------------------------------------
  function updateSettings(patch) {
    commit('settings', setSettings, (prev) => ({ ...prev, ...patch }))
  }

  // ---- Streak -------------------------------------------------------------
  // Mark the current app-day clean (idempotent — fills its calendar cell).
  function logCleanToday() {
    const key = appDayKey()
    commit('streak', setStreak, (prev) =>
      prev.cleanDates.includes(key)
        ? prev
        : { ...prev, cleanDates: [...prev.cleanDates, key] }
    )
  }

  // A reset is DATA, not failure. Record the trigger, bank the best streak,
  // and start the clock again from now.
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

  // A win. Counts the times he outlasted an urge.
  function logUrgeSurvived() {
    commit('streak', setStreak, (prev) => ({
      ...prev,
      urgesSurvived: [...prev.urgesSurvived, { at: new Date().toISOString() }],
    }))
  }

  // ---- Morning checklist (resets at 3am via appDayKey) --------------------
  function toggleChecklistItem(itemKey) {
    const day = appDayKey()
    commit('checklist', setChecklist, (prev) => {
      const today = prev[day] || {}
      return { ...prev, [day]: { ...today, [itemKey]: !today[itemKey] } }
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
      next[idx] = {
        ...row,
        count: row.count + 1,
        labels: label ? [...row.labels, label] : row.labels,
      }
      return next
    })
  }

  // ---- Tasks (Phase 1: simple manual to-dos; recurrence engine is Phase 2) -
  // Stored in the full Phase-2 shape with recurrence:'none', so Phase 2 extends
  // this cleanly instead of migrating.
  function addTask(title, cat = 'Life') {
    const clean = (title || '').trim()
    if (!clean) return
    commit('tasks', setTasks, (prev) => [
      ...prev,
      {
        id: newId(),
        title: clean,
        cat,
        recurrence: 'none',
        nextDue: dateKey(),
        done: false,
        history: [],
      },
    ])
  }

  function toggleTask(id) {
    commit('tasks', setTasks, (prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  function deleteTask(id) {
    commit('tasks', setTasks, (prev) => prev.filter((t) => t.id !== id))
  }

  // ---- Data tools (used by the minimal Settings sheet) --------------------
  function exportData() {
    return storage.exportAll()
  }
  function wipeData() {
    storage.wipeAll()
    setSettings(storage.get('settings'))
    setStreak(initStreak())
    setSprints(storage.get('sprints'))
    setChecklist(storage.get('checklist'))
    setTasks(storage.get('tasks'))
  }

  const value = {
    settings,
    streak,
    sprints,
    checklist,
    tasks,
    income,
    runs,
    updateSettings,
    logCleanToday,
    logReset,
    logUrgeSurvived,
    toggleChecklistItem,
    completeSprint,
    addTask,
    toggleTask,
    deleteTask,
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
