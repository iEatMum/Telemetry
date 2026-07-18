// WeeklyReview.jsx — the Sunday Debrief. A guided, under-10-minute review:
// the week's stats pulled automatically, last week's "one change" shown at the
// top, and three questions. Saves an entry keyed by the week.

import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { useStore } from '../lib/store.jsx'
import { useEntitlement } from '../lib/purchases.js'
import { CoachGate } from './Paywall.jsx'
import { startOfWeek, dateKey, streakDays, appDayDate, daysUntil } from '../lib/dates.js'

export default function WeeklyReview({ onClose }) {
  const { streak, sprints, income, runs, reviews, saveReview, settings, exportData, updateSettings } = useStore()
  // The Sunday Debrief is the coach's reconciliation (M0.1) — behind the
  // register. The book's own data stays reachable: export lives in Settings,
  // the week grid on TRENDS, both free.
  const { entitled } = useEntitlement()

  // Anchor the week to the 3am app-day so a clean log made Sun 12–3am (stamped
  // to Saturday by appDayKey) still lands in this week's window.
  const ws = startOfWeek(appDayDate())
  const weekOf = dateKey(ws)
  const weekEnd = dateKey(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6))
  const inWeek = (d) => d >= weekOf && d <= weekEnd

  // Fresh-start landmark (Dai/Milkman 2014): the season as a countdown.
  const daysToFresno = daysUntil(settings.reportDate)
  const weeksToFresno = daysToFresno != null && daysToFresno > 0 ? Math.ceil(daysToFresno / 7) : null

  const stats = {
    cleanDays: streak.cleanDates.filter(inWeek).length,
    sprints: sprints.filter((s) => inWeek(s.date)).reduce((a, s) => a + s.count, 0),
    money: income.filter((e) => inWeek(e.date)).reduce((a, e) => a + e.amount, 0),
    miles: runs.filter((r) => inWeek(r.date)).reduce((a, r) => a + (r.miles || 0), 0),
    // The long run anchors a base-building week — track it, not just total volume.
    longRun: runs.some((r) => inWeek(r.date) && r.type === 'Long'),
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
  const [backedUp, setBackedUp] = useState(false)

  function save() {
    saveReview({ weekOf, stats, worked, broke, oneChange })
    setSaved(true)
    setTimeout(onClose, 800)
  }

  // Weekly backup rides the weekly habit — one tap, never a blocking gate.
  function backup() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `locked-in-backup-${weekOf}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    updateSettings({ lastBackupAt: new Date().toISOString() })
    setBackedUp(true)
  }

  if (!entitled) {
    return (
      <Sheet title="Sunday Debrief" onClose={onClose}>
        <CoachGate line="On Sundays the coach reconciles the week — what held, what broke, and the one change worth naming." />
      </Sheet>
    )
  }

  return (
    <Sheet title="Sunday Debrief" onClose={onClose}>
      {prior?.oneChange && (
        <div className="border-l-2 border-linebright bg-surface2 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted">Last week you said</div>
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
        ${Math.round(stats.money).toLocaleString()} logged this week ·{' '}
        <span className={stats.longRun ? 'text-ink' : 'text-muted'}>
          {stats.longRun ? 'long run ✓' : 'no long run'}
        </span>
      </p>
      {weeksToFresno != null && (
        <p className="text-center text-xs text-ink">{weeksToFresno} weeks until you report to Fresno State.</p>
      )}

      <Question label="What worked?" value={worked} onChange={setWorked} />
      <Question label="What broke?" value={broke} onChange={setBroke} />
      <Question label="One change — the kind of man you're becoming" value={oneChange} onChange={setOneChange} />
      {oneChange.trim() && (
        <p className="text-center text-xs text-ink">New week. One change. Go.</p>
      )}

      <button
        type="button"
        onClick={save}
        className="w-full rounded-md bg-accent py-3.5 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
      >
        {saved ? 'Saved ✓' : 'Save debrief'}
      </button>
      <button type="button" onClick={backup} className="w-full py-1 text-xs text-muted">
        {backedUp
          ? 'Backup downloaded ✓'
          : `Download this week's backup${
              settings.lastBackupAt ? ` · last ${settings.lastBackupAt.slice(0, 10)}` : ''
            }`}
      </button>
    </Sheet>
  )
}

function DebriefStat({ value, label }) {
  return (
    <div className="rounded-lg bg-surface2 py-3">
      <div className="font-clock tnum text-xl text-ink">{value}</div>
      <div className="text-[0.6875rem] uppercase tracking-wide text-muted">{label}</div>
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
        className="resize-none rounded-lg border border-line bg-surface2 px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </label>
  )
}
