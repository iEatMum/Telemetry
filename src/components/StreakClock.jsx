// StreakClock.jsx — the signature element. The current streak rendered like a
// race-clock / scoreboard readout: DAYS : HRS : MIN, ticking live, with a small
// seconds digit so it feels alive. This is the one place we spend the boldness.

import { useEffect, useState } from 'react'
import { elapsedParts } from '../lib/dates.js'

// Re-render every `ms`. Tiny local hook — nothing fancy.
function useNow(ms = 1000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function Unit({ value, label, size = 'big' }) {
  const numClass =
    size === 'big'
      ? 'text-5xl sm:text-6xl text-accent scoreboard'
      : 'text-2xl text-muted'
  return (
    <div className="flex flex-col items-center">
      <span className={`font-clock tnum leading-none ${numClass}`}>{value}</span>
      <span className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
    </div>
  )
}

function Colon() {
  return (
    <span className="font-clock text-4xl sm:text-5xl leading-none text-line self-start mt-1">
      :
    </span>
  )
}

export default function StreakClock({ startedAt }) {
  useNow(1000)
  const { days, hours, minutes, seconds } = elapsedParts(startedAt)

  return (
    <div className="flex items-start justify-center gap-3">
      <Unit value={days} label="Days" />
      <Colon />
      <Unit value={pad(hours)} label="Hrs" />
      <Colon />
      <Unit value={pad(minutes)} label="Min" />
      <div className="ml-1 self-start">
        <Unit value={pad(seconds)} label="Sec" size="small" />
      </div>
    </div>
  )
}
