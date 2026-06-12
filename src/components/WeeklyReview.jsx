// WeeklyReview.jsx — the Sunday Debrief. A guided, under-10-minute review:
// the week's stats pulled automatically, last week's "one change" shown at the
// top, and three questions. Saves an entry keyed by the week.

import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { useStore } from '../lib/store.jsx'
import { startOfWeek, dateKey, streakDays } from '../lib/dates.js'

export default function WeeklyReview({ onClose }) {
  const { streak, sprints, income, runs, reviews, saveReview } = useStore()

  const ws = startOfWeek()
  const weekOf = dateKey(ws)
  const weekEnd = dateKey(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6))
  const inWeek = (d) => d >= weekOf && d <= weekEnd

  const stats = {
    cleanDays: streak.cleanDates.filter(inWeek).length,
    sprints: sprints.filter((s) => inWeek(s.date)).reduce((a, s) => a + s.count, 0),
    money: income.filter((e) => inWeek(e.date)).reduce((a, e) => a + e.amount, 0),
    miles: runs.filter((r) => inWeek(r.date)).reduce((a, r) => a + (r.miles || 0), 0),
  }

  // Last week's "one change" (most recent prior review).
  const prior = reviews
    .filter((r) => r.weekOf !== weekOf)
    .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0]

  // Pre-fill if this week already has a saved review.
  const existing = reviews.find((r) => r.weekOf === weekOf)
  const [worked, setWorked] = useState(existing?.worked || '')
  const [broke, setBroke] = useState(existing?.broke || '')
  const [oneChange, setOneChange] = useState(existing?.oneChange || '')
  const [saved, setSaved] = useState(false)

  function save() {
    saveReview({ weekOf, stats, worked, broke, oneChange })
    setSaved(true)
    setTimeout(onClose, 800)
  }

  return (
    <Sheet title="Sunday Debrief" onClose={onClose}>
      {prior?.oneChange && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-accent">Last week you said</div>
          <div className="mt-1 text-sm text-ink">"{prior.oneChange}"</div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 text-center">
        <DebriefStat value={streakDays(streak.startedAt)} label="Streak" />
        <DebriefStat value={stats.cleanDays} label="Clean" />
        <DebriefStat value={stats.sprints} label="Sprints" />
        <DebriefStat value={stats.miles.toFixed(stats.miles % 1 ? 1 : 0)} label="Miles" />
      </div>
      <p className="text-center text-xs text-muted">
        ${Math.round(stats.money).toLocaleString()} logged this week.
      </p>

      <Question label="What worked?" value={worked} onChange={setWorked} />
      <Question label="What broke?" value={broke} onChange={setBroke} />
      <Question label="One change for next week" value={oneChange} onChange={setOneChange} />

      <button
        type="button"
        onClick={save}
        className="w-full rounded-2xl bg-accent py-3.5 font-medium text-accent-ink"
      >
        {saved ? 'Saved ✓' : 'Save debrief'}
      </button>
    </Sheet>
  )
}

function DebriefStat({ value, label }) {
  return (
    <div className="rounded-xl bg-surface2 py-3">
      <div className="font-clock tnum text-xl text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

function Question({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="resize-none rounded-xl border border-line bg-surface2 px-3 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </label>
  )
}
