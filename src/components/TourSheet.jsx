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
        <div key={page} className="animate-data-stream mt-12 flex-1">
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
