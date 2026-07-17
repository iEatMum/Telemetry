// EnergyTrendLine.jsx — the Trends-tab HERO chart (design handoff G3).
//
// A RULED LEDGER CHART, not a crypto-perps price chart. The line is carbon ink
// on hairline gridlines; peak/low read as small ink/amber ticks with figures in
// the margin; the "now" point is a small ruled marker. No gradient area, no
// dashed support/resistance guides, no dashed trade-rule, no binary green/red
// line, no glow — the costume the M2 de-perps and A2 recolor started, finished.
//
// The tone LOGIC survives only where the BODY needs a caution note: a low
// readiness reads AMBER (--warn), never red (PSYCHOLOGY §3 — red never lands on
// the body). The energy line itself carries no verdict; it's just the tape.
//
// Built on the house Sparkline scaling model — viewBox 0 0 100 100,
// preserveAspectRatio='none', non-scaling strokes — so the line stretches crisp
// to any width; every round marker + text label is an HTML overlay (never warps).
// Fully config/payload-driven; every field defaults so a thin config still draws.

import { Card, SectionLabel } from '../ui.jsx'

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

export function EnergyTrendLine({ config = {} }) {
  const pts = (Array.isArray(config.points) ? config.points : []).filter(
    (p) => p && typeof p.v === 'number'
  )
  const height = config.height || 150
  const unit = config.unit || '/100'

  // Not enough to draw a line — keep a fixed-height empty slot (Sparkline guard).
  if (pts.length < 2) {
    return (
      <section>
        <Card className="p-3.5">
          <SectionLabel>{config.label || 'Energy · Today'}</SectionLabel>
          <div
            className="mt-3 flex items-center justify-center border border-dashed border-line text-[11px] uppercase tracking-widest2 text-muted"
            style={{ height }}
          >
            no energy data yet
          </div>
        </Card>
      </section>
    )
  }

  const vs = pts.map((p) => p.v)
  const n = pts.length
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const span = max - min || 1

  // svg coords AND overlay percents share the same 0..100 space.
  const xOf = (i) => (i / (n - 1)) * 100
  const yOf = (v) => 100 - ((v - min) / span) * 100

  const linePath = pts
    .map((p, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(2)} ${yOf(p.v).toFixed(2)}`)
    .join(' ')

  const avg = typeof config.avg === 'number' ? config.avg : mean(vs)
  const avgY = clamp(yOf(avg), 0, 100)

  const peakI = vs.indexOf(max)
  const lowI = vs.indexOf(min)
  const nowI = clamp(Number.isInteger(config.now) ? config.now : n - 1, 0, n - 1)
  const nowV = pts[nowI].v

  // Tone logic (kept, never red on the body): at/below the day's average the
  // NOW readout + low marker read amber caution; otherwise plain ink.
  const state =
    config.tone === 'pos' ? 'high' : config.tone === 'neg' ? 'low' : nowV >= avg ? 'high' : 'low'
  const nowTone = state === 'low' ? 'text-warn' : 'text-ink'

  const showGrid = config.showGrid !== false
  const showAvg = config.showAvg !== false

  // Footer time ticks — evenly sampled HTML labels (never warp).
  const tickN = clamp(config.ticks || 6, 2, n)
  const ticks = Array.from(
    { length: tickN },
    (_, k) => pts[Math.round((k * (n - 1)) / (tickN - 1))].t
  )

  const peakX = xOf(peakI)
  const peakY = yOf(max)
  const lowX = xOf(lowI)
  const lowY = yOf(min)
  const nowX = xOf(nowI)
  const nowY = yOf(nowV)

  return (
    <section>
      <Card className="p-3.5">
        {/* Header — a calm ledger head: label + range (left), current figure in
            ink (right). No zone chip, no OPEN/NOW/AVG price readout. */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <SectionLabel>{config.label || 'Energy · Today'}</SectionLabel>
            <div className="mt-1 font-clock text-[10px] uppercase tracking-widest2 text-muted">
              {pts[0].t}–now · avg {Math.round(avg)}
            </div>
          </div>
          <div className="text-right leading-none">
            <span className={`font-clock tnum text-3xl leading-none ${nowTone}`}>{nowV}</span>
            <span className="text-xs text-muted">{unit}</span>
          </div>
        </div>

        {/* Chart — ruled gridlines + a carbon-ink line. Overlays carry the ink/
            amber ticks. No fill, no guides, no now-rule. */}
        <div className="relative mt-3" style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`${config.label || 'Energy'} trend`}
          >
            {showGrid &&
              [0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

            {/* average reference — one solid hairline, brighter than the grid */}
            {showAvg && (
              <line
                x1="0"
                x2="100"
                y1={avgY}
                y2={avgY}
                stroke="var(--line-bright)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* the tape — a carbon-ink line, no verdict color, no fill */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--text)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* ── HTML overlays: margin figures + ruled marks (non-warping) ── */}

          {showAvg && (
            <span
              className="absolute font-clock text-[9px] uppercase tracking-wide text-muted"
              style={{ top: `${avgY}%`, right: 2, transform: 'translateY(-50%)' }}
            >
              avg {Math.round(avg)}
            </span>
          )}

          {/* peak — a small ink mark + ink figure in the margin */}
          <span
            className="absolute h-1.5 w-1.5 rounded-full bg-ink"
            style={{ left: `${peakX}%`, top: `${peakY}%`, transform: 'translate(-50%,-50%)' }}
          />
          <span
            className="absolute whitespace-nowrap font-clock tnum text-[10px] text-ink"
            style={{ left: `${clamp(peakX, 8, 92)}%`, top: `${peakY}%`, transform: `translate(-50%, ${peakY < 16 ? '60%' : '-150%'})` }}
          >
            {max}
          </span>

          {/* low — amber caution mark + figure, never red (R2) */}
          <span
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ left: `${lowX}%`, top: `${lowY}%`, transform: 'translate(-50%,-50%)', background: 'var(--warn)' }}
          />
          <span
            className="absolute whitespace-nowrap font-clock tnum text-[10px] text-warn"
            style={{ left: `${clamp(lowX, 8, 92)}%`, top: `${lowY}%`, transform: `translate(-50%, ${lowY > 84 ? '-150%' : '60%'})` }}
          >
            {min}
          </span>

          {/* now — a small ruled ink marker (core + surface ring), no pulse */}
          <span
            className="absolute rounded-full bg-ink"
            style={{ left: `${nowX}%`, top: `${nowY}%`, height: 7, width: 7, transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 2px var(--surface)' }}
          />
          <span
            className={`absolute whitespace-nowrap font-clock text-[9px] uppercase tracking-wide ${nowTone}`}
            style={{ left: `${clamp(nowX, 8, 92)}%`, top: `${nowY}%`, transform: `translate(-50%, ${nowY < 20 ? '130%' : '-210%'})` }}
          >
            now
          </span>
        </div>

        {/* Footer — time axis + a calm peak/low caption in the margin voice */}
        <div className="mt-2 border-t border-line pt-2">
          <div className="flex justify-between font-clock text-[10px] uppercase tracking-wide text-muted">
            {ticks.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
          {config.caption !== false && (
            <div className="mt-1 font-clock text-[10px] uppercase tracking-wide text-muted">
              {typeof config.caption === 'string' ? (
                config.caption
              ) : (
                <>
                  Peak{' '}
                  <span className="text-ink">
                    {max} · {pts[peakI].t}
                  </span>
                  {'   '}Low{' '}
                  <span className="text-warn">
                    {min} · {pts[lowI].t}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </section>
  )
}

export default EnergyTrendLine
