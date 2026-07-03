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
  DataTable,
  DeltaTag,
} from './ui.jsx'
import { useEffect, useState } from 'react'
import { registerImpact, completeImpact } from '../lib/engagement.js'

// Shared status vocab for schedule/protocol rows. Literal class strings so the
// Tailwind scanner keeps them.
// HARD RULE (PSYCHOLOGY.md §1, BLUEPRINT §6a): red never lands on a person's
// behavior. A miss is neutral muted — the word carries the fact; color would
// carry the verdict. Late is amber caution data (forgiving clock, firm cue).
const STATUS_TONE = {
  hit: 'text-pos',
  done: 'text-pos',
  late: 'text-warn',
  missed: 'text-muted',
  open: 'text-muted',
  skip: 'text-muted',
}
const STATUS_LABEL = {
  hit: 'on time',
  done: 'done',
  late: 'late',
  missed: 'missed',
  open: 'open',
  skip: 'skipped',
}

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
  const [doneIds, setDoneIds] = useState(() => new Set())
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

  function complete(r) {
    const id = r._id
    if (doneIds.has(id)) return
    setDoneIds((prev) => new Set(prev).add(id))
    if (r.impact === 'high') completeImpact(id) // engagement is tracked by BlockRenderer
  }

  const tableRows = rows.map((r, i) => ({ ...r, _id: rowId(r, i) }))

  return (
    <section>
      <WidgetHead label={config.title || 'Schedule'} />
      <Card className="overflow-hidden">
        <DataTable
          onRowClick={complete}
          columns={[
            { key: 'time', label: 'Time', numeric: true },
            {
              key: 'block',
              label: 'Block',
              render: (r) => (
                <span className="flex items-center gap-1.5">
                  {r.impact === 'high' && (
                    <span className="text-accent" aria-hidden>
                      ◆
                    </span>
                  )}
                  {r.block}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => {
                const status = doneIds.has(r._id) ? 'done' : r.status
                return (
                  <span
                    className={`font-clock text-[11px] uppercase tracking-wide ${
                      STATUS_TONE[status] || 'text-muted'
                    }`}
                  >
                    {STATUS_LABEL[status] || status || '—'}
                  </span>
                )
              },
            },
            {
              key: 'delta',
              label: 'Δ',
              align: 'right',
              render: (r) =>
                r.delta ? (
                  <DeltaTag value={r.delta.value} dir={r.delta.dir} />
                ) : (
                  <span className="text-muted">—</span>
                ),
            },
          ]}
          rows={tableRows}
        />
      </Card>
    </section>
  )
}

// ─────────────────────────────────────────────
// KpiGrid — tiles of headline numbers.
// config: { title?, cols?, items: [{ label, value, unit, delta, deltaSuffix,
//           spark, sparkTone, accent }] }
// ─────────────────────────────────────────────
export function KpiGrid({ config = {} }) {
  const items = Array.isArray(config.items) ? config.items : []
  return (
    <section>
      <WidgetHead label={config.title} />
      <Grid cols={config.cols || 2} gap={10}>
        {items.map((it, i) => (
          <KpiTile key={it.id ?? i} {...it} />
        ))}
      </Grid>
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
        <Sparkline data={data} tone={config.tone || 'accent'} height={48} />
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
// DeepWorkTimer — a focus-block face (presentation; not wired to a timer yet).
// config: { label, minutes, note? }
// ─────────────────────────────────────────────
export function DeepWorkTimer({ config = {}, block }) {
  const [logged, setLogged] = useState(false)
  const [flash, setFlash] = useState(0)
  const minutes = Number.isFinite(config.minutes) ? config.minutes : 0
  const clock = `${minutes}:00`

  function start() {
    setFlash((f) => f + 1) // 150ms confirm flash on the high-impact tap
    if (logged) return
    setLogged(true)
    if (config.highImpact) completeImpact(block && block.id) // engagement via BlockRenderer
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest2 text-muted">
          {config.label || 'Deep Work'}
          {config.highImpact && (
            <span className="ml-1.5 text-accent" aria-hidden>
              ◆
            </span>
          )}
        </span>
        <span className={`font-clock text-[10px] uppercase tracking-widest2 ${logged ? 'text-pos' : 'text-muted'}`}>
          {logged ? '● done' : '● ready'}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="scoreboard font-clock tnum text-5xl leading-none text-accent">{clock}</span>
        <button
          type="button"
          onClick={start}
          className={`relative overflow-hidden rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide ${
            logged ? 'bg-surface2 text-muted' : 'bg-accent text-accent-ink'
          }`}
        >
          {logged ? '✓ Logged' : '▶ Start'}
          {flash > 0 && (
            <span
              key={flash}
              aria-hidden
              className="animate-flash pointer-events-none absolute inset-0"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>
      </div>
      {config.note && <p className="mt-3 text-xs text-muted">{config.note}</p>}
    </Card>
  )
}

// ─────────────────────────────────────────────
// InsightCard — an AI/coach insight in terminal styling (evolves ConsiderCard).
// config: { heading?, source?, text, tone? }
// ─────────────────────────────────────────────
export function InsightCard({ config = {} }) {
  // The neg tone is WEIGHT-disambiguated (border-l-4 vs -2), not just hue:
  // night_ops resolves --accent and --neg to the same red, so a critical
  // Guardian card must read different from an accent card without color.
  const accentBorder =
    config.tone === 'neg'
      ? 'border-l-4 border-neg'
      : config.tone === 'warn'
        ? 'border-l-2 border-warn'
        : 'border-l-2 border-accent'
  return (
    <Card className="p-4">
      <div className={`pl-3 ${accentBorder}`}>
        <div className="font-clock text-[10px] uppercase tracking-widest2 text-muted">
          {config.heading || 'Insight'}
          {config.source ? ` · ${config.source}` : ''}
        </div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{config.text}</p>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────
// DailyBriefing — the Performance Loop's report. A terminal summary of the day
// + the AI's stated reason for refactoring tomorrow's deck.
// config: { date?, stats: [{ label, value, tone }],
//           drivers: [{ tone, text }] }   // each driver renders as an "AI:" line
// ─────────────────────────────────────────────
export function DailyBriefing({ config = {} }) {
  const stats = Array.isArray(config.stats) ? config.stats : []
  const drivers = Array.isArray(config.drivers) ? config.drivers : []
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="font-clock text-[11px] uppercase tracking-widest2 text-accent">
          ◢ Daily Briefing
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
            <span className={`mt-px font-clock text-[10px] font-bold uppercase tracking-wide ${TONE[d.tone] || 'text-accent'}`}>
              AI
            </span>
            <p className="text-[13px] leading-snug text-ink">{d.text}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
