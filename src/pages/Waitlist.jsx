// Telemetry — Waitlist landing page (React 18 · plain JS · Tailwind).
// MARKETING surface, but built in the APP's own Split Ledger tokens and voice —
// the funnel must look like the thing it installs. The old page sold a dark
// "command center" (neon green, hype copy, a fabricated queue rank, a dead
// lockedin.app link) — the exact opposite of the calm manila app, which seeded
// install→open drop and "not what was advertised" reviews. This page shows the
// real promise: a discipline ledger that never shames you, free book + optional
// coach, on-device. Reachable at /?waitlist (wired in main.jsx). Supabase capture
// fails soft to a local confirmation.

import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// The funnel's destination (CONSTITUTION M4): paste the App Store listing URL
// here once the app is live — the store button then leads and the email list
// becomes the overflow. Empty string = pre-launch waitlist mode.
const APP_STORE_URL = ''

const Micro = ({ children, className = '' }) => (
  <span className={'font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted ' + className}>{children}</span>
)

// Honest capture: email in, a plain confirmation out. No invented rank, no
// unbacked referral math — the brand IS honesty, so the funnel can't fake numbers
// (the queue can't be read back through INSERT-only RLS anyway). And honesty cuts
// both ways: a failed insert (the backend is currently PAUSED — every insert
// fails) must never show "On the list" while the address evaporates. Failure gets
// its own state and a mailto fallback that actually records the signup.
function Capture() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | joined | failed

  const submit = async (e) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return
    setState('submitting')
    const code = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(email.length)).slice(0, 8)
    if (isSupabaseConfigured && supabase) {
      try {
        const referredBy = new URLSearchParams(location.search).get('ref')
        const { error } = await supabase.from('waitlist').insert({ email, referral_code: code, referred_by: referredBy })
        setState(error ? 'failed' : 'joined')
        return
      } catch {
        setState('failed')
        return
      }
    }
    // No capture backend configured at all — say so, don't pretend.
    setState('failed')
  }

  if (state === 'joined') {
    return (
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <Micro className="text-accent">On the list</Micro>
        <p className="max-w-[440px] text-[0.9375rem] leading-relaxed text-muted">
          You’re on the list — you’ll get it first when Telemetry opens on the App Store. No spam, and you can
          delete anytime.
        </p>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <Micro>The list didn’t take the entry</Micro>
        <p className="max-w-[440px] text-[0.9375rem] leading-relaxed text-muted">
          Something on our side is down, and pretending otherwise isn’t how this book works.{' '}
          <a
            className="text-ink underline decoration-line underline-offset-4"
            href={`mailto:ianpalsgaard@gmail.com?subject=Telemetry%20waitlist&body=${encodeURIComponent(email)}`}
          >
            Email us
          </a>{' '}
          and we’ll add you by hand, or try again later.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="self-start rounded-md border border-line px-5 py-3 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {APP_STORE_URL ? (
        <a
          href={APP_STORE_URL}
          className="self-start rounded-md bg-accent px-7 py-4 font-clock text-[0.8125rem] font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Get it on the App Store →
        </a>
      ) : null}
      <div className="flex flex-wrap items-stretch gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          required
          className="min-w-0 flex-[1_1_240px] rounded-md border border-line bg-surface px-4 py-4 text-[0.9375rem] text-ink outline-none focus:border-accent-deep"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="rounded-md bg-accent px-7 font-clock text-[0.8125rem] font-semibold uppercase tracking-widest2 text-accent-ink disabled:opacity-60"
        >
          {state === 'submitting' ? 'Adding…' : 'Join the list'}
        </button>
      </div>
      <Micro>Launching on the App Store — the list gets it first · no spam · delete anytime</Micro>
    </form>
  )
}

// A manila preview of the ACTUAL app — the same page a new user installs. Misses
// are withheld ink / muted-dashed, never red; the current block carries the one
// accent rule. No dark terminal, no verdict chips the app doesn't ship.
function SamplePage() {
  const rows = [
    { t: '05:30', label: 'Wake — feet on floor', state: 'done' },
    { t: '06:15', label: 'Deep work — first block', state: 'now' },
    { t: '12:30', label: 'Train — tempo', state: 'open' },
    { t: '22:00', label: 'Phone out of the room', state: 'missed' },
  ]
  const mark = { done: '✓', open: '·', missed: '—' }
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="text-center">
        <Micro>Days on the book</Micro>
        <div className="mt-2 font-clock tnum text-[4rem] leading-none text-ink">212</div>
        <div className="mt-1 font-clock text-[0.6875rem] uppercase tracking-widest2 text-faint">run 3 · wk 30</div>
      </div>
      <div className="mt-6 border-t border-line">
        {rows.map((r) => (
          <div
            key={r.t}
            className={`flex items-center gap-3 border-b border-line py-3 ${
              r.state === 'now' ? 'border-l-2 border-accent-deep bg-surface2 pl-3' : ''
            }`}
          >
            <span className="min-w-[44px] font-clock tnum text-[0.75rem] text-muted">{r.t}</span>
            <span
              className={`flex-1 text-[0.8125rem] ${
                r.state === 'missed' ? 'text-faint line-through decoration-dashed' : 'text-ink'
              }`}
            >
              {r.label}
            </span>
            {r.state === 'now' ? (
              <span className="font-clock text-[0.6875rem] uppercase tracking-widest2 text-accent">◆ now</span>
            ) : (
              <span className="font-clock text-[0.75rem] text-muted">{mark[r.state]}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center font-clock text-[0.6875rem] uppercase tracking-widest2 text-faint">
        A miss is logged, never punished
      </div>
    </div>
  )
}

const VALUE = [
  ['Free forever', 'The whole book — schedule, streaks, sprints, and the 2 a.m. night page. No paywall on discipline.'],
  ['The tape, not the judge', 'A miss is logged in withheld ink, never a red mark. Data, not shame.'],
  ['The coach, only if you want it', 'An AI read of your week and your drift — $6.99/mo, 7 days free. Optional, never nagged.'],
  ['Yours, on device', 'No account, no feed. Nothing leaves your phone unless you send it.'],
]

export default function Waitlist() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-6">
        <div className="font-clock text-[0.875rem] font-semibold uppercase tracking-[0.22em]">Telemetry</div>
        <div className="rounded-md border border-line px-3 py-1.5">
          <Micro>pre-launch</Micro>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-8 pb-20 pt-10 md:grid-cols-[1.05fr_.95fr]">
        <section className="flex flex-col gap-6">
          <Micro>The discipline ledger</Micro>
          <h1 className="m-0 text-[clamp(38px,5.2vw,60px)] font-semibold leading-[1.05] tracking-[-0.01em]">
            Keep the book on yourself.
            <br />
            <span className="text-accent">It never shames you.</span>
          </h1>
          <p className="m-0 max-w-[480px] text-[1.125rem] leading-relaxed text-muted">
            Telemetry keeps the tape — your schedule, your streaks, and the night page for the hard hours. A miss is
            logged, never punished. The book is free forever; hire the AI coach when you want the read.
          </p>

          <ul className="border-t border-line">
            {VALUE.map(([t, s]) => (
              <li key={t} className="border-b border-line py-3">
                <div className="text-[0.875rem] text-ink">{t}</div>
                <div className="text-[0.75rem] text-muted">{s}</div>
              </li>
            ))}
          </ul>

          <Capture />
        </section>

        <SamplePage />
      </main>
    </div>
  )
}
