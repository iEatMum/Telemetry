// WellnessSheet.jsx — the morning readiness check-in. Three fast taps + an
// optional resting HR, and it reads back a charge + a training cue. Built to be
// a tool, not a diary (Harkin 2016: the visible record IS the intervention).

import Sheet from './Sheet.jsx'
import { useStore } from '../lib/store.jsx'
import { appDayKey, lastNDates } from '../lib/dates.js'
import { DIMS, readiness, rhrTrend } from '../lib/wellness.js'
import { readToday, toReadinessInputs } from '../lib/health.js'

export default function WellnessSheet({ onClose }) {
  const { wellness, saveWellness } = useStore()
  const day = appDayKey()

  // "Fill from Health" — pull today's Apple Health / Health Connect snapshot and
  // merge-patch the objective dims (sleep band + resting HR), leaving legs/head
  // for manual taps. Fail-soft: off-native readToday() returns null →
  // toReadinessInputs(null) → null → no-op, so nothing breaks on web/simulator.
  const fillFromHealth = async () => {
    const snap = await readToday()
    const inputs = toReadinessInputs(snap)
    if (inputs) saveWellness(day, inputs)
  }
  const entry = wellness[day] || {}
  const r = readiness(entry)
  const hr = rhrTrend(wellness, day, entry.rhr)

  // Last-7 readiness, for the trend strip (the self-monitoring artifact).
  const trend = lastNDates(7).map((k) => ({ k, score: readiness(wellness[k])?.score || 0 }))

  return (
    <Sheet title="Morning readiness" onClose={onClose}>
      <p className="text-sm text-muted">
        Ten seconds. How charged are you? This is training data — it tells you how to ride today.
      </p>

      {DIMS.map((d) => (
        <div key={d.key} className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">{d.label}</span>
          <div className="flex gap-1.5">
            {d.opts.map((opt, i) => {
              const val = i + 1
              const on = entry[d.key] === val
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => saveWellness(day, { [d.key]: val })}
                  className={`flex-1 rounded-lg border px-1 py-2 text-xs ${
                    on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2 text-muted'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Optional resting HR — the "data" without the friction of requiring it */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">Resting HR — optional</span>
        <div className="flex items-center input">
          <input
            type="number"
            inputMode="numeric"
            value={entry.rhr ?? ''}
            onChange={(e) => saveWellness(day, { rhr: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="bpm"
            className="w-full bg-transparent font-clock text-ink placeholder:text-muted focus:outline-none"
          />
          <span className="font-clock text-xs text-muted">bpm</span>
        </div>
        {hr?.elevated && (
          <span className="text-[11px] text-muted">
            HR’s up ({hr.rhr} vs ~{hr.baseline}). Body’s working on something — respect it today.
          </span>
        )}
        <button
          type="button"
          onClick={fillFromHealth}
          className="self-start rounded-lg border border-line bg-surface2 px-3 py-2 text-xs text-muted"
        >
          Fill from Health
        </button>
      </label>

      {/* Readiness read-out — the hook: a charge + how to train */}
      <div className="rounded-lg border border-line bg-surface2 p-4 text-center">
        {r ? (
          <>
            <div className="mx-auto flex max-w-[220px] items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`h-5 flex-1 rounded ${i < r.score ? 'bg-accent' : 'bg-accent/20'}`} />
              ))}
            </div>
            <div className="mt-3 font-clock text-lg text-ink">{r.label}</div>
            <div className="mt-1 text-sm text-accent">{r.cue}</div>
          </>
        ) : (
          <div className="text-sm text-muted">Tap above to read your charge.</div>
        )}
      </div>

      {/* Last-7 trend */}
      <div>
        <span className="text-xs uppercase tracking-wide text-muted">Last 7</span>
        <div className="mt-2 flex h-12 items-end justify-between gap-1.5">
          {trend.map((t, i) => (
            <div
              key={t.k}
              className={`flex-1 rounded-t-md ${t.score ? 'bg-accent' : 'bg-accent/15'}`}
              style={{ height: `${(t.score / 5) * 100}%`, minHeight: t.score ? '6px' : '2px', opacity: i === 6 ? 1 : 0.6 }}
              title={`${t.k}: ${t.score || '—'}/5`}
            />
          ))}
        </div>
      </div>

      <button type="button" onClick={onClose} className="w-full rounded-lg bg-accent py-3 font-medium text-accent-ink">
        Done
      </button>
    </Sheet>
  )
}
