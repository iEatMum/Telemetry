// widgets.jsx — the registry "deck" (P3.2).
//
// Each export is a self-contained widget that takes a single `config` object and
// renders using the P3.1 primitives (ui.jsx). They are the components a JSON
// payload maps onto — so their `config` shape IS the contract the AI fills in.
//
// Rules for everything here:
//   • Read everything from `config`; never reach into the store (live-state
//     hydration is a later phase). Default every field so a thin/empty config
//     still renders something sane instead of crashing.
//   • Presentation only. No fetching, no business logic.

import {
  Card,
  SectionLabel,
  Stat,
  Grid,
  KpiTile,
  Sparkline,
  BarMeter,
  DeltaTag,
} from './ui.jsx'
import { useEffect, useRef, useState } from 'react'
import { registerImpact, completeImpact, uncompleteImpact, recordPost, unrecordPost, postedIds, summarizeDay } from '../lib/engagement.js'
import { sealCommit } from '../lib/haptics.js'
import { useEntitlement } from '../lib/purchases.js'
import { shareWeekCard } from '../lib/shareCard.js'
import { CoachGate } from './Paywall.jsx'

// HARD RULE (PSYCHOLOGY.md §1, BLUEPRINT §6a / handoff R2): red never lands on
// a person's behavior. A miss renders muted + dashed — the shape carries the
// fact; color would carry the verdict. Late is amber caution data.

// Generic tone → text-color lookup (literal strings for the Tailwind scanner).
const TONE = {
  pos: 'text-pos',
  neg: 'text-neg',
  warn: 'text-warn',
  muted: 'text-muted',
  ink: 'text-ink',
  accent: 'text-accent',
}

/** Optional small header (label + right node) shared by several widgets. */
function WidgetHead({ label, right }) {
  if (!label && right == null) return null
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      {label ? <SectionLabel>{label}</SectionLabel> : <span />}
      {right}
    </div>
  )
}

// ─────────────────────────────────────────────
// ScheduleMatrix — the hero. The day as a tight tabular grid.
// config: { title?, rows: [{ time, block, status, delta?:{value,dir} }] }
// ─────────────────────────────────────────────
export function ScheduleMatrix({ config = {}, block }) {
  const rows = Array.isArray(config.rows) ? config.rows : []
  // Posted rows are ENTRIES — they hydrate from the day-keyed record so a
  // relaunch shows the same inked page (they used to live only in this state
  // and every post silently reverted to open on reload).
  const [doneIds, setDoneIds] = useState(() => new Set(postedIds()))
  const baseId = (block && block.id) || 'sched'
  const rowId = (r, i) => r.id || `${baseId}:${i}`

  // Declare this block's HIGH-IMPACT rows for the day, so the loop can tell a
  // real miss from "never offered" when the day closes.
  useEffect(() => {
    rows.forEach((r, i) => {
      if (r.impact === 'high') registerImpact(rowId(r, i), r.block)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId])

  // Tap posts; tapping again UN-posts (M3 undo — a mis-tap must not poison the
  // book). The engagement layer owns the persistence and refuses any walk-back
  // after the day is sealed.
  function complete(r) {
    const id = r._id
    if (doneIds.has(id)) {
      if (summarizeDay().closed) return // the tape is final once ruled off
      setDoneIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      unrecordPost(id)
      if (r.impact === 'high') uncompleteImpact(id)
      return
    }
    setDoneIds((prev) => new Set(prev).add(id))
    sealCommit() // posting a row is a commit — the one success haptic (undo is silent)
    recordPost(id)
    if (r.impact === 'high') completeImpact(id) // engagement is tracked by BlockRenderer
  }

  const view = rows.map((r, i) => {
    const _id = rowId(r, i)
    return { ...r, _id, _status: doneIds.has(_id) ? 'done' : r.status || 'open' }
  })
  const executed = view.filter((r) => r._status === 'hit' || r._status === 'done').length

  return (
    <section>
      <WidgetHead
        label={config.title || 'Schedule'}
        right={
          <span className="font-clock tnum text-[10px] uppercase tracking-widest2 text-muted">
            {executed}/{view.length} exec
          </span>
        }
      />
      {/* The heat sheet (Split Ledger 01): ruled lines, no box. Each row reads
          like a lane split — mono time, label, state glyph at the right edge.
          The ◆ high-impact marker prints in the LEFT margin, the page's only
          accent. Tapping a row posts it. */}
      <ul className="divide-y divide-line border-b border-line">
        {view.map((r) => (
          <li key={r._id}>
            <button
              type="button"
              onClick={() => complete(r)}
              aria-label={rowA11yLabel(r)}
              className="relative flex min-h-[44px] w-full items-center gap-3 py-2 pl-4 pr-1 text-left"
            >
              {r.impact === 'high' && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] leading-none text-accent"
                  aria-hidden
                >
                  ◆
                </span>
              )}
              <span
                className={`w-11 flex-none font-clock tnum text-[12px] ${
                  r._status === 'late' ? 'text-warn' : 'text-muted'
                }`}
              >
                {r.time || '—'}
              </span>
              <span
                className={`flex-1 truncate text-[13px] ${
                  r._status === 'missed' || r._status === 'skip' ? 'text-muted' : 'text-ink'
                }`}
              >
                {r.block}
              </span>
              {r.delta && <DeltaTag value={r.delta.value} dir={r.delta.dir} suffix={r.delta.suffix} />}
              <StateGlyph status={r._status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// VoiceOver name for a heat-sheet row: the glyphs (◆, ✓, ○) are all
// aria-hidden, so the label must carry the whole story — block, time, state.
const A11Y_STATUS = {
  hit: 'posted',
  done: 'posted',
  late: 'posted late',
  missed: 'not posted',
  skip: 'skipped',
}
function rowA11yLabel(r) {
  const status = A11Y_STATUS[r._status] || 'open'
  const action = r._status === 'done' ? 'Double-tap to undo.' : 'Double-tap to post.'
  return `${r.block}${r.time ? `, ${r.time}` : ''}${
    r.impact === 'high' ? ', high impact' : ''
  } — ${status}. ${action}`
}

// The right-edge state glyph (contract semantics — R2): done posts an ink
// check; missed is an OPEN graphite circle ("not posted" — absence, never red,
// never an ✕); pending is a faint unposted dash. Ink is applied or withheld,
// so color never has to carry a verdict.
function StateGlyph({ status }) {
  const base = 'flex h-5 w-5 flex-none items-center justify-center font-clock text-[13px] leading-none'
  if (status === 'hit' || status === 'done')
    return (
      <span className={`${base} text-ink`} aria-hidden>
        ✓
      </span>
    )
  if (status === 'late')
    return (
      <span className={`${base} text-warn`} aria-hidden>
        –
      </span>
    )
  if (status === 'missed')
    return (
      <span className={base} aria-hidden>
        <span className="h-3 w-3 rounded-full border border-muted" />
      </span>
    )
  if (status === 'skip')
    return (
      <span className={`${base} text-muted`} aria-hidden>
        –
      </span>
    )
  return (
    <span className={`${base} text-faint`} aria-hidden>
      —
    </span>
  )
}

// ─────────────────────────────────────────────
// KpiGrid — tiles of headline numbers.
// config: { title?, cols?, items: [{ label, value, unit, delta, deltaSuffix,
//           spark, sparkTone, accent }] }
// ─────────────────────────────────────────────
export function KpiGrid({ config = {} }) {
  const items = Array.isArray(config.items) ? config.items : []
  const cols = config.cols || 2
  // Trial-balance strip (Split Ledger 07): no tile boxes — hairline column
  // rules divide the figures, a bottom rule closes each row. Small-caps labels,
  // mono figures in ink.
  return (
    <section>
      <WidgetHead label={config.title} />
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((it, i) => (
          <div
            key={it.id ?? i}
            className={`border-b border-line ${i % cols === 0 ? 'pr-3' : 'border-l pl-3'}`}
          >
            <KpiTile {...it} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// StatRow — a compact row of stats inside one card.
// config: { title?, cols?, items: [{ label, value, delta, deltaSuffix, accent }] }
// ─────────────────────────────────────────────
export function StatRow({ config = {} }) {
  const items = Array.isArray(config.items) ? config.items : []
  return (
    <section>
      <WidgetHead label={config.title} />
      <Card className="px-3 py-1">
        <Grid cols={config.cols || items.length || 1} gap={4}>
          {items.map((it, i) => (
            <Stat key={it.id ?? i} {...it} />
          ))}
        </Grid>
      </Card>
    </section>
  )
}

// ─────────────────────────────────────────────
// BiometricChart — a labelled trend line with an optional headline value.
// config: { label, value?, unit?, delta?, deltaDir?, deltaSuffix?, tone?, data:[] }
// ─────────────────────────────────────────────
export function BiometricChart({ config = {} }) {
  const data = Array.isArray(config.data) ? config.data : []
  const dir =
    config.deltaDir ||
    (typeof config.delta === 'number' ? (config.delta >= 0 ? 'up' : 'down') : 'flat')
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest2 text-muted">{config.label}</span>
        {config.delta != null && (
          <DeltaTag value={config.delta} dir={dir} suffix={config.deltaSuffix || ''} />
        )}
      </div>
      {config.value != null && (
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-clock tnum text-2xl leading-none text-ink">{config.value}</span>
          {config.unit && <span className="text-xs text-muted">{config.unit}</span>}
        </div>
      )}
      <div className="mt-3">
        <Sparkline data={data} tone={config.tone || 'accent'} height={84} strokeWidth={1.7} />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────
// GoalProgress — stacked meters toward targets.
// config: { title?, items: [{ label, value, max, right, tone }] }
// ─────────────────────────────────────────────
export function GoalProgress({ config = {} }) {
  const items = Array.isArray(config.items) ? config.items : []
  return (
    <section>
      <WidgetHead label={config.title} />
      <Card className="space-y-4 p-4">
        {items.map((it, i) => (
          <BarMeter
            key={it.id ?? i}
            label={it.label}
            value={it.value}
            max={it.max}
            right={it.right}
            tone={it.tone}
          />
        ))}
      </Card>
    </section>
  )
}

// ─────────────────────────────────────────────
// DeepWorkTimer — the day's anchor block, a REAL countdown (the deck's one
// accent anchor — R1). Timer state is local by contract; the forge only decides
// what the block is. While running, the clock takes the screen (Sprint-cockpit
// doctrine): the deck hides behind a fixed face with a quiet collapse.
// config: { label, minutes, at?, highImpact?, note? }
// ─────────────────────────────────────────────
export function DeepWorkTimer({ config = {}, block }) {
  const minutes = Number.isFinite(config.minutes) && config.minutes > 0 ? config.minutes : 50
  const total = minutes * 60
  const [phase, setPhase] = useState('idle') // idle | running | paused | done
  const [remaining, setRemaining] = useState(total)
  const [cockpit, setCockpit] = useState(false)
  const endRef = useRef(0)

  // Wall-clock anchored: an interval can be throttled in a background tab, so
  // remaining is always recomputed from the target instant, never decremented.
  useEffect(() => {
    if (phase !== 'running') return undefined
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setPhase('done')
        setCockpit(false)
        sealCommit() // "Posted." — a deep-work block sealed is a commit
        // The rep completed — THIS is when the high-impact block counts.
        if (config.highImpact) completeImpact(block && block.id)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function start() {
    endRef.current = Date.now() + remaining * 1000
    setPhase('running')
    setCockpit(true)
  }
  function pause() {
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)))
    setPhase('paused')
  }
  function reset() {
    setPhase('idle')
    setRemaining(total)
    setCockpit(false)
  }

  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  const pct = total ? ((total - remaining) / total) * 100 : 0
  const running = phase === 'running'

  const primary = running
    ? { label: '❚❚ Pause', act: pause }
    : phase === 'paused'
      ? { label: '▶ Resume', act: start }
      : phase === 'done'
        ? null
        : { label: '▶ Start', act: start }

  const head = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-widest2 text-muted">
        {config.label || 'Deep Work'}
        {config.at && <span className="ml-1.5 font-clock tnum normal-case">@ {config.at}</span>}
      </span>
      {config.highImpact && (
        <span className="rounded border border-accent-deep px-1.5 py-0.5 font-clock text-[9px] uppercase tracking-widest2 text-accent">
          ◆ high impact
        </span>
      )}
    </div>
  )

  // The single lane-red underline — it breathes while the clock runs (the one
  // accent on the page; the numerals themselves print in ink).
  const bar = (
    <div className="mt-3 h-1 overflow-hidden rounded-sm bg-surface2">
      <div
        className={`h-full bg-accent transition-[width] duration-1000 ease-linear ${running ? 'animate-pulse-accent' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )

  const controls = (
    <div className="mt-3 flex gap-2">
      {primary && (
        <button
          type="button"
          onClick={primary.act}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 font-clock text-xs font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          {primary.label}
        </button>
      )}
      {phase === 'done' && (
        <span className="animate-seal-press flex-1 rounded-md bg-surface2 px-4 py-2.5 text-center font-clock text-xs font-medium uppercase tracking-widest2 text-ink">
          Posted.
        </span>
      )}
      {phase !== 'idle' && (
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-surface2 px-4 py-2.5 font-clock text-xs uppercase tracking-widest2 text-muted"
        >
          Reset
        </button>
      )}
    </div>
  )

  // Cockpit: the running fullscreen face. data-invert flips the page ink-dark
  // in every skin — the stopwatch, not the stationery. The deck fades away;
  // exit is quiet and never stops the clock (pausing is a decision, leaving is
  // not). Numerals print in ink at weight 500; the breath lives on them while
  // running, the lane-red stays in the underline.
  if (cockpit) {
    return (
      <div data-invert className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6 text-ink">
        <span className="text-[11px] uppercase tracking-widest2 text-muted">
          {config.label || 'Deep Work'}
        </span>
        <span
          className={`mt-4 font-clock tnum text-7xl font-medium leading-none text-ink ${running ? 'animate-pulse-accent' : ''}`}
        >
          {clock}
        </span>
        <div className="mt-6 w-full max-w-xs">{bar}</div>
        <div className="w-full max-w-xs">{controls}</div>
        <button
          type="button"
          onClick={() => setCockpit(false)}
          className="mt-8 pb-safe font-clock text-[11px] uppercase tracking-widest2 text-muted"
        >
          ▾ Collapse
        </button>
      </div>
    )
  }

  return (
    <Card className="p-4">
      {head}
      <button
        type="button"
        onClick={() => (running || phase === 'paused') && setCockpit(true)}
        aria-label={`Timer ${clock}${running || phase === 'paused' ? ' — open full screen' : ''}`}
        className={`mt-3 block text-left font-clock tnum text-[46px] font-medium leading-none text-ink ${running ? 'animate-pulse-accent' : ''}`}
      >
        {clock}
      </button>
      {bar}
      {controls}
      {config.note && <p className="mt-3 text-xs text-muted">{config.note}</p>}
    </Card>
  )
}

// ─────────────────────────────────────────────
// InsightCard — the coach's pencil note in the margin (Split Ledger 04).
// config: { heading?, source?, text, tone? }
// ─────────────────────────────────────────────
export function InsightCard({ config = {} }) {
  // The Counsel margin notes ARE the coach (M0.1) — behind the register when
  // locked. Informational margin notes (biometrics status etc.) stay free; the
  // gate keys on the Counsel heading so server payloads obey it too.
  const { entitled } = useEntitlement()
  if (!entitled && /^counsel$/i.test(config.heading || '')) {
    return <CoachGate line="A margin note is written here each day — the coach’s read of your tape." />
  }
  // An indented block behind a 2px left rule — ochre when the Guardian raises
  // a condition (warn/neg forecasts are weather, legal under R2/R7), plain
  // line otherwise. The observation reads in the serif's italic voice; never
  // red, never an indictment — the post-slip screen never uses this card.
  const raised = config.tone === 'warn' || config.tone === 'neg'
  return (
    <section className={`border-l-2 bg-surface2 px-4 py-3.5 ${raised ? 'border-warn' : 'border-linebright'}`}>
      <div className="flex items-center gap-2">
        <span className="truncate font-clock text-[10px] uppercase tracking-widest2 text-muted">
          {config.heading || 'Margin note'}
        </span>
        {/* muted, not faint: this tag is the honesty marker (live vs counsel)
            and sits on the card surface, where faint dips under 4.5:1 */}
        {config.source && (
          <span className="ml-auto flex-none font-clock tnum text-[10px] uppercase tracking-widest2 text-muted">
            {config.source}
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-[15px] italic leading-relaxed text-ink">{config.text}</p>
      {typeof config.onDismiss === 'function' && (
        <button
          type="button"
          onClick={config.onDismiss}
          className="mt-3 font-clock text-[11px] uppercase tracking-widest2 text-muted"
        >
          {config.dismissLabel || 'Let it go'}
        </button>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// DailyBriefing — the Performance Loop's report. A terminal summary of the day
// + the stated reason for re-dealing tomorrow's deck. This runs on the FREE book
// and is composed by local, deterministic logic (no server model in v1), so the
// driver label reads "READ", not "AI" — the app never calls its own rules "AI".
// config: { date?, stats: [{ label, value, tone }],
//           drivers: [{ tone, text }] }   // each driver renders as a "READ" line
// ─────────────────────────────────────────────
export function DailyBriefing({ config = {} }) {
  const stats = Array.isArray(config.stats) ? config.stats : []
  const drivers = Array.isArray(config.drivers) ? config.drivers : []
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        {/* A report header, not a commitment — it prints in ink, and the old
            terminal glyph goes with the shout (accent stays reserved). */}
        <span className="font-clock text-[11px] uppercase tracking-widest2 text-muted">
          Daily Briefing
        </span>
        {config.date && (
          <span className="font-clock text-[10px] uppercase tracking-widest2 text-muted">
            {config.date}
          </span>
        )}
      </div>

      {stats.length > 0 && (
        <Grid cols={stats.length} gap={4} className="mt-3">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col px-1">
              <span className="text-[10px] uppercase tracking-widest2 text-muted">{s.label}</span>
              <span className={`mt-1 font-clock tnum text-xl leading-none ${TONE[s.tone] || 'text-ink'}`}>
                {s.value}
              </span>
            </div>
          ))}
        </Grid>
      )}

      <div className="mt-3 space-y-2 border-t border-line pt-3">
        {drivers.length === 0 && <p className="text-[13px] text-muted">No refactor signal yet.</p>}
        {drivers.map((d, i) => (
          <div key={i} className="flex gap-2">
            <span className={`mt-px font-clock text-[10px] font-bold uppercase tracking-wide ${TONE[d.tone] || 'text-muted'}`}>
              READ
            </span>
            <p className="text-[13px] leading-snug text-ink">{d.text}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────
// EmptyState — the no-data face. Calm by contract: silence is content, not an
// error. Dashed hairline, NO SIGNAL, a flat dashed line where a trend would be.
// config: { label?, hint? }
// ─────────────────────────────────────────────
export function EmptyState({ config = {} }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-6 text-center">
      <div className="flex items-center justify-center gap-2">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-muted" />
        <span className="font-clock text-[12px] uppercase tracking-[0.22em] text-muted">
          {config.label || 'No signal'}
        </span>
      </div>
      <svg viewBox="0 0 100 8" className="mx-auto mt-4 h-2 w-40 text-line" aria-hidden>
        <line
          x1="0"
          y1="4"
          x2="100"
          y2="4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {config.hint && <p className="mt-3 text-[12px] text-muted">{config.hint}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// FaithCard — the opt-in spiritual card (R3). NEVER scored: no numbers, no
// deltas, no progress, no verdicts. A verse, a reading position, one cue line.
// "Offered, not performed." Renders only when the faith module is on (the
// forge gates it; the widget itself just refuses metric props by having none).
// config: { verse?, ref?, position?, cue? }
// ─────────────────────────────────────────────
export function FaithCard({ config = {} }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="font-clock text-[11px] uppercase tracking-widest2 text-muted">Offered</span>
        {config.position && (
          <span className="font-clock text-[10px] uppercase tracking-widest2 text-muted">
            {config.position}
          </span>
        )}
      </div>
      {config.verse && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink">“{config.verse}”</p>
      )}
      {config.ref && (
        <p className="mt-1.5 font-clock text-[11px] uppercase tracking-widest2 text-muted">
          {config.ref}
        </p>
      )}
      {config.cue && <p className="mt-3 text-[13px] leading-relaxed text-muted">{config.cue}</p>}
    </Card>
  )
}

// ─────────────────────────────────────────────
// WeekGrid — the Sunday debrief's seven days. Tone follows execution and is
// never red (R2): a thin week reads muted, not scolded.
// config: { title?, days: [{ d: 'MON', pct: 0..100, sealed }] }
// ─────────────────────────────────────────────
export function WeekGrid({ config = {} }) {
  const days = Array.isArray(config.days) ? config.days : []
  return (
    <section>
      <WidgetHead
        label={config.title || 'The week'}
        right={
          days.length ? (
            // The Sunday page as an image (M4) — the second shareable frame.
            // Negative margins buy the 44px hit area without moving the ink.
            <button
              type="button"
              onClick={() => shareWeekCard({ days, title: (config.title || 'The week').toUpperCase() })}
              aria-label="Share the week"
              className="-my-3 -mr-3 flex min-h-[44px] min-w-[44px] items-center justify-end px-3 font-clock text-[10px] uppercase tracking-widest2 text-muted underline decoration-line underline-offset-4"
            >
              Share
            </button>
          ) : null
        }
      />
      <Card className="p-3">
        <Grid cols={days.length || 7} gap={6}>
          {days.map((day, i) => {
            const pct = Math.max(0, Math.min(100, Number(day.pct) || 0))
            const tone = pct >= 80 ? 'text-pos' : pct >= 40 ? 'text-ink' : 'text-muted'
            return (
              <div key={day.d || i} className="flex flex-col items-center gap-1.5">
                <span className="font-clock text-[9px] uppercase tracking-widest2 text-muted">
                  {day.d}
                </span>
                <span className={`font-clock tnum text-[13px] leading-none ${tone}`}>{pct}</span>
                <div className="h-1 w-full overflow-hidden rounded-sm bg-surface2">
                  <div className="h-full bg-pos" style={{ width: `${pct}%` }} />
                </div>
                <span
                  aria-hidden
                  className={`font-clock text-[9px] leading-none ${day.sealed ? 'text-accent' : 'text-muted'}`}
                >
                  {day.sealed ? '✓' : '–'}
                </span>
              </div>
            )
          })}
        </Grid>
      </Card>
    </section>
  )
}
