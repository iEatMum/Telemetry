import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel } from '../components/ui.jsx'
import Sheet from '../components/Sheet.jsx'
import StreakClock from '../components/StreakClock.jsx'
import {
  appDayKey,
  dateKey,
  elapsedParts,
  monthInfo,
  WEEKDAYS,
} from '../lib/dates.js'

export default function Streak({ onOpenUrge }) {
  const { streak, logCleanToday, logUrgeSurvived } = useStore()
  const [resetOpen, setResetOpen] = useState(false)

  const todayKey = appDayKey()
  const loggedClean = streak.cleanDates.includes(todayKey)

  // Best = the longest completed streak, but never less than the one running now.
  const currentSeconds = elapsedParts(streak.startedAt).totalSeconds
  const bestSeconds = Math.max(streak.bestSeconds || 0, currentSeconds)
  const bestDays = Math.floor(bestSeconds / 86400)

  return (
    <div className="space-y-5 pb-24 pt-3">
      <h1 className="text-2xl font-semibold">Streak</h1>

      {/* Lifetime piles — permanent, only grow. A reset can't touch these
          numbers (mental accounting + loss aversion: Thaler / Kahneman). They
          sit ABOVE the running clock so a day-0 is never the only number. */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-4 py-5 text-center">
          <div className="font-clock tnum text-4xl text-accent scoreboard">{streak.cleanDates.length}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">Clean days · lifetime</div>
        </Card>
        <Card className="px-4 py-5 text-center">
          <div className="font-clock tnum text-4xl text-accent scoreboard">{streak.urgesSurvived.length}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">Urges outlasted</div>
        </Card>
      </div>

      {/* The current run — honest, zeros on a reset */}
      <Card className="px-4 py-7">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="animate-pulse-accent text-lg" aria-hidden>🔥</span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Clean — current</span>
        </div>
        <StreakClock startedAt={streak.startedAt} />
        <div className="mt-6 text-center font-clock text-sm text-muted">
          Best — <span className="text-ink">{bestDays}</span> {bestDays === 1 ? 'day' : 'days'}
        </div>
      </Card>

      {/* Wins + log-clean */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={logCleanToday}
          disabled={loggedClean}
          className={`rounded-2xl border px-4 py-4 text-sm font-medium ${
            loggedClean
              ? 'border-line bg-surface text-muted'
              : 'border-accent bg-accent text-accent-ink'
          }`}
        >
          {loggedClean ? 'Today logged ✓' : 'Log today clean'}
        </button>
        <SurvivedButton onLog={logUrgeSurvived} count={streak.urgesSurvived.length} />
      </div>

      {/* Calendar */}
      <Calendar cleanDates={streak.cleanDates} resets={streak.resets} />

      {/* Pattern readout — data, not shame */}
      <PatternReadout resets={streak.resets} />

      {/* Reset — quiet, never red, never guilt */}
      <button
        type="button"
        onClick={() => setResetOpen(true)}
        className="w-full rounded-2xl border border-line bg-surface py-3.5 text-sm text-muted"
      >
        Log a reset
      </button>

      {/* HELP NOW — large, fixed, always visible on this tab */}
      <HelpNowBar onOpenUrge={onOpenUrge} />

      {resetOpen && <ResetSheet onClose={() => setResetOpen(false)} />}
    </div>
  )
}

// ---- Survived-an-urge button (counts wins, with a brief confirmation) ------
function SurvivedButton({ onLog, count }) {
  const [justLogged, setJustLogged] = useState(false)
  function handle() {
    onLog()
    setJustLogged(true)
    setTimeout(() => setJustLogged(false), 1600)
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="rounded-2xl border border-line bg-surface px-4 py-4 text-sm font-medium text-ink"
    >
      {justLogged ? 'Logged. One more in the bank.' : 'Survived an urge'}
      <span className="mt-0.5 block font-clock tnum text-xs text-muted">Outlasted {count}×</span>
    </button>
  )
}

// ---- Month calendar --------------------------------------------------------
function Calendar({ cleanDates, resets }) {
  const now = new Date()
  const [{ year, month }, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  })
  const info = monthInfo(year, month)
  const clean = new Set(cleanDates)
  const resetDays = new Set(resets.map((r) => (r.at ? dateKey(new Date(r.at)) : null)))
  // Ring the app-day cell (3am rollover) so the "today" ring lands on the same
  // cell the clean-day fill uses — they diverge between midnight and 3am.
  const todayKey = appDayKey()

  function shift(delta) {
    const d = new Date(year, month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const cells = []
  for (let i = 0; i < info.firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= info.daysInMonth; day++) cells.push(day)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="px-2 text-muted">‹</button>
        <SectionLabel>{info.label}</SectionLabel>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="px-2 text-muted">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[10px] uppercase text-muted">{w[0]}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isClean = clean.has(key)
          const isReset = resetDays.has(key)
          const isToday = key === todayKey
          return (
            <div
              key={key}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm font-clock tnum ${
                isClean ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted'
              } ${isToday ? 'ring-1 ring-accent' : ''}`}
            >
              <span className="relative">
                {day}
                {isReset && !isClean && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-muted" />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---- Pattern readout -------------------------------------------------------
function PatternReadout({ resets }) {
  if (!resets.length) {
    return (
      <p className="px-1 text-center text-xs text-muted">
        No resets logged. Each clean day is data on your side.
      </p>
    )
  }

  const timeBucket = (r) => {
    let h
    if (r.time && /^\d{1,2}:/.test(r.time)) h = parseInt(r.time, 10)
    else if (r.at) h = new Date(r.at).getHours()
    else return null
    if (h < 5) return 'late night'
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    if (h < 21) return 'evening'
    return 'night'
  }

  const mode = (arr) => {
    const counts = {}
    let best = null
    for (const v of arr) {
      if (!v) continue
      counts[v] = (counts[v] || 0) + 1
      if (!best || counts[v] > counts[best]) best = v
    }
    return best
  }

  const parts = [
    mode(resets.map(timeBucket)),
    mode(resets.map((r) => r.device)),
    mode(resets.map((r) => r.feeling)),
  ].filter(Boolean)

  if (!parts.length) return null
  return (
    <p className="px-1 text-center text-xs text-muted">
      Most resets: <span className="text-ink">{parts.join(' · ')}</span>
    </p>
  )
}

// ---- Reset journal (20s blocked confirm) -----------------------------------
const FEELINGS = ['bored', 'stressed', "couldn't sleep", 'autopilot']
const DEVICES = ['phone', 'laptop', 'other']

function ResetSheet({ onClose }) {
  const { logReset } = useStore()
  const now = new Date()
  const [time, setTime] = useState(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  )
  const [place, setPlace] = useState('')
  const [device, setDevice] = useState('')
  const [feeling, setFeeling] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // The forced 20-second pause. Confirm is blocked until it reaches 0.
  const [remaining, setRemaining] = useState(20)
  useEffect(() => {
    if (remaining <= 0) return
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  function confirm() {
    if (remaining > 0) return
    logReset({ time, place, device, feeling })
    setConfirmed(true) // show the anti-AVE close screen instead of vanishing
  }

  // Post-reset close screen — the structural firewall against the Abstinence
  // Violation Effect (Marlatt). The day is NOT over; the lifetime totals didn't move.
  if (confirmed) {
    return (
      <Sheet onClose={onClose} title="Logged">
        <div className="space-y-3 py-3 text-center">
          <p className="text-lg font-semibold text-ink">Logged. The clock restarts; the work doesn’t.</p>
          <p className="text-sm text-muted">
            Everyone resets. One data point, not a verdict on you — your lifetime clean days and wins didn’t move.
          </p>
          <p className="text-sm text-muted">Next rep: leave the room. Today’s protocol is still on the board.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl bg-accent py-3.5 font-medium text-accent-ink"
        >
          Back
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} title="Log a reset">
      <p className="text-sm text-muted">
        This is data, not failure. Twenty seconds — what actually happened? The
        pattern is what beats it.
      </p>

      <Field label="What time was it?">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-xl border border-line bg-surface2 px-3 py-2.5 font-clock text-ink focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="Where were you?">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="bedroom, couch…"
          className="rounded-xl border border-line bg-surface2 px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="On what?">
        <ChipRow options={DEVICES} value={device} onChange={setDevice} />
      </Field>

      <Field label="What state were you in?">
        <ChipRow options={FEELINGS} value={feeling} onChange={setFeeling} />
      </Field>

      <button
        type="button"
        onClick={confirm}
        disabled={remaining > 0}
        className={`mt-2 w-full rounded-2xl py-3.5 font-medium ${
          remaining > 0
            ? 'border border-line bg-surface text-muted'
            : 'bg-accent text-accent-ink'
        }`}
      >
        {remaining > 0 ? `Hold on — ${remaining}s` : 'Confirm reset · start fresh'}
      </button>
      <button type="button" onClick={onClose} className="w-full py-3 text-sm text-muted">
        Cancel
      </button>
    </Sheet>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

function ChipRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? '' : o)}
          className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
            value === o
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-surface2 text-muted'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// ---- HELP NOW bar ----------------------------------------------------------
function HelpNowBar({ onOpenUrge }) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-app -translate-x-1/2 px-4">
      <button
        type="button"
        onClick={onOpenUrge}
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-lg font-bold uppercase tracking-wide text-accent-ink shadow-glow"
      >
        Help now
      </button>
    </div>
  )
}
