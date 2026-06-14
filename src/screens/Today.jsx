import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Card, SectionLabel, Stat } from '../components/ui.jsx'
import WellnessSheet from '../components/WellnessSheet.jsx'
import { verseForDay } from '../lib/verses.js'
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

export default function Today({ onOpenSettings, onOpenReview }) {
  const { settings, streak, sprints, income, runs } = useStore()

  const days = streakDays(streak.startedAt)
  const verse = verseForDay()
  const toFresno = daysUntil(settings.reportDate) // fresh-start landmark (Dai/Milkman 2014)
  const [wellnessOpen, setWellnessOpen] = useState(false)

  const today = dateKey()
  const sprintsToday = sprints.find((s) => s.date === today)?.count || 0
  const monthPrefix = today.slice(0, 7)
  const moneyThisMonth = income
    .filter((e) => (e.date || '').startsWith(monthPrefix))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const weekKeys = new Set(lastNDates(7))
  const milesThisWeek = runs
    .filter((r) => weekKeys.has(r.date))
    .reduce((sum, r) => sum + (Number(r.miles) || 0), 0)

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
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5">
            <span aria-hidden>🔥</span>
            <span className="font-clock tnum text-sm text-accent">{days}</span>
            <span className="text-xs text-muted">{days === 1 ? 'day' : 'days'}</span>
          </div>
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

      {/* Sunday Debrief banner — gated on the 3am app-day, like everything else */}
      {isAppSunday() && (
        <button
          type="button"
          onClick={onOpenReview}
          className="block w-full rounded-2xl border border-accent/40 bg-accent/5 p-4 text-left"
        >
          <div className="text-sm font-medium text-accent">Sunday Debrief →</div>
          <div className="mt-0.5 text-sm text-muted">Ten minutes. Review the week, set one change.</div>
        </button>
      )}

      {/* Daily verse */}
      <Card className="overflow-hidden">
        <div className="border-l-2 border-accent p-5">
          <SectionLabel>Today's verse</SectionLabel>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{verse.text}</p>
          <div className="mt-3 font-clock text-sm text-accent">{verse.ref}</div>
        </div>
      </Card>

      {/* Reading plan */}
      <ReadingCard />

      {/* Morning protocol */}
      <MorningChecklist wakeTime={settings.wakeTime} bedTime={settings.bedTime} />

      {/* Morning readiness */}
      <ReadinessCard onOpen={() => setWellnessOpen(true)} />

      {/* Today's tasks (recurring engine) */}
      <TaskList />

      {/* Stat row */}
      <Card className="grid grid-cols-4 divide-x divide-line">
        <Stat value={days} label="Streak" accent />
        <Stat value={sprintsToday} label="Sprints" />
        <Stat value={`$${moneyThisMonth}`} label="This mo" />
        <Stat value={milesThisWeek.toFixed(milesThisWeek % 1 ? 1 : 0)} label="Mi / wk" />
      </Card>

      <p className="pb-2 text-center text-xs text-muted">A reset is data, not failure.</p>

      {wellnessOpen && <WellnessSheet onClose={() => setWellnessOpen(false)} />}
    </div>
  )
}

// ---- Reading plan ----------------------------------------------------------
function ReadingCard() {
  const { reading, advanceReading } = useStore()
  const done = reading.index >= reading.plan.length
  const current = done ? null : reading.plan[reading.index]

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <SectionLabel>Today's reading</SectionLabel>
        <span className="font-clock tnum text-xs text-muted">
          {reading.index}/{reading.plan.length}
        </span>
      </div>
      {done ? (
        <p className="mt-3 text-[15px] text-ink">Plan complete. Add the next book in Settings.</p>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-clock text-xl text-ink">{current}</span>
          <button
            type="button"
            onClick={advanceReading}
            className="rounded-xl border border-accent px-4 py-2 text-sm font-medium text-accent"
          >
            Mark read →
          </button>
        </div>
      )}
    </Card>
  )
}

// ---- Morning readiness check-in --------------------------------------------
function ReadinessCard({ onOpen }) {
  const { wellness } = useStore()
  const r = readiness(wellness[appDayKey()])
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-2xl border border-line bg-surface p-4 text-left"
    >
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
        <div className="mt-1 text-sm text-muted">10-second check-in — how charged are you? →</div>
      )}
    </button>
  )
}

// ---- Morning checklist (tri-state: done / missed) --------------------------
function MorningChecklist({ wakeTime, bedTime }) {
  const { checklist, cycleChecklistItem } = useStore()
  const today = checklist[appDayKey()] || {}
  // Yesterday's app-day, to spot a SECOND consecutive miss — the real risk;
  // one miss is noise (Lally 2010). appDayDate is noon-anchored so DST is safe.
  const ad = appDayDate()
  const yest = checklist[dateKey(new Date(ad.getFullYear(), ad.getMonth(), ad.getDate() - 1))] || {}

  // If-then implementation intentions, each anchored to the prior step
  // (Gollwitzer & Sheeran 2006; habit stacking, Wood & Neal 2007).
  const items = [
    { key: 'wake', label: `Wake ${wakeTime || '06:45'} — feet on floor`, tag: null },
    { key: 'prayer', label: 'Then sit down → prayer + Bible, 15 min', tag: null },
    { key: 'run', label: 'Then shoes on → morning run', tag: null },
    { key: 'phone', label: 'Alarm fires → phone out of the room', tag: fmt12(bedTime || '22:15') },
  ]

  const doneCount = items.filter((i) => normalize(today[i.key]) === 'done').length
  const allDone = doneCount === items.length
  // Fires only on the 2nd consecutive miss of the same item — silent after one.
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
  return v === true ? 'done' : v // legacy booleans
}

// 'HH:MM' (24h) -> '10:15pm'. Handles noon/midnight + zero-padded minutes so
// the checklist tag always matches the configurable bedTime setting.
function fmt12(t) {
  const [h, m] = (t || '22:15').split(':').map(Number)
  const ap = h < 12 ? 'am' : 'pm'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')}${ap}`
}

function CheckRow({ state, onCycle, label, tag }) {
  const done = state === 'done'
  const missed = state === 'missed'
  return (
    <button
      type="button"
      onClick={onCycle}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      aria-pressed={done}
    >
      <Box state={state} />
      <span className={`flex-1 text-[15px] ${done ? 'text-muted line-through' : missed ? 'text-muted' : 'text-ink'}`}>
        {label}
      </span>
      {missed && <span className="text-[10px] uppercase tracking-wide text-muted">missed</span>}
      {tag && <span className="text-xs text-muted">{tag}</span>}
    </button>
  )
}

function Box({ state }) {
  if (state === 'missed') {
    return (
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-muted text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    )
  }
  const done = state === 'done'
  return (
    <span
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${
        done ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface2'
      }`}
    >
      {done && (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
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
  // Show a one-time task as "just done" only on the day it was completed, then
  // let it drop off — otherwise every task ever finished lingers here forever.
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
        <SectionLabel>Today's tasks</SectionLabel>
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
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-ink disabled:opacity-40"
              disabled={!draft.trim()}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {RECURRENCE_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setRecIdx(i)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  recIdx === i ? 'border-accent text-accent' : 'border-line text-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="ml-auto rounded-full border border-line bg-surface2 px-2 py-1 text-xs text-muted focus:outline-none"
            >
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
                    <Box state={t.done ? 'done' : undefined} />
                  </button>
                  <div className="flex-1">
                    <span className={`text-[15px] ${t.done ? 'text-muted line-through' : 'text-ink'}`}>
                      {t.title}
                    </span>
                    <span className="ml-2 text-[11px] text-muted">
                      {t.cat} · {recurrenceLabel(t.recurrence)}
                    </span>
                  </div>
                  {recurring ? (
                    <button
                      type="button"
                      onClick={() => missTask(t.id)}
                      className="text-[11px] uppercase tracking-wide text-muted"
                    >
                      skip
                    </button>
                  ) : (
                    <>
                      {/* Push to tomorrow — once, and not for Run tasks */}
                      {!t.done && !t.pushedOnce && t.cat !== 'Run' && (
                        <button
                          type="button"
                          onClick={() => pushTask(t.id)}
                          className="text-[11px] uppercase tracking-wide text-muted"
                        >
                          → tmrw
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTask(t.id)}
                        aria-label="Delete task"
                        className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
                      >
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
