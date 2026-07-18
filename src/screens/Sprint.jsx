import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel } from '../components/ui.jsx'
import { appDayKey, appDayDate, lastNDates, WEEKDAYS } from '../lib/dates.js'
import {
  prepareSound,
  playSound,
  notify,
  requestNotificationPermission,
  requestWakeLock,
  releaseWakeLock,
  reacquireWakeLockIfNeeded,
  triggerFocusShortcut,
} from '../lib/browser.js'

const PRESETS = [20, 25]
const BREAK_MIN = 5
const DAILY_TARGET = 6

export default function Sprint() {
  const { completeSprint, sprints, settings, updateSettings } = useStore()

  const [durationMin, setDurationMin] = useState(25)
  const [label, setLabel] = useState(settings.nextSprintNote || '') // resume where you parked it
  const [mode, setMode] = useState('sprint') // 'sprint' | 'break'
  const [status, setStatus] = useState('idle') // idle | running | paused | finished
  const [remaining, setRemaining] = useState(25 * 60)
  const [extensions, setExtensions] = useState(0) // capped +5s this sprint
  const [parkNote, setParkNote] = useState('') // end-of-sprint "next step" note
  const endRef = useRef(null) // wall-clock ms when the timer hits 0
  const finishedRef = useRef(false) // guards finish() from running twice

  // Tick from a real end-timestamp so backgrounding the tab doesn't drift.
  useEffect(() => {
    if (status !== 'running') return
    const tick = () => {
      const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) {
        clearInterval(id) // stop the live interval before React tears it down
        finish()
      }
    }
    const id = setInterval(tick, 250)
    const onVis = () => {
      reacquireWakeLockIfNeeded()
      tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode])

  function startTimer(mins, theMode) {
    finishedRef.current = false
    setMode(theMode)
    setRemaining(mins * 60)
    setExtensions(0)
    if (theMode === 'sprint') setParkNote('')
    endRef.current = Date.now() + mins * 60 * 1000
    setStatus('running')
    prepareSound() // unlock audio inside this user gesture
    requestWakeLock()
    requestNotificationPermission() // polite, only prompts the first time
  }

  function startSprint() {
    startTimer(durationMin, 'sprint')
  }
  function startBreak() {
    startTimer(BREAK_MIN, 'break')
  }

  // Capped "+5 — finish this thought": let the stop land at a natural boundary
  // (Adamczyk & Bailey 2004), but bounded (2 max) so it can't crowd out the break.
  function extend() {
    if (mode !== 'sprint' || extensions >= 2) return
    endRef.current += 5 * 60 * 1000
    setRemaining((r) => r + 5 * 60)
    setExtensions((n) => n + 1)
  }

  function pause() {
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)))
    setStatus('paused')
    releaseWakeLock()
  }
  function resume() {
    finishedRef.current = false
    endRef.current = Date.now() + remaining * 1000
    setStatus('running')
    requestWakeLock()
  }
  function stop() {
    finishedRef.current = false
    setStatus('idle')
    setMode('sprint')
    setRemaining(durationMin * 60)
    releaseWakeLock()
  }

  function finish() {
    if (finishedRef.current) return // idempotent — a racing tick can't double-count
    finishedRef.current = true
    setStatus('finished')
    playSound()
    releaseWakeLock()
    if (mode === 'sprint') {
      completeSprint(label.trim())
      notify('Sprint complete', label.trim() ? `"${label.trim()}" — done.` : 'Done. Stand up, breathe.')
    } else {
      notify('Break over', 'Back to it.')
    }
  }

  const todayCount = sprints.find((s) => s.date === appDayKey())?.count || 0

  // ---- Active takeover (running / paused / finished) -----------------------
  if (status !== 'idle') {
    return (
      <SprintTakeover
        mode={mode}
        status={status}
        remaining={remaining}
        label={label}
        focusName={settings.focusShortcutName}
        canExtend={mode === 'sprint' && extensions < 2}
        onExtend={extend}
        parkNote={parkNote}
        onParkNote={(v) => {
          setParkNote(v)
          updateSettings({ nextSprintNote: v })
        }}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onStartBreak={startBreak}
        onDone={stop}
      />
    )
  }

  // ---- Idle setup ----------------------------------------------------------
  // The sprint page reads as a ledger section (Split Ledger, M2): ruled regions,
  // mono labels, ink for the user's own numbers. Lane-red appears exactly once —
  // Start, the committed act.
  return (
    <div className="space-y-6 pt-3">
      <h1 className="border-b border-line pb-2 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted">
        Sprints
      </h1>

      <Card className="p-4">
        {/* Length — a selection, not a commitment: the current-line treatment */}
        <div className="flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setDurationMin(m)
                setRemaining(m * 60)
              }}
              className={`flex-1 rounded-md border py-3 font-clock tnum text-lg ${
                durationMin === m
                  ? 'border-accent-deep bg-surface2 font-medium text-ink'
                  : 'border-line bg-surface text-muted'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">Pick the length you can hold. 20–25 min is a starting point, not a law.</p>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you working on? (optional)"
          className="mt-4 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-muted focus:border-accent-deep focus:outline-none"
        />

        <p className="mt-4 text-xs text-muted">Edge, not a rule: put the phone in another room for this one — a phone in reach is a small tax on focus.</p>

        <button
          type="button"
          onClick={startSprint}
          className="mt-4 w-full rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Start
        </button>
      </Card>

      {/* Daily target — six marks, inked as they post */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Today's target</SectionLabel>
          <span className="font-clock tnum text-sm text-muted">
            {todayCount < DAILY_TARGET && todayCount >= DAILY_TARGET - 2
              ? `${DAILY_TARGET - todayCount} to go`
              : `${todayCount}/${DAILY_TARGET}`}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          {Array.from({ length: DAILY_TARGET }).map((_, i) => (
            <span
              key={i}
              className={`h-[5px] flex-1 ${i < todayCount ? 'bg-ink' : 'bg-line'}`}
            />
          ))}
        </div>
        {todayCount > DAILY_TARGET && (
          <div className="mt-2 text-right font-clock tnum text-xs text-ink">+{todayCount - DAILY_TARGET} past target</div>
        )}
      </Card>

      {/* History */}
      <WeekChart sprints={sprints} />

      {/* One-time Focus setup helper */}
      <FocusHelp focusName={settings.focusShortcutName} />
    </div>
  )
}

// ---- Distraction-free takeover --------------------------------------------
function SprintTakeover({
  mode,
  status,
  remaining,
  label,
  focusName,
  canExtend,
  onExtend,
  parkNote,
  onParkNote,
  onPause,
  onResume,
  onStop,
  onStartBreak,
  onDone,
}) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const running = status === 'running'
  const finished = status === 'finished'

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg pt-safe">
      <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="text-xs uppercase tracking-[0.25em] text-muted">
          {mode === 'break' ? 'Break' : 'Focus sprint'}
        </div>

        {label && mode === 'sprint' && (
          <div className="mt-2 max-w-xs text-center text-sm text-muted">{label}</div>
        )}

        {/* Ink numerals; the breath rides them while running — never a recolor */}
        <div
          className={`mt-6 font-clock tnum text-[5.5rem] font-medium leading-none scoreboard text-ink ${
            running ? 'animate-pulse-accent' : ''
          }`}
        >
          {mm}:{ss}
        </div>

        {mode === 'break' && status === 'running' && (
          <p className="mt-6 max-w-xs text-center text-sm text-muted">
            Skip the feed — screens don’t recharge focus. Get outside · look far · stretch.
          </p>
        )}

        {mode === 'sprint' && running && remaining > 0 && remaining <= 30 && (
          <p className="mt-6 max-w-xs text-center text-sm text-muted">Wrap it up — land on a stopping point.</p>
        )}

        {/* Controls */}
        {!finished && (
          <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
            {running ? (
              <button
                type="button"
                onClick={onPause}
                className="w-full rounded-md border border-line py-4 font-clock text-sm uppercase tracking-widest2 text-ink"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={onResume}
                className="w-full rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={onStop}
              className="w-full rounded-md border border-line py-3.5 text-sm text-muted"
            >
              End {mode === 'break' ? 'break' : 'sprint'}
            </button>

            {canExtend && (
              <button
                type="button"
                onClick={onExtend}
                className="w-full rounded-md border border-line py-3 text-sm text-muted"
              >
                +5 — finish this thought
              </button>
            )}

            {mode === 'sprint' && (
              <button
                type="button"
                onClick={() => triggerFocusShortcut(focusName)}
                className="mt-2 text-center text-xs text-muted underline-offset-2 hover:underline"
              >
                Silence my phone (iOS Focus)
              </button>
            )}
          </div>
        )}

        {/* Completion */}
        {finished && (
          <div className="mt-10 w-full max-w-xs space-y-3 text-center">
            <p className="text-lg font-semibold">
              {mode === 'sprint' ? 'Sprint done.' : 'Break over.'}
            </p>
            {mode === 'sprint' ? (
              <>
                <input
                  value={parkNote}
                  onChange={(e) => onParkNote(e.target.value)}
                  placeholder="Next sprint starts here…"
                  className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent-deep focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onStartBreak}
                  className="w-full rounded-md bg-ink py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-bg"
                >
                  Take a 5-min break
                </button>
                <button
                  type="button"
                  onClick={onDone}
                  className="w-full rounded-md border border-line py-3.5 text-sm text-muted"
                >
                  Skip — done for now
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-md bg-ink py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-bg"
              >
                Back to it
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- 7-day history bar chart ----------------------------------------------
function WeekChart({ sprints }) {
  const week = lastNDates(7, appDayDate()).map((key) => {
    const [y, m, d] = key.split('-').map(Number)
    return {
      key,
      day: WEEKDAYS[new Date(y, m - 1, d).getDay()][0],
      count: sprints.find((s) => s.date === key)?.count || 0,
    }
  })
  const max = Math.max(1, ...week.map((w) => w.count))

  return (
    <Card className="p-5">
      <SectionLabel>Last 7 days</SectionLabel>
      <div className="mt-4 flex h-28 items-end justify-between gap-2">
        {week.map((w, i) => (
          <div key={w.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full ${w.count ? 'bg-ink' : 'bg-line'}`}
                style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count ? '8px' : '3px' }}
                title={`${w.count} sprint${w.count === 1 ? '' : 's'}`}
              />
            </div>
            <span className={`font-clock tnum text-[0.6875rem] ${i === 6 ? 'text-ink' : 'text-muted'}`}>
              {w.count}
            </span>
            <span className="text-[0.625rem] uppercase text-muted">{w.day}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---- One-time Focus setup explainer ---------------------------------------
function FocusHelp({ focusName }) {
  return (
    <details className="border-b border-line bg-surface p-4 text-sm">
      <summary className="cursor-pointer text-muted">
        Silence the phone during sprints (one-time setup)
      </summary>
      <div className="mt-3 space-y-2 text-muted">
        <p>
          A web app can't silence your phone on its own. So set up an iOS Shortcut
          once, and the “Silence my phone” button in a sprint will trigger it:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open the <span className="text-ink">Shortcuts</span> app → new shortcut.</li>
          <li>Add <span className="text-ink">Set Focus</span> → On → choose “Do Not Disturb”.</li>
          <li>
            Name it exactly <span className="font-clock text-ink">{focusName || 'Sprint'}</span>.
          </li>
          <li>Make a second one that turns Focus Off for when you're done.</li>
        </ol>
        <p className="text-xs">(You can rename the shortcut target in Settings later.)</p>
      </div>
    </details>
  )
}
