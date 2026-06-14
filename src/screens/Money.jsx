import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel } from '../components/ui.jsx'
import { dateKey, daysLeftInMonth, daysInMonth, MONTHS } from '../lib/dates.js'

const SOURCES = ['Job', 'Roblox', 'Other']

function money(n) {
  return '$' + Math.round(n).toLocaleString()
}

export default function Money() {
  const { settings, income, addIncome, deleteIncome, updateSettings } = useStore()

  const monthPrefix = dateKey().slice(0, 7)
  const monthEntries = income
    .filter((e) => (e.date || '').startsWith(monthPrefix))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const monthTotal = monthEntries.reduce((s, e) => s + e.amount, 0)
  const lifetime = income.reduce((s, e) => s + e.amount, 0)

  const goal = settings.moneyGoal || 3500
  const remaining = Math.max(0, goal - monthTotal)
  const pct = Math.min(100, Math.round((monthTotal / goal) * 100))
  const daysLeft = daysLeftInMonth()
  const requiredPace = remaining > 0 ? Math.ceil(remaining / daysLeft) : 0

  // Run-rate: projected month-end at the current daily average. Only shown once
  // a few days in (gate below) — a single entry on the 1st would project wildly.
  const now = new Date()
  const dayOfMonth = now.getDate()
  const projected = Math.round((monthTotal / dayOfMonth) * daysInMonth(now))

  const perSource = SOURCES.map((src) => ({
    src,
    total: monthEntries.filter((e) => e.source === src).reduce((s, e) => s + e.amount, 0),
  })).filter((s) => s.total > 0)

  return (
    <div className="space-y-5 pt-3">
      <h1 className="text-2xl font-semibold">Money</h1>

      {/* The pile — lifetime banked, the boldest number in the app */}
      <Card className="px-5 py-6 text-center">
        <SectionLabel>Banked — all time</SectionLabel>
        <div className="mt-2 font-clock tnum text-5xl text-accent scoreboard">{money(lifetime)}</div>
      </Card>

      {/* This month's goal */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <SectionLabel>{MONTHS[new Date().getMonth()]}</SectionLabel>
          <GoalEditor goal={goal} onSave={(v) => updateSettings({ moneyGoal: v })} />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-clock tnum text-3xl text-ink">{money(monthTotal)}</span>
          <span className="font-clock tnum text-sm text-muted">/ {money(goal)}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Mini label="To go" value={money(remaining)} />
          <Mini label="Days left" value={daysLeft} />
          <Mini label="Need / day" value={money(requiredPace)} accent />
        </div>
        {monthTotal > 0 && dayOfMonth >= 5 && (
          <p className="mt-4 text-center text-xs text-muted">
            At your current pace you'll bank <span className="text-ink">{money(projected)}</span> by month-end.
          </p>
        )}
      </Card>

      {/* Log income */}
      <LogIncome onAdd={addIncome} />

      {/* This month's entries */}
      {monthEntries.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>This month</SectionLabel>
            <div className="flex gap-3 text-xs text-muted">
              {perSource.map((s) => (
                <span key={s.src}>
                  {s.src} <span className="font-clock text-ink">{money(s.total)}</span>
                </span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {monthEntries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <span className="font-clock tnum text-ink">{money(e.amount)}</span>
                <span className="flex-1 text-sm text-muted">
                  {e.source} · {e.date.slice(5)}
                </span>
                <button
                  type="button"
                  onClick={() => deleteIncome(e.id)}
                  aria-label="Delete entry"
                  className="px-1 text-muted hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Mini({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-surface2 py-2.5">
      <div className={`font-clock tnum text-lg ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

function GoalEditor({ goal, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(goal))
  if (!editing) {
    return (
      <button type="button" onClick={() => { setVal(String(goal)); setEditing(true) }} className="text-xs text-accent">
        Edit goal
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-24 rounded-lg border border-line bg-surface2 px-2 py-1 font-clock text-sm text-ink focus:border-accent focus:outline-none"
        autoFocus
      />
      <button
        type="button"
        onClick={() => { onSave(Number(val) || goal); setEditing(false) }}
        className="text-xs text-accent"
      >
        Save
      </button>
    </span>
  )
}

function LogIncome({ onAdd }) {
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('Job')
  const [date, setDate] = useState(dateKey())

  function submit(e) {
    e.preventDefault()
    onAdd({ amount, source, date })
    setAmount('')
  }

  return (
    <Card className="p-4">
      <SectionLabel>Log income</SectionLabel>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-line bg-surface2 px-3">
            <span className="font-clock text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent py-2.5 pl-1 font-clock text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <input
            type="date"
            value={date}
            max={dateKey()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-line bg-surface2 px-3 py-2.5 font-clock text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`flex-1 rounded-xl border py-2 text-sm ${
                source === s ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2 text-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!Number(amount)}
          className="w-full rounded-xl bg-accent py-3 font-medium text-accent-ink disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </Card>
  )
}
