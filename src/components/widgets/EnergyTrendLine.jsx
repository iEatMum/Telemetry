// EnergyTrendLine.jsx — the Trends-tab HERO chart (Phase 3 widget suite).
//
// Energy over time, rendered as a crypto-perps PRICE CHART: a vertical-gradient
// area fill, horizontal grid + dashed hi/lo + average reference guides, and a
// dashed "now" rule terminating in a pulsing last-trade dot, with labeled
// peak/low markers and a header carrying both the live energy readout and a
// %-vs-open delta.
//
// Built on the house Sparkline scaling model — viewBox 0 0 100 100,
// preserveAspectRatio='none', non-scaling strokes — so the line stretches crisp
// to any card width. Every ROUND marker and TEXT label is an HTML overlay (not
// SVG), so nothing warps under the stretched aspect ratio. Colors come only
// from our CSS-variable tokens (electric green / terminal red).
//
// Binary state model: line + area + now-dot + headline all recolor together —
// green when current energy is at/above the day's average, red when below. The
// peak marker is always green (your best moment), the low always red. Fully
// config/payload-driven (Server-Driven UI); every field defaults so a thin
// config still renders.

import { useId } from 'react'
import { Card, SectionLabel } from '../ui.jsx'

const ARROW = { up: '▲', down: '▼', flat: '▬' }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

export function EnergyTrendLine({ config = {} }) {
  // useId can contain ':' which is unsafe inside an SVG url(#…) ref — strip it.
  const gradId = 'etl-' + useId().replace(/:/g, '')

  const pts = (Array.isArray(config.points) ? config.points : []).filter(
    (p) => p && typeof p.v === 'number'
  )
  const height = config.height || 150

  // Not enough to draw a line — keep a fixed-height empty slot (Sparkline guard).
  if (pts.length < 2) {
    return (
      <section>
        <Card className="p-3.5">
          <SectionLabel>{config.label || 'Energy · Today'}</SectionLabel>
          <div
            className="mt-3 flex items-center justify-center rounded-md border border-dashed border-line text-[11px] uppercase tracking-widest2 text-muted"
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
  const unit = config.unit || '/100'

  // svg coords AND overlay percents share the same 0..100 space.
  const xOf = (i) => (i / (n - 1)) * 100
  const yOf = (v) => 100 - ((v - min) / span) * 100

  const linePath = pts
    .map((p, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(2)} ${yOf(p.v).toFixed(2)}`)
    .join(' ')
  const areaPath = `${linePath} L100 100 L0 100 Z`

  const avg = typeof config.avg === 'number' ? config.avg : mean(vs)
  const avgY = clamp(yOf(avg), 0, 100)

  const peakI = vs.indexOf(max)
  const lowI = vs.indexOf(min)
  const nowI = clamp(Number.isInteger(config.now) ? config.now : n - 1, 0, n - 1)
  const nowV = pts[nowI].v
  const open = typeof config.open === 'number' ? config.open : pts[0].v
  const deltaPct = open ? Math.round(((nowV - open) / open) * 100) : 0

  // Binary state: at/above the day's average = HIGH (green), else LOW (red).
  const state =
    config.tone === 'pos' ? 'high' : config.tone === 'neg' ? 'low' : nowV >= avg ? 'high' : 'low'
  const toneClass = state === 'high' ? 'text-pos' : 'text-neg'
  const haloClass = state === 'high' ? 'bg-pos-soft' : 'bg-neg-soft'
  const zone = state === 'high' ? 'PEAK ZONE' : 'LOW ZONE'

  const trend =
    deltaPct > 0
      ? { a: ARROW.up, w: 'RISING', c: 'text-pos' }
      : deltaPct < 0
        ? { a: ARROW.down, w: 'FALLING', c: 'text-neg' }
        : { a: ARROW.flat, w: 'FLAT', c: 'text-muted' }

  const showGrid = config.showGrid !== false
  const showGuides = config.showGuides !== false
  const showAvg = config.showAvg !== false
  const animate = config.animate !== false

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
        {/* Header — title + live state (left), readout + trend (right) */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <SectionLabel>{config.label || 'Energy · Today'}</SectionLabel>
            <div className="mt-1 font-clock text-[10px] uppercase tracking-widest2">
              <span className={toneClass}>●</span>{' '}
              <span className="text-muted">{pts[0].t}–now · </span>
              <span className={toneClass}>{zone}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="leading-none">
              <span className={`font-clock tnum text-3xl leading-none ${toneClass}`}>{nowV}</span>
              <span className="text-xs text-muted">{unit}</span>
            </div>
            <div className={`mt-1 font-clock tnum text-[11px] ${trend.c}`}>
              {trend.a} {trend.w} {deltaPct > 0 ? '+' : ''}
              {deltaPct}% vs open
            </div>
          </div>
        </div>

        {/* Chart — SVG frame + HTML overlay markers/labels. toneClass on the
            wrapper sets `color`, so every currentColor stroke/fill + bg-current
            overlay recolors together by state. */}
        <div className={`relative mt-3 ${toneClass}`} style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`${config.label || 'Energy'} trend`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {showGrid &&
              [0, 50, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                  opacity="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

            {/* hi / lo dashed price guides */}
            {showGuides && (
              <>
                <line x1="0" x2="100" y1={peakY} y2={peakY} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" x2="100" y1={lowY} y2={lowY} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
              </>
            )}

            {/* average reference */}
            {showAvg && (
              <line x1="0" x2="100" y1={avgY} y2={avgY} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" opacity="0.9" vectorEffect="non-scaling-stroke" />
            )}

            {/* area + energy line */}
            <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* now vertical rule */}
            <line x1={nowX} x2={nowX} y1="0" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* ── HTML overlays (circular dots + non-warping labels) ── */}

          {showAvg && (
            <span
              className="absolute font-clock text-[9px] uppercase tracking-wide text-muted"
              style={{ top: `${avgY}%`, right: 2, transform: 'translateY(-50%)' }}
            >
              avg {Math.round(avg)}
            </span>
          )}

          {/* peak marker — always green (best moment) */}
          <span
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ left: `${peakX}%`, top: `${peakY}%`, transform: 'translate(-50%,-50%)', background: 'var(--pos)' }}
          />
          <span
            className="absolute whitespace-nowrap font-clock tnum text-[10px] text-pos"
            style={{ left: `${clamp(peakX, 8, 92)}%`, top: `${peakY}%`, transform: `translate(-50%, ${peakY < 16 ? '60%' : '-150%'})` }}
          >
            {max}
          </span>

          {/* low marker — always red (worst moment) */}
          <span
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ left: `${lowX}%`, top: `${lowY}%`, transform: 'translate(-50%,-50%)', background: 'var(--neg)' }}
          />
          <span
            className="absolute whitespace-nowrap font-clock tnum text-[10px] text-neg"
            style={{ left: `${clamp(lowX, 8, 92)}%`, top: `${lowY}%`, transform: `translate(-50%, ${lowY > 84 ? '-150%' : '60%'})` }}
          >
            {min}
          </span>

          {/* NOW — pulsing halo + solid core + tag (state-colored) */}
          <span
            className={`absolute rounded-full ${haloClass} ${animate ? 'animate-pulse-accent' : ''}`}
            style={{ left: `${nowX}%`, top: `${nowY}%`, height: 16, width: 16, transform: 'translate(-50%,-50%)' }}
          />
          <span
            className="absolute rounded-full bg-current"
            style={{ left: `${nowX}%`, top: `${nowY}%`, height: 7, width: 7, transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 2px var(--bg)' }}
          />
          <span
            className={`absolute whitespace-nowrap font-clock text-[9px] font-bold uppercase tracking-wide ${toneClass}`}
            style={{ left: `${clamp(nowX, 8, 92)}%`, top: `${nowY}%`, transform: `translate(-50%, ${nowY < 20 ? '130%' : '-210%'})` }}
          >
            now
          </span>
        </div>

        {/* Footer — time axis + auto takeaway caption */}
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
                  <span className="text-pos">
                    {max} · {pts[peakI].t}
                  </span>
                  {'   '}Low{' '}
                  <span className="text-neg">
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
