// MarketSentimentWidget.jsx — Trends-tab live-ticker board (Phase 3 widget suite).
//
// A Bloomberg / crypto-perps SENTIMENT FEED. Two parts:
//   1. A horizontal BEARISH↔BULLISH gauge: a red(--neg) → amber(--warn) →
//      green(--pos) meter with a needle marking the current sentiment score,
//      poles labeled BEARISH (red) / BULLISH (green).
//   2. A 3-row live ticker (BTC · S&P · MY FOCUS) with mono tabular numerics and
//      green/red change. The conceit: your discipline ("MY FOCUS") is a tradeable
//      asset on the same board as BTC and the S&P — set apart with the accent.
//
// Pure CSS (no chart lib), CSS-var tokens only, config/payload-driven; every
// field defaults so a thin config still renders.

import { Card, SectionLabel } from '../ui.jsx'

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const ARROW = { up: '▲', down: '▼', flat: '▬' }
const dirOf = (pct) => (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat')
const TONE = { up: 'text-pos', down: 'text-neg', flat: 'text-muted' }
const DOT = { up: 'var(--pos)', down: 'var(--neg)', flat: 'var(--muted)' }

export function MarketSentimentWidget({ config = {} }) {
  const s = config.sentiment
  const score = clamp(
    typeof s === 'number' ? s : s && typeof s.score === 'number' ? s.score : 50,
    0,
    100
  )
  const word = (s && s.label) || (score >= 60 ? 'BULLISH' : score <= 40 ? 'BEARISH' : 'NEUTRAL')
  const wordTone = score >= 60 ? 'text-pos' : score <= 40 ? 'text-neg' : 'text-warn'

  const tickers = Array.isArray(config.tickers) ? config.tickers : []

  return (
    <section>
      <Card className="p-3.5">
        {/* Header / status bar */}
        <div className="flex items-center justify-between">
          <SectionLabel>{config.label || 'Market Sentiment'}</SectionLabel>
          <span className="flex items-center gap-1.5 font-clock text-[10px] uppercase tracking-widest2 text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-pos animate-pulse-live" />
            {config.status || 'Live'}
          </span>
        </div>

        {/* Sentiment readout */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className={`font-clock text-xl font-bold uppercase tracking-widest2 ${wordTone}`}>
            {word}
          </span>
          <span className="font-clock tnum text-sm text-muted">
            <span className="text-ink">{score}</span>/100
          </span>
        </div>

        {/* Sentiment gauge */}
        <div className="mt-2">
          <div
            className="relative h-2 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--neg) 0%, var(--warn) 50%, var(--pos) 100%)' }}
          >
            {/* neutral center tick */}
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-bg/60" />
            {/* needle marker at the current score */}
            <span
              className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink"
              style={{ left: `${score}%`, transform: 'translateX(-50%)', boxShadow: '0 0 0 2px var(--bg)' }}
            />
          </div>
          <div className="mt-1 flex justify-between font-clock text-[10px] uppercase tracking-wide">
            <span className="text-neg">Bearish</span>
            <span className="text-pos">Bullish</span>
          </div>
        </div>

        {/* Live ticker */}
        <div className="mt-3 border-t border-line pt-1">
          {tickers.length === 0 ? (
            <div className="py-3 text-center font-clock text-[11px] uppercase tracking-widest2 text-muted">
              no feed
            </div>
          ) : (
            tickers.map((t, i) => {
              const pct = typeof t.changePct === 'number' ? t.changePct : 0
              const dir = t.dir || dirOf(pct)
              const focus = !!t.focus
              return (
                <div
                  key={t.symbol ?? i}
                  className={`flex items-center justify-between py-2 ${i > 0 ? 'border-t border-line/60' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: DOT[dir] }} />
                    {focus && (
                      <span className="text-accent" aria-hidden>
                        ◆
                      </span>
                    )}
                    <span className={`font-clock text-[13px] uppercase tracking-wide ${focus ? 'text-accent' : 'text-ink'}`}>
                      {t.symbol}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span className="font-clock tnum text-[13px] text-ink">{t.last}</span>
                    <span className={`w-20 text-right font-clock tnum text-[12px] ${TONE[dir]}`}>
                      {ARROW[dir]} {pct > 0 ? '+' : ''}
                      {pct}%
                    </span>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </section>
  )
}

export default MarketSentimentWidget
