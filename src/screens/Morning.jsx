// Morning.jsx — the Morning Face. Commitment: intent and action.
//
// The "do the work" surface. Protocol (the if-then cue chain, minus prayer —
// that moved to Offerings), readiness, today's tasks, a compact streak with
// HELP NOW always one tap away, and a sprint entry. The heavier surfaces
// (full Streak calendar/reset, Sprint, Train, Money) open as sub-views via
// onOpenSub — so the bottom nav stays at three calm tabs.

import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel, Stat, TriStateBox, CheckRow, AccentChip } from '../components/ui.jsx'
import StreakClock from '../components/StreakClock.jsx'
import WellnessSheet from '../components/WellnessSheet.jsx'
import { readiness } from '../lib/wellness.js'
import { isDue, recurrenceLabel, RECURRENCE_PRESETS, CATEGORIES } from '../lib/tasks.js'
import {
  appDayKey,
  appDayDate,
  dateKey,
  daysUntil,
  greeting,
  longDate,
  isAppSunday,
  lastNDates,
  streakDays,
} from '../lib/dates.js'

export default function Morning({ onOpenSub, onOpenSettings, onOpenReview }) {
  const { settings, streak, sprints, income, runs } = useStore()
  const [wellnessOpen, setWellnessOpen] = useState(false)

  const days = streakDays(streak.startedAt)
  const toFresno = daysUntil(settings.reportDate)
  const today = dateKey()
  const sprintsToday = sprints.find((s) => s.date === today)?.count || 0
  const monthPrefix = today.slice(0, 7)
  const moneyThisMonth = income
    .filter((e) => (e.date || '').startsWith(monthPrefix))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const weekKeys = new Set(lastNDates(7))
  const milesThisWeek = runs.filter((r) => weekKeys.has(r.date)).reduce((sum, r) => sum + (Number(r.miles) || 0), 0)

  return (
    <div className="space-y-5 pt-3">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted">{longDate()}</div>
          {toFresno != null && toFresno > 0 && (
            <div className="text-[11px] text-muted">{toFresno} days to Fresno State</div>
          )}
          <h1 className="text-2xl font-semibold leading-tight">
            {greeting()}
            {settings.name ? `, ${settings.name.split(' ')[0]}` : ''}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSub('streak')}
            className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5"
          >
            <span aria-hidden>🔥</span>
            <span className="font-clock tnum text-sm text-accent">{days}</span>
            <span className="text-xs text-muted">{days === 1 ? 'day' : 'days'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sunday Debrief */}
      {isAppSunday() && (
        <button
          type="button"
          onClick={onOpenReview}
          className="block w-full rounded-2xl border border-accent/40 bg-accent/5 p-4 text-left"
        >
          <div className="text-sm font-medium text-accent">Sunday Debrief &rarr;</div>
          <div className="mt-0.5 text-sm text-muted">Ten minutes. Review the week, set one change.</div>
        </button>
      )}

      {/* Morning protocol */}
      <MorningChecklist wakeTime={settings.wakeTime} bedTime={settings.bedTime} />

      {/* Readiness */}
      <ReadinessCard onOpen={() => setWellnessOpen(true)} />

      {/* Tasks */}
      <TaskList />

      {/* Compact streak — taps through to the full Streak. (HELP NOW is global,
          pinned by the app shell, reachable from here and every other face.) */}
      <button type="button" onClick={() => onOpenSub('streak')} className="block w-full text-left">
        <Card className="px-4 py-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-muted">Clean — current</span>
            <span className="flex gap-3 font-clock text-xs text-muted">
              <span>{streak.cleanDates.length} <span className="text-muted/70">lifetime</span></span>
              <span>{streak.urgesSurvived.length} <span className="text-muted/70">outlasted</span></span>
            </span>
          </div>
          <StreakClock startedAt={streak.startedAt} />
        </Card>
      </button>

      {/* Sprint entry */}
      <button
        type="button"
        onClick={() => onOpenSub('sprint')}
        className="block w-full rounded-2xl border border-line bg-surface p-5 text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Focus sprint</SectionLabel>
            <div className="mt-1 text-[15px] text-ink">Start a sprint &rarr;</div>
          </div>
          <span className="font-clock tnum text-sm text-muted">{sprintsToday} today</span>
        </div>
      </button>

      {/* Quick stats (display only — navigation is the links row below) */}
      <Card className="grid grid-cols-4 divide-x divide-line">
        <Stat value={days} label="Streak" accent />
        <Stat value={sprintsToday} label="Sprints" />
        <Stat value={`$${moneyThisMonth}`} label="This mo" />
        <Stat value={milesThisWeek.toFixed(milesThisWeek % 1 ? 1 : 0)} label="Mi / wk" />
      </Card>

      {/* Quiet sub-view links */}
      <div className="flex justify-center gap-5 pb-2 font-clock text-[11px] uppercase tracking-wide text-muted">
        <button type="button" onClick={() => onOpenSub('streak')}>Streak</button>
        <button type="button" onClick={() => onOpenSub('money')}>Money</button>
        <button type="button" onClick={() => onOpenSub('train')}>Train</button>
      </div>

      {wellnessOpen && <WellnessSheet onClose={() => setWellnessOpen(false)} />}
    </div>
  )
}

// ---- Morning protocol (tri-state, prayer moved to Offerings) ----------------
function MorningChecklist({ wakeTime, bedTime }) {
  const { checklist, cycleChecklistItem } = useStore()
  const today = checklist[appDayKey()] || {}
  const ad = appDayDate()
  const yest = checklist[dateKey(new Date(ad.getFullYear(), ad.getMonth(), ad.getDate() - 1))] || {}

  const items = [
    { key: 'wake', label: `Wake ${wakeTime || '06:45'} — feet on floor`, tag: null },
    { key: 'run', label: 'Then shoes on → morning run', tag: null },
    { key: 'phone', label: 'Alarm fires → phone out of the room', tag: fmt12(bedTime || '22:15') },
  ]

  const doneCount = items.filter((i) => normalize(today[i.key]) === 'done').length
  const allDone = doneCount === items.length
  const twiceMissed = items.some(
    (i) => normalize(today[i.key]) === 'missed' && normalize(yest[i.key]) === 'missed'
  )
  const counter = allDone ? '✓' : doneCount > 0 ? `${items.length - doneCount} to go` : `${doneCount}/${items.length}`

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <SectionLabel>Morning protocol</SectionLabel>
        <span className="font-clock tnum text-xs text-muted">{counter}</span>
      </div>
      <Card className="divide-y divide-line">
        {items.map((item) => (
          <CheckRow
            key={item.key}
            state={normalize(today[item.key])}
            onCycle={() => cycleChecklistItem(item.key)}
            label={item.label}
            tag={item.tag}
          />
        ))}
      </Card>
      {twiceMissed ? (
        <p className="mt-1.5 px-1 text-[11px] text-muted">Twice now. Reset tomorrow — never miss the same one twice.</p>
      ) : allDone ? (
        <p className="mt-1.5 px-1 text-[11px] text-muted">This is who you are now.</p>
      ) : (
        <p className="mt-1.5 px-1 text-[11px] text-muted">Tap: ✓ done · again: ✕ missed · again: clear</p>
      )}
    </section>
  )
}

function normalize(v) {
  return v === true ? 'done' : v
}
function fmt12(t) {
  const [h, m] = (t || '22:15').split(':').map(Number)
  const ap = h < 12 ? 'am' : 'pm'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')}${ap}`
}

// CheckRow and TriStateBox are imported from ui.jsx

// ---- Readiness check-in -----------------------------------------------------
function ReadinessCard({ onOpen }) {
  const { wellness } = useStore()
  const r = readiness(wellness[appDayKey()])
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-2xl border border-line bg-surface p-4 text-left">
      <div className="flex items-center justify-between">
        <SectionLabel>Morning readiness</SectionLabel>
        {r && (
          <span className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`h-3 w-1.5 rounded-sm ${i < r.score ? 'bg-accent' : 'bg-accent/20'}`} />
            ))}
          </span>
        )}
      </div>
      {r ? (
        <div className="mt-1.5 text-[15px]">
          <span className="text-ink">{r.label}.</span> <span className="text-muted">{r.cue}</span>
        </div>
      ) : (
        <div className="mt-1 text-sm text-muted">10-second check-in — how charged are you? &rarr;</div>
      )}
    </button>
  )
}

// ---- Today's tasks (recurring engine) --------------------------------------
function TaskList() {
  const { tasks, addTask, completeTask, missTask, deleteTask, pushTask } = useStore()
  const [draft, setDraft] = useState('')
  const [recIdx, setRecIdx] = useState(0)
  const [cat, setCat] = useState('Life')

  const today = dateKey()
  const due = tasks.filter((t) => isDue(t, today))
  const doneOneTime = tasks.filter(
    (t) => t.recurrence?.type === 'none' && t.done && t.history?.at(-1)?.date === today
  )
  const display = [...due, ...doneOneTime]

  function submit(e) {
    e.preventDefault()
    addTask(draft, cat, RECURRENCE_PRESETS[recIdx].make(new Date()))
    setDraft('')
  }

  return (
    <section>
      <div className="mb-2 px-1">
        <SectionLabel>Today&rsquo;s tasks</SectionLabel>
      </div>
      <Card className="p-2">
        <form onSubmit={submit} className="space-y-2 p-2">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 rounded-xl border border-line bg-surface2 px-3 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button type="submit" className="rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-ink disabled:opacity-40" disabled={!draft.trim()}>
              Add
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {RECURRENCE_PRESETS.map((p, i) => (
              <AccentChip
                key={p.label}
                active={recIdx === i}
                onClick={() => setRecIdx(i)}
              >
                {p.label}
              </AccentChip>
            ))}
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="ml-auto rounded-full border border-line bg-surface2 px-2 py-1 text-xs text-muted focus:outline-none">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </form>

        {display.length > 0 && (
          <ul className="mt-1 divide-y divide-line">
            {display.map((t) => {
              const recurring = t.recurrence?.type !== 'none'
              return (
                <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
                  <button type="button" onClick={() => completeTask(t.id)} aria-label="Complete">
                    <TriStateBox state={t.done ? 'done' : undefined} />
                  </button>
                  <div className="flex-1">
                    <span className={`text-[15px] ${t.done ? 'text-muted line-through' : 'text-ink'}`}>{t.title}</span>
                    <span className="ml-2 text-[11px] text-muted">{t.cat} · {recurrenceLabel(t.recurrence)}</span>
                  </div>
                  {recurring ? (
                    <button type="button" onClick={() => missTask(t.id)} className="text-[11px] uppercase tracking-wide text-muted">skip</button>
                  ) : (
                    <>
                      {!t.done && !t.pushedOnce && t.cat !== 'Run' && (
                        <button type="button" onClick={() => pushTask(t.id)} className="text-[11px] uppercase tracking-wide text-muted">→ tmrw</button>
                      )}
                      <button type="button" onClick={() => deleteTask(t.id)} aria-label="Delete task" className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </section>
  )
}
