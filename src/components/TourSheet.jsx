// TourSheet.jsx — the first-run tour: how the book works, in six pages.
//
// Opens ONCE, the first time the shell mounts with no tour flag (i.e. right
// after onboarding lands on the deck), and replays on demand from Settings.
// Full-screen like Onboarding — this is still the first minute, and the deck
// underneath would only compete with the explanation of itself. Ends (or
// skips) by writing the sidecar flag; the flag is a nudge's memory, never
// synced or exported.

import { useRef, useState } from 'react'
import { useModalDismiss } from '../lib/useModalDismiss.js'

const TOUR_KEY = 'lockedin:__tour'

export function tourSeen() {
  try {
    return !!localStorage.getItem(TOUR_KEY)
  } catch {
    return true // storage disabled — never loop the tour
  }
}

function markSeen() {
  try {
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    /* quota — session state still closes it */
  }
}

export function openTour() {
  window.dispatchEvent(new Event('telemetry:open-tour'))
}

// Each page: a nav word it points at (or none), a title, and 2–3 plain lines.
// ── Tour illustrations (P2 art round) ────────────────────────────────────────
// One ink-on-manila drawing per page — the tour was six pages of bare "tell".
// All strokes ride the live tokens (line/ink/accent via currentColor groups),
// so the art re-skins with the app and the night-page drawing is ALWAYS the
// inversion. Decorative: every svg is aria-hidden; the copy carries the story.
const ART_W = 'mx-auto mb-2 block h-36 w-full max-w-[300px]'
const Svg = ({ children }) => (
  <svg viewBox="0 0 240 130" className={ART_W} fill="none" strokeLinecap="round" aria-hidden>
    {children}
  </svg>
)
const ART = [
  // 1 · the book — an open ledger: two pages, a spine, ruled rows, one seal.
  <Svg key="book">
    <g className="text-ink" stroke="currentColor" strokeWidth="2">
      <path d="M30 30 Q118 18 118 26 L118 104 Q118 96 30 108 Z" />
      <path d="M210 30 Q122 18 122 26 L122 104 Q122 96 210 108 Z" />
    </g>
    <g className="text-line" stroke="currentColor" strokeWidth="1.5">
      <path d="M44 48 Q118 40 106 44 M44 62 L104 56 M44 76 L104 70 M136 44 Q160 42 196 48 M136 58 L196 62 M136 72 L196 76" />
    </g>
    <path className="text-seal" fill="currentColor" d="M52 89 L59 96 L52 103 L45 96 Z" />
  </Svg>,
  // 2 · today — the heat sheet: time ticks, rows, the ◆ row posted.
  <Svg key="today">
    <g className="text-line" stroke="currentColor" strokeWidth="1.5">
      <path d="M36 34 L204 34 M36 60 L204 60 M36 86 L204 86 M36 112 L204 112" />
    </g>
    <g className="text-muted" stroke="currentColor" strokeWidth="2">
      <path d="M44 26 L58 26 M44 52 L58 52 M44 78 L58 78 M44 104 L58 104" />
    </g>
    <path className="text-seal" fill="currentColor" d="M30 52 L35 57 L30 62 L25 57 Z" />
    <path className="text-ink" stroke="currentColor" strokeWidth="2.5" d="M186 48 L192 55 L202 42" />
  </Svg>,
  // 3 · the night page — the inverted page; the urge is a wave that crests
  // and passes; the small ring is the ride clock.
  <Svg key="night">
    <rect x="36" y="14" width="168" height="102" rx="6" className="text-ink" fill="currentColor" opacity="0.92" />
    <path className="text-bg" stroke="currentColor" strokeWidth="2.5" d="M52 84 Q84 84 100 56 Q112 36 122 56 Q138 84 188 84" />
    <circle cx="122" cy="30" r="9" className="text-bg" stroke="currentColor" strokeWidth="2" />
    <path className="text-seal" fill="currentColor" d="M122 26 L126 30 L122 34 L118 30 Z" />
  </Svg>,
  // 4 · health — the pulse arrives and settles into the ledger's rule.
  <Svg key="health">
    <g className="text-line" stroke="currentColor" strokeWidth="1.5">
      <path d="M36 96 L204 96 M36 112 L204 112" />
    </g>
    <path
      className="text-pos"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      d="M36 64 L84 64 L96 38 L112 88 L124 52 L132 64 L204 64"
    />
    <circle cx="204" cy="64" r="3" className="text-pos" fill="currentColor" />
  </Svg>,
  // 5 · the guardian — the day as a dial; the flagged window shaded; the
  // warning ◆ posted just ahead of it. Data, not verdicts.
  <Svg key="guardian">
    <circle cx="120" cy="66" r="46" className="text-ink" stroke="currentColor" strokeWidth="2" />
    <g className="text-line" stroke="currentColor" strokeWidth="1.5">
      <path d="M120 20 L120 28 M166 66 L158 66 M120 112 L120 104 M74 66 L82 66" />
    </g>
    <path
      className="text-seal"
      stroke="currentColor"
      strokeWidth="5"
      opacity="0.5"
      d="M152 33 A46 46 0 0 1 166 66"
    />
    <path className="text-seal" fill="currentColor" d="M146 24 L151 29 L146 34 L141 29 Z" />
    <path className="text-ink" stroke="currentColor" strokeWidth="2" d="M120 66 L138 48" />
  </Svg>,
  // 6 · rule off — the day's line ruled across; the seal stamps its end;
  // tomorrow's faint page waits below.
  <Svg key="ruleoff">
    <g className="text-line" stroke="currentColor" strokeWidth="1.5">
      <path d="M36 36 L204 36 M36 58 L204 58" />
    </g>
    <path className="text-ink" stroke="currentColor" strokeWidth="3" d="M36 82 L176 82" />
    <path className="text-seal" fill="currentColor" d="M190 74 L198 82 L190 90 L182 82 Z" />
    <path className="text-faint" stroke="currentColor" strokeWidth="1.5" d="M36 108 L204 108" strokeDasharray="2 6" />
  </Svg>,
]

const PAGES = [
  {
    tag: 'the book',
    title: 'This is a ledger, not a feed.',
    body: 'Telemetry keeps one book: your days, written by you, on this device. Nothing scrolls forever, nothing begs for attention. You open it, write, and close it.',
  },
  {
    tag: 'today',
    title: 'The page prints what you dictated.',
    body: 'DECK holds today’s blocks — yours, plus the protocol’s scaffolding (wake, phone-out) drawn from your answers. Tap a line when it happens to post it. ◆ marks the block the day hinges on; the timer runs it. "Dictate the day" at the page’s foot edits your blocks anytime.',
  },
  {
    tag: 'the night page',
    title: 'Slipping has a page too.',
    body: 'One tap opens the night page: ride the urge out, text your witness, or log the slip — the book stays open either way. HELP on the nav is the crisis path, one tap from any surface.',
  },
  {
    tag: 'health',
    title: 'The body reports in.',
    body: 'Connect Apple Health on the HEALTH page and sleep, activity, and heart-rate stream into your readouts. A rough night reflows the day to maintenance — the plan bends before you break.',
  },
  {
    tag: 'the guardian',
    title: 'Drift gets named before it lands.',
    body: 'GUARDIAN watches the window you flagged and the signals you feed it, and says what it sees — data, not verdicts. The Guardian and the coach’s counsel are the paid layer; the book itself is free forever.',
  },
  {
    tag: 'rule off',
    title: 'End the day on purpose.',
    body: 'At the deck’s foot, rule off the day — the page seals, tomorrow’s is set. That’s the whole loop: dictate, execute, rule off. The book does the remembering.',
  },
]

export default function TourSheet({ onClose }) {
  const [page, setPage] = useState(0)
  const last = page === PAGES.length - 1
  const p = PAGES[page]
  const nextRef = useRef(null)

  const finish = () => {
    markSeen()
    onClose()
  }

  // Dialog manners (P1 a11y), same contract as every other overlay: focus lands
  // in the sheet, Tab stays contained, Escape = skip (writes the seen flag so
  // the tour never loops on the next boot).
  useModalDismiss(finish, nextRef)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How the book works — the tour"
      className="fixed inset-0 z-40 flex flex-col bg-bg text-ink"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col px-6 py-8 pt-safe">
        <div className="flex items-baseline justify-between">
          <div className="font-clock text-[0.8125rem] font-medium tracking-[0.22em]">TELEMETRY</div>
          <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            how the book works · {String(page + 1).padStart(2, '0')}/{String(PAGES.length).padStart(2, '0')}
          </span>
        </div>
        <div className="mt-4 flex gap-1">
          {PAGES.map((_, i) => (
            <span key={i} className={'h-[3px] flex-1 ' + (i <= page ? 'bg-ink' : 'bg-line')} />
          ))}
        </div>

        {/* remount per page so the entry settle replays */}
        <div key={page} className="animate-data-stream mt-8 flex-1">
          {ART[page]}
          <div className="mb-2 border-b border-line pb-2">
            <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">{p.tag}</span>
          </div>
          <h1 className="m-0 text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{p.title}</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.body}</p>
        </div>

        <div className="mt-8 flex items-center gap-3 pb-safe">
          {page > 0 ? (
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              className="rounded-md border border-line px-5 py-3.5 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-md px-5 py-3.5 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted"
            >
              Skip
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? finish() : setPage(page + 1))}
            className="ml-auto rounded-md bg-ink px-7 py-3.5 font-clock text-[0.8125rem] font-semibold uppercase tracking-widest2 text-bg"
          >
            {last ? 'Open the book →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
