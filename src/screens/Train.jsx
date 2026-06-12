import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel } from '../components/ui.jsx'
import { dateKey, lastNWeeks, daysUntil } from '../lib/dates.js'

const TYPES = ['Easy', 'Workout', 'Long', 'Strides', 'Lift', 'Cross']

function pace(miles, minutes) {
  if (!miles || !minutes) return null
  const p = minutes / miles
  const m = Math.floor(p)
  const s = String(Math.round((p - m) * 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function Train() {
  const { runs, settings, addRun, deleteRun, addShoe, updateSettings } = useStore()

  const weeks = lastNWeeks(4).map((w) => ({
    ...w,
    miles: runs
      .filter((r) => r.date >= w.startKey && r.date <= w.endKey)
      .reduce((s, r) => s + (r.miles || 0), 0),
  }))
  const thisWeek = weeks[3].miles
  const lastWeek = weeks[2].miles
  const maxWeek = Math.max(1, ...weeks.map((w) => w.miles))
  const bigJump = lastWeek > 0 && thisWeek > lastWeek * 1.15

  const reportDays = daysUntil(settings.reportDate)
  const recent = [...runs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)

  return (
    <div className="space-y-5 pt-3">
      <h1 className="text-2xl font-semibold">Train</h1>

      {/* Season countdown */}
      <Card className="flex items-center justify-between px-5 py-4">
        <div>
          <SectionLabel>Report to Fresno State</SectionLabel>
          <input
            type="date"
            value={settings.reportDate}
            onChange={(e) => updateSettings({ reportDate: e.target.value })}
            className="mt-1 block bg-transparent font-clock text-sm text-muted focus:outline-none"
          />
        </div>
        <div className="text-right">
          <div className="font-clock tnum text-3xl text-accent scoreboard">
            {reportDays != null ? reportDays : '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted">days out</div>
        </div>
      </Card>

      {/* Weekly mileage */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Mileage</SectionLabel>
          <span className="font-clock tnum text-sm text-muted">
            this week <span className="text-ink">{thisWeek.toFixed(1)}</span> mi
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end justify-between gap-3">
          {weeks.map((w, i) => (
            <div key={w.startKey} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md ${i === 3 ? 'bg-accent' : 'bg-surface2'}`}
                  style={{ height: `${(w.miles / maxWeek) * 100}%`, minHeight: w.miles ? '6px' : '2px' }}
                />
              </div>
              <span className="font-clock tnum text-[11px] text-muted">{w.miles.toFixed(0)}</span>
              <span className="text-[9px] uppercase text-muted">{w.label}</span>
            </div>
          ))}
        </div>
        {bigJump && (
          <p className="mt-3 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
            Big jump — {lastWeek.toFixed(0)} → {thisWeek.toFixed(0)} mi (&gt;15%). Build gradually.
          </p>
        )}
      </Card>

      {/* Log a session */}
      <LogRun shoes={settings.shoes || []} onAdd={addRun} onNewShoe={addShoe} />

      {/* Recent sessions */}
      {recent.length > 0 && (
        <Card className="p-4">
          <SectionLabel>Recent</SectionLabel>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="text-sm text-ink">
                    {r.type} · <span className="font-clock">{r.miles}</span> mi
                    {pace(r.miles, r.minutes) && (
                      <span className="text-muted"> · {pace(r.miles, r.minutes)}/mi</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {r.date.slice(5)}
                    {r.rpe ? ` · RPE ${r.rpe}` : ''}
                    {r.shoe ? ` · ${r.shoe}` : ''}
                    {r.warmup ? ' · warm-up ✓' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRun(r.id)}
                  aria-label="Delete session"
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

function LogRun({ shoes, onAdd, onNewShoe }) {
  const [type, setType] = useState('Easy')
  const [miles, setMiles] = useState('')
  const [minutes, setMinutes] = useState('')
  const [rpe, setRpe] = useState(5)
  const [shoe, setShoe] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [note, setNote] = useState('')

  const preview = pace(Number(miles), Number(minutes))

  function submit(e) {
    e.preventDefault()
    if (shoe && !shoes.includes(shoe)) onNewShoe(shoe) // remember new shoes
    onAdd({ type, miles, minutes, rpe, shoe, warmup, note })
    setMiles(''); setMinutes(''); setNote(''); setWarmup(false)
  }

  return (
    <Card className="p-4">
      <SectionLabel>Log a session</SectionLabel>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl border py-2 text-sm ${
                type === t ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2 text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <LabeledInput label="Miles" value={miles} onChange={setMiles} placeholder="0.0" />
          <LabeledInput label="Minutes" value={minutes} onChange={setMinutes} placeholder="0" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted">Pace</div>
            <div className="mt-1 rounded-xl border border-line bg-surface2 px-3 py-2.5 font-clock text-ink">
              {preview ? `${preview}` : '—'}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-muted">RPE — effort</span>
            <span className="font-clock tnum text-sm text-accent">{rpe}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            style={{ accentColor: 'var(--accent)' }}
            className="mt-1 w-full"
          />
        </div>

        <div className="flex gap-2">
          <input
            list="shoe-list"
            value={shoe}
            onChange={(e) => setShoe(e.target.value)}
            placeholder="Shoe (optional)"
            className="input flex-1"
          />
          <datalist id="shoe-list">
            {shoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={warmup}
              onChange={(e) => setWarmup(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Warm-up
          </label>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="input"
        />

        <button
          type="submit"
          disabled={!Number(miles) && !Number(minutes)}
          className="w-full rounded-xl bg-accent py-3 font-medium text-accent-ink disabled:opacity-40"
        >
          Log session
        </button>
      </form>
    </Card>
  )
}

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input mt-1 font-clock"
      />
    </div>
  )
}
