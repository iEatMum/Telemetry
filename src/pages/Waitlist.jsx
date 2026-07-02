// Telemetry — Waitlist landing page (React 18 · plain JS · Tailwind).
// MARKETING surface ONLY. Uses the scoped "command center" marketing theme
// (marketing-theme.css → m* tokens) — NOT the app's witness/terminal tokens. The
// red/amber + leaderboard mechanics here must never be ported into the app.
//
// Source: the design-system waitlist handoff + the "daily deal" canvas mock. The
// right-hand CommandPanel previews the generative deck and showcases the
// Mechanical & Snappy motion (data-stream deal-in, pulse-live). Reachable at
// /?waitlist (wired in main.jsx). Supabase capture fails soft to a local mock.

import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import '../marketing-theme.css'

const pad = (n) => String(n).padStart(2, '0')
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const Label = ({ children, className = '' }) => (
  <span className={'font-mono text-[11px] tracking-[0.18em] uppercase text-mmuted ' + className}>{children}</span>
)

function MockClock() {
  const [t, setT] = useState({ d: 142, h: 6, m: 38, s: 11 })
  useEffect(() => {
    const id = setInterval(
      () =>
        setT((p) => {
          let { d, h, m, s } = p
          s++
          if (s > 59) { s = 0; m++ }
          if (m > 59) { m = 0; h++ }
          if (h > 23) { h = 0; d++ }
          return { d, h, m, s }
        }),
      1000
    )
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-baseline gap-2 font-mono tabular-nums text-[34px] leading-none text-mgreen [text-shadow:0_0_22px_var(--m-green-glow)] animate-breathe">
      <span>{pad(t.d)}</span><span className="text-mfaint [text-shadow:none]">:</span>
      <span>{pad(t.h)}</span><span className="text-mfaint [text-shadow:none]">:</span>
      <span>{pad(t.m)}</span><span className="text-mfaint [text-shadow:none]">:</span>
      <span className="opacity-85">{pad(t.s)}</span>
    </div>
  )
}

function Capture() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | joined
  const [rank, setRank] = useState(null)
  const [ref, setRef] = useState('')
  const [copied, setCopied] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return
    setState('submitting')

    const code = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).slice(0, 8)
    const approxRank = 1000 + Math.floor(Math.random() * 8000)

    // Real join when the backend exists; fail soft to the local mock otherwise
    // (table INSERT-only RLS means rank can't be read back yet — see 0007_waitlist.sql).
    if (isSupabaseConfigured && supabase) {
      try {
        const referredBy = new URLSearchParams(location.search).get('ref')
        const { error } = await supabase.from('waitlist').insert({ email, referral_code: code, referred_by: referredBy })
        if (!error) {
          setRank(approxRank); setRef(code); setState('joined'); return
        }
      } catch {
        /* fall through to mock */
      }
    }
    await new Promise((r) => setTimeout(r, 650))
    setRank(approxRank); setRef(code); setState('joined')
  }

  const link = `lockedin.app/?ref=${ref}`
  const copy = () => {
    navigator.clipboard?.writeText('https://' + link)
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  if (state === 'joined') {
    return (
      <div className="flex flex-col gap-[18px]">
        <Label className="text-mgreen">▸ access queued</Label>
        <div>
          <Label>your position</Label>
          <div className="font-mono text-[54px] leading-none text-mgreen [text-shadow:0_0_26px_var(--m-green-glow)] mt-1.5">#{rank.toLocaleString()}</div>
        </div>
        <p className="m-0 text-[14.5px] leading-relaxed text-mmuted max-w-[440px]">
          Every operator you recruit moves you up the queue. Three referrals jumps you{' '}
          <span className="text-mink">~400 spots</span>. Front of the line gets day-one access.
        </p>
        <div className="flex gap-2 items-stretch">
          <div className="flex-1 flex items-center px-3.5 font-mono text-[13.5px] text-mink bg-mpanel2 border border-mline rounded truncate">{link}</div>
          <button onClick={copy} className={'px-5 font-mono text-[12px] font-bold tracking-[0.12em] rounded ' + (copied ? 'bg-mpanel2 text-mgreen border border-mgreen' : 'bg-mgreen text-mgreenink shadow-[0_0_24px_var(--m-green-glow)]')}>
            {copied ? 'COPIED ✓' : 'COPY LINK'}
          </button>
        </div>
        <div className="flex gap-2">
          {['TikTok', 'X', 'iMessage'].map((s) => (
            <button key={s} className="flex-1 py-[11px] font-mono text-[11px] tracking-[0.1em] uppercase text-mmuted border border-mline rounded">SHARE · {s}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div className="flex gap-2 items-stretch flex-wrap">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com" required
          className="flex-[1_1_240px] min-w-0 px-4 py-[15px] font-mono bg-mpanel border border-mlinebright rounded text-mink text-[15px] outline-none focus:border-mgreen"
        />
        <button type="submit" disabled={state === 'submitting'} className="px-[30px] font-mono text-[13px] font-bold tracking-[0.12em] bg-mgreen text-mgreenink rounded shadow-[0_0_28px_var(--m-green-glow)] disabled:opacity-60">
          {state === 'submitting' ? 'LOCKING…' : 'LOCK IN →'}
        </button>
      </div>
      <Label>no spam · delete anytime · 8,423 on the list</Label>
    </form>
  )
}

// Right-rail preview of the generative deck — static, marketing-themed, and it
// "deals in" with the data-stream motion to sell the command-center feel.
function CommandPanel() {
  const schedule = [
    { t: '05:30', label: 'Wake', verdict: 'HIT', mark: 'var(--m-green)', vColor: 'var(--m-muted)' },
    { t: '06:15', label: 'Sprint · 6×200m', verdict: 'LIVE', mark: 'var(--m-green)', vColor: 'var(--m-green)' },
    { t: '12:30', label: 'Fuel', verdict: 'PENDING', mark: 'var(--m-line-bright)', vColor: 'var(--m-amber)' },
    { t: '18:00', label: 'Study block', verdict: 'PENDING', mark: 'var(--m-line-bright)', vColor: 'var(--m-amber)' },
    { t: '22:00', label: 'Phone down', verdict: 'PENDING', mark: 'var(--m-line-bright)', vColor: 'var(--m-amber)' },
  ]
  const tiles = [
    { value: '212', label: 'CLEAN DAYS', color: 'var(--m-green)' },
    { value: '14', label: 'SPRINTS / WK', color: 'var(--m-ink)' },
    { value: '38.2', label: 'MILES / WK', color: 'var(--m-ink)' },
  ]
  const trend = '10,55 56,40 102,49 148,30 193,39 239,23 285,27'

  return (
    <div className="rounded-xl border border-mline bg-mbg2 p-5 shadow-[0_0_60px_-20px_var(--m-green-glow)]">
      <div className="flex items-center justify-between border-b border-mline pb-4">
        <div>
          <Label>uptime · clean</Label>
          <div className="mt-2"><MockClock /></div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-mgreen">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-mgreen animate-pulse-live" /> SYSTEM LIVE
        </div>
      </div>

      {/* Schedule matrix — deals in */}
      <div className="mt-4 rounded-lg bg-mpanel p-4">
        <Label>schedule matrix</Label>
        <div className="mt-3 flex flex-col">
          {schedule.map((r, i) => (
            <div
              key={r.t}
              className="animate-data-stream flex items-center gap-3.5 border-t border-mline py-2.5 first:border-t-0"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <span className="self-stretch w-[3px] rounded-sm" style={{ background: r.mark }} />
              <span className="font-mono tabular-nums text-[13px] text-mink min-w-[48px]">{r.t}</span>
              <span className="flex-1 text-[13px] text-mink">{r.label}</span>
              <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: r.vColor }}>{r.verdict}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Energy trend */}
      <div className="mt-3.5 rounded-lg bg-mpanel p-4 animate-data-stream" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between">
          <Label>energy trend</Label>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-mgreen">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-mgreen animate-pulse-live" /> NOW
          </span>
        </div>
        <svg viewBox="0 0 300 86" preserveAspectRatio="none" className="mt-3 block h-[80px] w-full overflow-visible">
          <polyline points={trend} fill="none" stroke="var(--m-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="285" y1="0" x2="285" y2="86" stroke="var(--m-line-bright)" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="285" cy="27" r="9" fill="var(--m-green-glow)" />
          <circle cx="285" cy="27" r="4.5" fill="var(--m-green)" />
        </svg>
      </div>

      {/* Stat grid — deals in */}
      <div className="mt-3.5 grid grid-cols-3 gap-3.5">
        {tiles.map((tile, i) => (
          <div key={tile.label} className="animate-data-stream rounded-lg bg-mpanel p-4" style={{ animationDelay: `${180 + i * 70}ms` }}>
            <div className="font-mono tabular-nums text-[24px] font-semibold leading-none" style={{ color: tile.color }}>{tile.value}</div>
            <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-mmuted">{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Waitlist() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-mbg text-mink font-sans">
      {/* grid texture + green glow wash */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.22] [background-image:linear-gradient(var(--m-line)_1px,transparent_1px),linear-gradient(90deg,var(--m-line)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(ellipse_90%_70%_at_50%_30%,#000,transparent)]" />
      <header className="relative flex items-center justify-between px-8 py-[22px] max-w-[1180px] mx-auto">
        <div className="font-mono text-[14px] font-bold tracking-[0.22em]">TELEMETRY</div>
        <div className="flex items-center gap-2 px-3 py-[7px] border border-mline rounded"><Label>pre-launch · v0</Label></div>
      </header>
      <main className="relative max-w-[1180px] mx-auto px-8 pt-10 pb-20 grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-14 items-center">
        <section className="flex flex-col gap-[26px]">
          <h1 className="m-0 text-[clamp(40px,5.4vw,68px)] leading-[1.02] tracking-[-0.02em] font-extrabold">
            STOP NEGOTIATING WITH <span className="text-mgreen [text-shadow:0_0_30px_var(--m-green-glow)]">YOURSELF.</span>
          </h1>
          <p className="m-0 text-[18px] leading-[1.55] text-mmuted max-w-[480px]">
            An AI system that runs your day like a command center — wake, deep work, training, streaks. It witnesses what you actually did and tells you the next move. <span className="text-mink">No willpower required. Just the protocol.</span>
          </p>
          <Capture />
        </section>
        <CommandPanel />
      </main>
    </div>
  )
}
