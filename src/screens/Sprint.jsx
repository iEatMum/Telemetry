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
  const { completeSprint, sprints, settings } = useStore()

  const [durationMin, setDurationMin] = useState(25)
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState('sprint') // 'sprint' | 'break'
  const [status, setStatus] = useState('idle') // idle | running | paused | finished
  const [remaining, setRemaining] = useState(25 * 60)
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
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onStartBreak={startBreak}
        onDone={stop}
      />
    )
  }

  // ---- Idle setup ----------------------------------------------------------
  return (
    <div className="space-y-5 pt-3">
      <h1 className="text-2xl font-semibold">Sprint</h1>

      <Card className="p-5">
        {/* Preset toggle */}
        <div className="flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setDurationMin(m)
                setRemaining(m * 60)
              }}
              className={`flex-1 rounded-xl border py-3 font-clock text-lg ${
                durationMin === m
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface2 text-muted'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you working on? (optional)"
          className="mt-4 w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />

        <button
          type="button"
          onClick={startSprint}
          className="mt-4 w-full rounded-2xl bg-accent py-4 text-lg font-bold uppercase tracking-wide text-accent-ink shadow-glow"
        >
          Start
        </button>
      </Card>

      {/* Daily target — 6 dots */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Today's target</SectionLabel>
          <span className="font-clock tnum text-sm text-muted">
            {todayCount}/{DAILY_TARGET}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          {Array.from({ length: DAILY_TARGET }).map((_, i) => (
            <span
              key={i}
              className={`h-4 flex-1 rounded-full ${i < todayCount ? 'bg-accent' : 'bg-surface2'}`}
            />
          ))}
        </div>
        {todayCount > DAILY_TARGET && (
          <div className="mt-2 text-right text-xs text-accent">+{todayCount - DAILY_TARGET} past target</div>
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

        <div
          className={`mt-6 font-clock tnum text-[5.5rem] leading-none scoreboard ${
            running ? 'text-accent animate-pulse-accent' : 'text-ink'
          }`}
        >
          {mm}:{ss}
        </div>

        {/* Controls */}
        {!finished && (
          <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
            {running ? (
              <button
                type="button"
                onClick={onPause}
                className="w-full rounded-2xl border border-accent py-4 font-semibold text-accent"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={onResume}
                className="w-full rounded-2xl bg-accent py-4 font-bold text-accent-ink shadow-glow"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={onStop}
              className="w-full rounded-2xl border border-line py-3.5 text-sm text-muted"
            >
              End {mode === 'break' ? 'break' : 'sprint'}
            </button>

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
                <button
                  type="button"
                  onClick={onStartBreak}
                  className="w-full rounded-2xl bg-accent py-4 font-bold text-accent-ink shadow-glow"
                >
                  Take a 5-min break
                </button>
                <button
                  type="button"
                  onClick={onDone}
                  className="w-full rounded-2xl border border-line py-3.5 text-sm text-muted"
                >
                  Skip — done for now
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-2xl bg-accent py-4 font-bold text-accent-ink shadow-glow"
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
                className={`w-full rounded-t-md ${w.count ? 'bg-accent' : 'bg-surface2'}`}
                style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count ? '8px' : '3px' }}
                title={`${w.count} sprint${w.count === 1 ? '' : 's'}`}
              />
            </div>
            <span className={`font-clock tnum text-[11px] ${i === 6 ? 'text-accent' : 'text-muted'}`}>
              {w.count}
            </span>
            <span className="text-[10px] uppercase text-muted">{w.day}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---- One-time Focus setup explainer ---------------------------------------
function FocusHelp({ focusName }) {
  return (
    <details className="rounded-2xl border border-line bg-surface p-4 text-sm">
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
            Name it exactly <span className="font-clock text-accent">{focusName || 'Sprint'}</span>.
          </li>
          <li>Make a second one that turns Focus Off for when you're done.</li>
        </ol>
        <p className="text-xs">(You can rename the shortcut target in Settings later.)</p>
      </div>
    </details>
  )
}
