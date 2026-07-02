// ui.jsx — the complete design-system component library.
//
// Every reusable shape lives here. Screens import what they need and wire in
// their own state — the logic stays in the screen, the look lives here.
//
// Pattern split (from DESIGN.md §1):
//   font-clock + tnum  = machine-truth  (witnessed, sealed, objective)
//   font-sans (default) = human voice   (body, scripture, UI copy)

// ─────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────

/**
 * A card surface — the base box every data widget sits on. Sharp-cornered and
 * hairline-bordered for the terminal look (P3.1). Defaults to div; pass `as` to
 * change the tag.
 */
export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`rounded-md border border-line bg-surface ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Small all-caps section label — xs, uppercase, wide tracking, muted.
 * The "quiet header" called out in DESIGN.md §5.
 */
export function SectionLabel({ children, className = '' }) {
  return (
    <div
      className={`text-xs font-medium uppercase tracking-widest2 text-muted ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * One number in a stat row. Terminal layout (P3.1): a quiet uppercase label on
 * top, a big tabular numeral below, and an optional green/red delta beside it.
 * Pass `accent` to render the value in the action green. `delta` may be a number
 * (sign drives the up/down color) or a string with explicit `deltaDir`.
 */
export function Stat({ value, label, accent = false, delta, deltaDir, deltaSuffix = '' }) {
  const dir = deltaDir || (typeof delta === 'number' ? (delta >= 0 ? 'up' : 'down') : 'flat')
  return (
    <div className="flex flex-col px-1 py-2">
      <div className="text-[10px] uppercase tracking-widest2 text-muted">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`font-clock tnum text-2xl leading-none ${accent ? 'text-accent' : 'text-ink'}`}
        >
          {value}
        </span>
        {delta != null && <DeltaTag value={delta} dir={dir} suffix={deltaSuffix} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tri-state check (Morning protocol + task rows)
// ─────────────────────────────────────────────

/**
 * The checkbox square: done (gold fill + check) / missed (dashed border + ×) /
 * empty (idle border). Never red — a miss is neutral grey.
 */
export function TriStateBox({ state }) {
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

/**
 * A single tri-state check row. `onCycle` advances done → missed → clear.
 * `tag` is an optional right-aligned time string (e.g. "10:15pm").
 * `action` is an optional right-aligned action node (skip, delete, etc).
 */
export function CheckRow({ state, onCycle, label, tag, action }) {
  const done = state === 'done'
  const missed = state === 'missed'
  return (
    <button
      type="button"
      onClick={onCycle}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      aria-pressed={done}
    >
      <TriStateBox state={state} />
      <span
        className={`flex-1 text-[15px] ${
          done ? 'text-muted line-through' : missed ? 'text-muted' : 'text-ink'
        }`}
      >
        {label}
      </span>
      {missed && (
        <span className="text-[10px] uppercase tracking-wide text-muted">missed</span>
      )}
      {tag && !missed && <span className="text-xs text-muted">{tag}</span>}
      {action}
    </button>
  )
}

// ─────────────────────────────────────────────
// Chip — pill toggle (kind selector, recurrence, etc.)
// ─────────────────────────────────────────────

/**
 * Pill toggle button. `active` = ink fill / idle = surface-2.
 */
export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${
        active ? 'bg-ink text-bg' : 'bg-surface2 text-muted'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * Chip variant that uses the accent border style (recurrence presets etc).
 */
export function AccentChip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active ? 'border-accent text-accent' : 'border-line text-muted'
      } ${className}`}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────
// Scoreboard — the streak / timer readout
// ─────────────────────────────────────────────

/**
 * One column of a scoreboard readout: big (or small) numeral + tiny label.
 * size="big" = accent gold with glow; size="small" = muted secondary digit.
 */
export function ScoreboardUnit({ value, label, size = 'big' }) {
  const numClass =
    size === 'big'
      ? 'text-5xl sm:text-6xl text-accent scoreboard'
      : 'text-2xl text-muted'
  return (
    <div className="flex flex-col items-center">
      <span className={`font-clock tnum leading-none ${numClass}`}>{value}</span>
      <span className="mt-2 text-[10px] uppercase tracking-widest3 text-muted">
        {label}
      </span>
    </div>
  )
}

/** The colon separator between scoreboard units. */
export function ScoreboardColon() {
  return (
    <span className="font-clock text-4xl sm:text-5xl leading-none text-line self-start mt-1">
      :
    </span>
  )
}

// ─────────────────────────────────────────────
// Lifetime pile — the permanent-only-grows stat
// ─────────────────────────────────────────────

/**
 * A "lifetime pile" — one large number + a tiny caption below.
 * These are permanent: a reset can't touch them. They should always be
 * visible so day-0 is never the only number on screen.
 */
export function LifetimePile({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-clock tnum text-3xl leading-none text-ink">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────
// CONSIDER card (the Guardian's guidance)
// ─────────────────────────────────────────────

/**
 * The CONSIDER card. Machine-truth header (mono, uppercase), sans body.
 * `c` shape: { heading, source, text, synthesis, resource, pattern }
 * `onDismiss` shows "Let it go" — pass null to hide dismiss.
 */
export function ConsiderCard({ c, onDismiss }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-clock text-[11px] uppercase tracking-widest2 text-muted">
          {c.heading || 'Consider'}
          {c.source ? ` · ${c.source}` : ''}
        </span>
        {c.synthesis === 'local' && (
          <span className="font-clock text-[10px] uppercase tracking-wide text-muted/70">
            draft
          </span>
        )}
      </div>

      <p className="mt-2 text-[15px] leading-relaxed text-ink">{c.text}</p>

      {c.resource && <ConsiderResource r={c.resource} />}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 text-[11px] uppercase tracking-wide text-muted"
        >
          Let it go
        </button>
      )}
    </div>
  )
}

/** The "For the next 24h" resource block inside a CONSIDER card. */
export function ConsiderResource({ r }) {
  const label = `${r.type || 'resource'} · ${r.by || ''}`.replace(/ · $/, '')
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="font-clock text-[10px] uppercase tracking-wide text-muted">
        For the next 24h
      </div>
      <div className="mt-1 text-[14px] text-ink">{r.title}</div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
      {r.url ? (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[12px] text-accent underline-offset-2 hover:underline"
        >
          Open →
        </a>
      ) : (
        <div className="mt-1 text-[11px] text-muted/80">
          link pending — add it in counselLibrary.json
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Hold-to-surrender button
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1200

/**
 * Press-and-hold ritual. A slow filling bar sweeps left→right over HOLD_MS.
 * Only fires `onComplete` if the user holds the full duration.
 * Releasing early resets silently. Deliberate friction — by design.
 */
export function HoldButton({ disabled, onComplete, children }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  function start() {
    if (disabled || timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setHolding(false)
      onComplete()
    }, HOLD_MS)
  }
  function cancel() {
    setHolding(false)
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  useEffect(() => () => timer.current && clearTimeout(timer.current), [])

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className={`relative w-full overflow-hidden rounded-md py-4 text-center text-sm font-semibold uppercase tracking-wide select-none ${
        disabled ? 'bg-surface2 text-muted' : 'bg-surface2 text-ink'
      }`}
      style={{ touchAction: 'none' }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-ink/10"
        style={{
          width: holding ? '100%' : '0%',
          transition: `width ${holding ? HOLD_MS : 150}ms linear`,
        }}
      />
      <span className="relative">
        {children || (holding ? 'Keep holding…' : 'Hold to surrender')}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────
// HELP NOW pill — global, always one tap away
// ─────────────────────────────────────────────

/**
 * The gold HELP NOW pill. Pinned above the tab bar on every face.
 * The urge protocol must be one tap from anywhere — struggle has no schedule.
 */
export function HelpNowPill({ onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow-glow-sm"
    >
      <span aria-hidden className="text-base leading-none">⚡</span>
      HELP NOW
    </button>
  )
}

// ─────────────────────────────────────────────
// Ledger notice — the left-border info block
// ─────────────────────────────────────────────

/**
 * A quiet notice with a left hairline border. Used in The Record when there's
 * no data yet, or for offline / loading states.
 */
export function LedgerNotice({ children }) {
  return (
    <div className="border-l border-line pl-4 text-[13px] leading-relaxed text-muted">
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// BackHeader — sub-view header with back button
// ─────────────────────────────────────────────

/**
 * Minimal header for sub-views (Streak, Sprint, Money, Train).
 * `onBack` closes the sub-view back to Morning.
 * `right` is an optional node for a right-side action.
 */
export function BackHeader({ title, onBack, right }) {
  return (
    <header className="flex items-center justify-between pt-3 pb-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex items-center gap-1.5 text-muted"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-sm">Back</span>
      </button>
      <span className="font-clock text-[13px] uppercase tracking-widest2 text-muted">
        {title}
      </span>
      <div className="w-16 text-right">{right}</div>
    </header>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// HIGH-DENSITY DATA WIDGETS (P3.1)
//
// The "deck" — presentational, prop-driven building blocks for the terminal /
// command-center UI. Each one is dumb on purpose: it takes data through props
// and renders. No store, no fetching. In P3.2 these become the components a
// JSON payload maps onto (type → component), so their props ARE the contract.
// ═════════════════════════════════════════════════════════════════════════════

// Shared tone → class lookups. Full literal strings so Tailwind's scanner keeps
// them (never build class names by interpolation — the JIT can't see those).
const TEXT_TONE = {
  ink: 'text-ink',
  muted: 'text-muted',
  accent: 'text-accent',
  pos: 'text-pos',
  neg: 'text-neg',
  warn: 'text-warn',
}
const BAR_TONE = {
  accent: 'bg-accent',
  pos: 'bg-pos',
  neg: 'bg-neg',
  warn: 'bg-warn',
}
const ARROW = { up: '▲', down: '▼', flat: '▬' }

/**
 * A small green/red change badge. `value` may be a number (a leading + is added
 * for positives) or a pre-formatted string. `dir` picks the arrow + color.
 */
export function DeltaTag({ value, dir = 'flat', suffix = '' }) {
  const display =
    typeof value === 'number' ? `${value > 0 ? '+' : ''}${value}${suffix}` : value
  return (
    <span className={`font-clock tnum text-[11px] leading-none ${TEXT_TONE[dir === 'up' ? 'pos' : dir === 'down' ? 'neg' : 'muted']}`}>
      <span aria-hidden>{ARROW[dir] || ARROW.flat}</span> {display}
    </span>
  )
}

/**
 * Equal-width responsive grid. `cols` and `gap` (px) are applied inline so no
 * dynamic Tailwind class is needed. The go-to layout for tiling KpiTiles.
 */
export function Grid({ cols = 2, gap = 12, className = '', children }) {
  return (
    <div
      className={`grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}
    >
      {children}
    </div>
  )
}

/**
 * A lightweight inline trend line — pure SVG, no deps. Stretches to fill width;
 * the stroke stays crisp at any size (non-scaling-stroke). `tone` colors it;
 * `fill` draws a faint area under the line. Needs ≥2 points to draw.
 */
export function Sparkline({
  data = [],
  tone = 'accent',
  height = 36,
  strokeWidth = 1.5,
  fill = true,
  className = '',
}) {
  const pts = Array.isArray(data) ? data.filter((n) => typeof n === 'number') : []
  if (pts.length < 2) return <div style={{ height }} className={className} aria-hidden />

  const W = 100
  const H = 100
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const stepX = W / (pts.length - 1)
  const coords = pts.map((v, i) => [i * stepX, H - ((v - min) / span) * H])
  const line = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${W} ${H} L0 ${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ height }}
      className={`w-full ${TEXT_TONE[tone] || TEXT_TONE.accent} ${className}`}
      role="img"
    >
      {fill && <path d={area} fill="currentColor" stroke="none" opacity="0.12" />}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * A thin horizontal meter (progress toward a target). Optional `label` (left)
 * and `right` readout sit above the track. `tone` colors the fill.
 */
export function BarMeter({ value = 0, max = 100, tone = 'accent', label, right, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div className={className}>
      {(label || right != null) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && (
            <span className="text-[10px] uppercase tracking-widest2 text-muted">{label}</span>
          )}
          {right != null && <span className="font-clock tnum text-xs text-ink">{right}</span>}
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full rounded-full ${BAR_TONE[tone] || BAR_TONE.accent}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * The hero stat card — DraftKings-style. A label + optional delta badge up top,
 * a big mono value (with optional unit), and an optional sparkline footer.
 */
export function KpiTile({
  label,
  value,
  unit,
  delta,
  deltaDir,
  deltaSuffix = '',
  spark,
  sparkTone,
  accent = false,
}) {
  const dir = deltaDir || (typeof delta === 'number' ? (delta >= 0 ? 'up' : 'down') : 'flat')
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest2 text-muted">{label}</span>
        {delta != null && <DeltaTag value={delta} dir={dir} suffix={deltaSuffix} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={`font-clock tnum text-3xl leading-none ${accent ? 'text-accent' : 'text-ink'}`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Sparkline data={spark} tone={sparkTone || (accent ? 'accent' : 'muted')} height={26} />
        </div>
      )}
    </Card>
  )
}

/**
 * A dense tabular readout. `columns` is [{ key, label, align?, numeric?, tone?,
 * render? }]; `rows` is an array of objects keyed by column key. `numeric` makes
 * a column mono + tabular; `render(row)` overrides the cell (e.g. a DeltaTag).
 */
export function DataTable({ columns = [], rows = [], className = '', onRowClick }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-[10px] font-medium uppercase tracking-widest2 text-muted ${
                  c.align === 'right' ? 'text-right' : ''
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, ri) => (
            <tr
              key={row.id ?? ri}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer transition-colors hover:bg-surface2' : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 text-[13px] ${c.numeric ? 'font-clock tnum' : ''} ${
                    c.align === 'right' ? 'text-right' : ''
                  } ${TEXT_TONE[c.tone] || 'text-ink'}`}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
