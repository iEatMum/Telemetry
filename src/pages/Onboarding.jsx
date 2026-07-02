// Onboarding.jsx — the front door, now a high-performance DIAGNOSTIC. A 7-step
// sequential intake that captures the user's baseline execution metrics before
// the AI Architect composes their command deck. Terminal aesthetic (scoped
// marketing-theme.css), mechanical motion (data-stream deal-in, flash-action
// taps, pulse-live processing). One question is shown at a time and the next is
// gated until the current one is answered.
//
//   STEP 1 · BASELINE   — rate current discipline [1-10] (mono-tabular grid)
//   STEP 2 · BOTTLENECK — identify the primary time-leak (rigid select grid)
//   STEP 3 · ENGINE     — target wake time (clock) + peak execution window
//   STEP 4 · LOADOUT    — active mission, protocol overrides, 5.1.2 AI consent
//   STEP 5 · GOAL MODEL — how the streak is scored (avoidance/accumulation/engagement)
//   STEP 6 · INTERFACE  — theme skin (terminal/zen/night_ops)
//   STEP 7 · STAKES     — accountability model (financial/social/friction/none)
//
// Submit flow:
//   1. apply locally (store settings + a full-survey sidecar) — offline-safe
//   2. write survey JSON to public.user_profile.survey (real in prod; fails soft
//      with no backend/session — the table needs 0006 + an authed user)
//   3. if AI consent granted → invoke the `architect` edge function (5.1.2: the
//      function itself refuses to send anything to Anthropic without consent)
//   4. PROCESSING state (pulse-live), then redirect into the live deck
//
// Reachable at /?onboarding (wired in main.jsx). No StoreProvider needed — it
// writes through storage.js directly and the app re-reads on the redirect.

import { useState } from 'react'
import '../marketing-theme.css'
import * as storage from '../lib/storage.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { buildInitialLayout } from '../lib/architectClient.js'

const TOTAL = 7

// The primary execution bottlenecks. Stored as stable keys; labelled for the UI.
const TIME_LEAKS = [
  { key: 'infinite-scrolling', label: 'Infinite Scrolling', sub: 'feeds · shorts · doomscroll' },
  { key: 'context-switching', label: 'Context Switching', sub: 'task-hopping · notifications' },
  { key: 'over-planning', label: 'Over-planning', sub: 'prep that never ships' },
  { key: 'fatigue', label: 'Fatigue', sub: 'low energy · poor recovery' },
]

const PEAK_WINDOWS = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'night', label: 'Night' },
]

// STEP A — goal framing → how the streak is modelled / scored.
const STREAK_MODELS = [
  { key: 'avoidance', label: 'Never break it', sub: 'protect an unbroken chain · one miss hurts' },
  { key: 'accumulation', label: 'Stack wins', sub: 'every rep banks upward · totals only climb' },
  { key: 'engagement', label: 'Just show up', sub: 'consistency over perfection · daily contact' },
]

// STEP B — visual preference → the deck's theme system.
const THEMES = [
  { key: 'terminal', label: 'Terminal', sub: 'electric green · perps-desk · high signal' },
  { key: 'zen', label: 'Zen', sub: 'calm · low-contrast · minimal noise' },
  { key: 'night_ops', label: 'Night Ops', sub: 'deep black · muted · low-light focus' },
]

// STEP C — accountability model → what failure costs.
const STAKES = [
  { key: 'financial', label: 'Financial', sub: 'put money on the line · pledge a stake' },
  { key: 'social', label: 'Social', sub: 'a witness gets pinged when you slip' },
  { key: 'friction', label: 'Friction', sub: 'make failure annoying · no money, no people' },
  { key: 'none', label: 'None', sub: 'pure intrinsic · no external pressure' },
]

const Label = ({ children, className = '' }) => (
  <span className={'font-mono text-[11px] tracking-[0.18em] uppercase text-mmuted ' + className}>{children}</span>
)

// Terminal toggle — electric green on-state.
function Toggle({ on, onChange, label, sub }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-mline bg-mpanel px-4 py-3.5 text-left transition-colors"
      aria-pressed={on}
    >
      <span className="min-w-0">
        <span className="block font-mono text-[13.5px] text-mink">{label}</span>
        {sub && <span className="mt-0.5 block text-[12px] leading-snug text-mmuted">{sub}</span>}
      </span>
      <span className={'relative h-6 w-11 flex-none rounded-full transition-colors ' + (on ? 'bg-mgreen shadow-[0_0_16px_var(--m-green-glow)]' : 'bg-mpanel2 border border-mline')}>
        <span className={'absolute top-0.5 h-5 w-5 rounded-full transition-all ' + (on ? 'left-[22px] bg-mgreenink' : 'left-0.5 bg-mmuted')} />
      </span>
    </button>
  )
}

// Button with the 150ms flash-action confirm overlay.
function FlashButton({ onClick, className = '', children, disabled }) {
  const [f, setF] = useState(0)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { setF((n) => n + 1); onClick && onClick(e) }}
      className={'relative overflow-hidden disabled:cursor-not-allowed disabled:opacity-40 ' + className}
    >
      {children}
      {f > 0 && <span key={f} aria-hidden className="animate-flash pointer-events-none absolute inset-0" style={{ background: 'var(--accent)' }} />}
    </button>
  )
}

// STEP 1 — high-density 1-10 baseline grid (mono-tabular).
function BaselineGrid({ value, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1
          const on = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={on}
              style={{ animationDelay: `${i * 28}ms` }}
              className={
                'animate-data-stream flex aspect-square items-center justify-center rounded-md border font-mono tabular-nums text-[19px] transition-colors ' +
                (on
                  ? 'border-mgreen bg-mgreen text-mgreenink shadow-[0_0_20px_var(--m-green-glow)]'
                  : 'border-mline bg-mpanel text-mmuted hover:border-mlinebright hover:text-mink')
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.16em] uppercase text-mfaint">
        <span>01 · slipping</span>
        <span className="text-mmuted">
          baseline:{' '}
          <span className="text-mgreen [text-shadow:0_0_14px_var(--m-green-glow)]">
            {value ? String(value).padStart(2, '0') : '--'}/10
          </span>
        </span>
        <span>10 · locked in</span>
      </div>
    </div>
  )
}

// STEP 2 — rigid 2×2 selection grid for the primary time-leak.
function SelectGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((o, i) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            style={{ animationDelay: `${i * 45}ms` }}
            className={
              'animate-data-stream flex min-h-[88px] flex-col justify-between rounded-lg border p-3.5 text-left transition-colors ' +
              (on
                ? 'border-mgreen bg-mgreen/[0.08] shadow-[0_0_20px_var(--m-green-glow)]'
                : 'border-mline bg-mpanel hover:border-mlinebright')
            }
          >
            <span className={'font-mono text-[14px] leading-tight ' + (on ? 'text-mgreen' : 'text-mink')}>{o.label}</span>
            <span className="mt-2 block font-mono text-[10.5px] tracking-[0.04em] text-mmuted">{o.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

// STEP 3 — 3-segment toggle group (electric green active).
function Segmented({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-mline bg-mpanel p-1.5">
      {options.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={
              'rounded-md py-3 font-mono text-[12px] tracking-[0.1em] uppercase transition-colors ' +
              (on
                ? 'bg-mgreen text-mgreenink shadow-[0_0_16px_var(--m-green-glow)]'
                : 'text-mmuted hover:text-mink')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function applyLocally(survey) {
  try {
    localStorage.setItem('lockedin:__survey', JSON.stringify(survey))
  } catch {
    /* quota */
  }
  // Real local write so the deck reflects the survey immediately on redirect.
  // The psychological profile (streakModel + stake) is persisted alongside the
  // interface theme so the local app — not just the server row — can act on it
  // (and it rides the settings slice through sync to the user's other devices).
  storage.update('settings', (s) => ({
    ...s,
    wakeTime: survey.wakeTime || s.wakeTime,
    mission: survey.mission || s.mission,
    modules: survey.modules,
    theme: survey.theme || s.theme,
    streakModel: survey.streakModel || s.streakModel,
    stake: survey.stake || s.stake,
  }))
}

async function writeProfile(survey, prefs = {}) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local' }
  try {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) return { ok: false, reason: 'no-session' }
    const { error } = await supabase
      .from('user_profile')
      .upsert({ user_id: user.id, survey, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return error ? { ok: false, error } : { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('form') // form | processing

  // Diagnostic answers.
  const [baseline, setBaseline] = useState(null) // 1..10
  const [timeLeak, setTimeLeak] = useState(null) // TIME_LEAKS key
  const [wake, setWake] = useState('05:30')
  const [peakWindow, setPeakWindow] = useState(null) // PEAK_WINDOWS key
  const [mission, setMission] = useState('')
  const [modules, setModules] = useState({ faith: false, recovery: false, monk: false })
  const [consent, setConsent] = useState(false) // 5.1.2 — DEFAULT OFF

  // Psychological profile (Phase 1).
  const [streakModel, setStreakModel] = useState(null) // STREAK_MODELS key
  const [theme, setTheme] = useState(null) // THEMES key
  const [stakePref, setStakePref] = useState(null) // STAKES key
  const [stakeTarget, setStakeTarget] = useState({}) // { type, amount|contact, … }

  // Gate: the next question stays hidden until the current one is answered.
  const stepAnswered = [
    baseline != null, // BASELINE
    timeLeak != null, // BOTTLENECK
    !!wake && !!peakWindow, // ENGINE
    true, // LOADOUT — mission + modules + consent are all optional
    streakModel != null, // STEP A — goal model
    theme != null, // STEP B — interface
    stakePref != null && // STEP C — stake, plus its target when one is required
      (stakePref === 'financial'
        ? Number(stakeTarget.amount) > 0
        : stakePref === 'social'
          ? !!(stakeTarget.contact && stakeTarget.contact.trim())
          : true),
  ]
  const canAdvance = stepAnswered[step]

  const next = () => { if (canAdvance) setStep((s) => Math.min(TOTAL - 1, s + 1)) }
  const back = () => setStep((s) => Math.max(0, s - 1))
  const setModule = (k) => (v) => setModules((m) => ({ ...m, [k]: v }))

  async function initialize() {
    setPhase('processing')
    // The exact diagnostic payload the AI Architect consumes.
    const survey = {
      disciplineBaseline: baseline,
      timeLeak,
      wakeTime: wake,
      peakWindow,
      mission: mission.trim(),
      modules,
      streakModel,
      theme,
      stake: { preference: stakePref, target: stakeTarget },
      consent: { aiProcessing: consent, provider: 'anthropic' },
      createdAt: new Date().toISOString(),
    }
    applyLocally(survey)
    const floor = new Promise((r) => setTimeout(r, 1300)) // keep PROCESSING visible
    await writeProfile(survey, {
      // first-class columns (0008) — survey jsonb still carries the full payload
      theme_preference: theme,
      streak_model: streakModel,
      stake_preference: stakePref,
      stake_target: stakeTarget,
    }) // real in prod; fail-soft in the demo
    if (consent) {
      try {
        await buildInitialLayout() // architect → first ui_layouts row (gated by consent server-side)
      } catch {
        /* fail soft — local deck still works */
      }
    }
    await floor
    // Land in the real app. RequireSurvey now sees the survey we just wrote
    // (local + DB) and passes the user straight through to the gated deck.
    window.location.href = '/'
  }

  if (phase === 'processing') return <Processing consent={consent} />

  return (
    <div className="relative min-h-screen overflow-hidden bg-mbg text-mink font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.2] [background-image:linear-gradient(var(--m-line)_1px,transparent_1px),linear-gradient(90deg,var(--m-line)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_25%,#000,transparent)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[520px] flex-col px-6 py-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="font-mono text-[13px] font-bold tracking-[0.22em]">TELEMETRY</div>
          <Label>diagnostic · {String(step + 1).padStart(2, '0')}/{String(TOTAL).padStart(2, '0')}</Label>
        </div>
        {/* progress ticks */}
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={'h-1 flex-1 rounded-full ' + (i <= step ? 'bg-mgreen' : 'bg-mline')} />
          ))}
        </div>

        {/* step body — remounts per step so data-stream replays the deal-in */}
        <div key={step} className="animate-data-stream mt-12 flex-1">
          {step === 0 && (
            <Step index="01" tag="baseline" title="Rate current discipline baseline" hint="Be honest. This calibrates how aggressive the protocol starts.">
              <BaselineGrid value={baseline} onChange={setBaseline} />
            </Step>
          )}

          {step === 1 && (
            <Step index="02" tag="bottleneck" title="Identify primary time-leak" hint="The one that costs you the most hours. The AI defends against it first.">
              <SelectGrid options={TIME_LEAKS} value={timeLeak} onChange={setTimeLeak} />
            </Step>
          )}

          {step === 2 && (
            <Step index="03" tag="engine" title="Set the engine" hint="When the clock starts, and when you actually run hottest.">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <Label>target wake time</Label>
                  <input
                    type="time"
                    value={wake}
                    onChange={(e) => setWake(e.target.value)}
                    className="w-full rounded-lg border border-mlinebright bg-mpanel px-5 py-5 text-center font-mono tabular-nums text-[44px] text-mgreen [text-shadow:0_0_22px_var(--m-green-glow)] outline-none focus:border-mgreen"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label>peak execution window</Label>
                  <Segmented options={PEAK_WINDOWS} value={peakWindow} onChange={setPeakWindow} />
                </div>
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step index="04" tag="loadout" title="Configure the loadout" hint="Your mission, optional protocols, and how your plan gets generated.">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <Label>current active mission</Label>
                  <input
                    type="text"
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="e.g. break 1:50 in the 800m · ship the app · 90 clean days"
                    className="w-full rounded-lg border border-mlinebright bg-mpanel px-4 py-4 font-mono text-[15px] text-mink placeholder:text-mfaint outline-none focus:border-mgreen"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label>protocol overrides · optional</Label>
                  <Toggle on={modules.faith} onChange={setModule('faith')} label="Faith & reflection" sub="Scripture, examen, prayer prompts." />
                  <Toggle on={modules.recovery} onChange={setModule('recovery')} label="Recovery protocol" sub="Urge support + accountability. Private, non-clinical." />
                  <Toggle on={modules.monk} onChange={setModule('monk')} label="Monk mode" sub="Aggressive 5am, no-compromise scheduling." />
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label>ai personalization</Label>
                  <Toggle
                    on={consent}
                    onChange={setConsent}
                    label="Personalize with Claude (Anthropic)"
                    sub="Sends your survey answers to Anthropic's Claude to generate your plan. Off = a strong default plan, nothing sent. Change anytime in Settings."
                  />
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-mfaint">
                    Required by App Store guideline 5.1.2 — we name the AI provider (Anthropic / Claude) and send nothing without your explicit consent above.
                  </p>
                </div>
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step index="05" tag="goal model" title="How should your streak work?" hint="This sets how the engine scores you — and how a missed day is handled.">
              <SelectGrid options={STREAK_MODELS} value={streakModel} onChange={setStreakModel} />
            </Step>
          )}

          {step === 5 && (
            <Step index="06" tag="interface" title="Pick your interface" hint="The visual system for your whole deck. Change it anytime in Settings.">
              <SelectGrid options={THEMES} value={theme} onChange={setTheme} />
            </Step>
          )}

          {step === 6 && (
            <Step index="07" tag="stakes" title="Set your accountability" hint="What happens when you don't follow through. Stronger stakes, stronger lock-in.">
              <div className="flex flex-col gap-6">
                <SelectGrid
                  options={STAKES}
                  value={stakePref}
                  onChange={(k) => { setStakePref(k); setStakeTarget(k === 'friction' ? { type: 'friction' } : {}) }}
                />
                {stakePref === 'financial' && (
                  <div className="flex flex-col gap-2.5">
                    <Label>pledge amount · usd</Label>
                    <div className="flex items-center gap-3 rounded-lg border border-mlinebright bg-mpanel px-5 py-4 focus-within:border-mgreen">
                      <span className="font-mono text-[28px] text-mmuted">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        value={stakeTarget.amount || ''}
                        onChange={(e) => setStakeTarget({ type: 'financial', amount: e.target.value })}
                        placeholder="50"
                        className="w-full bg-transparent font-mono tabular-nums text-[28px] text-mgreen [text-shadow:0_0_18px_var(--m-green-glow)] outline-none placeholder:text-mfaint"
                      />
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed text-mfaint">Charged via Stripe only if you break your commitment. Card is linked after sign-up.</p>
                  </div>
                )}
                {stakePref === 'social' && (
                  <div className="flex flex-col gap-2.5">
                    <Label>accountability contact</Label>
                    <input
                      type="text"
                      value={stakeTarget.contact || ''}
                      onChange={(e) => setStakeTarget({ type: 'social', contact: e.target.value })}
                      placeholder="phone number or @handle"
                      className="w-full rounded-lg border border-mlinebright bg-mpanel px-4 py-4 font-mono text-[15px] text-mink placeholder:text-mfaint outline-none focus:border-mgreen"
                    />
                    <p className="font-mono text-[11px] leading-relaxed text-mfaint">They're pinged only when you miss. Confirmed after you finish sign-up.</p>
                  </div>
                )}
                {stakePref === 'friction' && (
                  <p className="font-mono text-[12px] leading-relaxed text-mmuted">Miss a day and non-essentials lock behind a cooldown until you log a recovery rep. No money, no people.</p>
                )}
              </div>
            </Step>
          )}
        </div>

        {/* nav */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <FlashButton onClick={back} className="rounded-lg border border-mline px-5 py-3.5 font-mono text-[12px] tracking-[0.12em] text-mmuted">
              ← BACK
            </FlashButton>
          )}
          {step < TOTAL - 1 ? (
            <FlashButton
              onClick={next}
              disabled={!canAdvance}
              className="ml-auto rounded-lg bg-mgreen px-7 py-3.5 font-mono text-[13px] font-bold tracking-[0.12em] text-mgreenink shadow-[0_0_24px_var(--m-green-glow)]"
            >
              NEXT →
            </FlashButton>
          ) : (
            <FlashButton onClick={initialize} disabled={!canAdvance} className="ml-auto rounded-lg bg-mgreen px-7 py-3.5 font-mono text-[13px] font-bold tracking-[0.12em] text-mgreenink shadow-[0_0_28px_var(--m-green-glow)]">
              INITIALIZE →
            </FlashButton>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ index, tag, title, hint, children }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[12px] text-mgreen [text-shadow:0_0_14px_var(--m-green-glow)]">{index}</span>
          <Label>{tag}</Label>
        </div>
        <h1 className="m-0 font-mono text-[26px] font-bold leading-tight tracking-[-0.01em] text-mink">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-mmuted">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function Processing({ consent }) {
  const lines = [
    '> writing profile…',
    consent ? '> dispatching survey → claude (anthropic)…' : '> consent off — using default protocol…',
    '> compositing your command deck…',
  ]
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-mbg px-6 text-mink">
      <div className="flex items-center gap-3 text-mgreen [text-shadow:0_0_22px_var(--m-green-glow)]">
        <span className="h-2.5 w-2.5 rounded-full bg-mgreen animate-pulse-live" />
        <span className="font-mono text-[22px] tracking-[0.24em]">PROCESSING</span>
      </div>
      <div className="flex flex-col gap-1.5 font-mono text-[12px] text-mmuted">
        {lines.map((l, i) => (
          <span key={i} className="animate-data-stream" style={{ animationDelay: `${i * 220}ms` }}>{l}</span>
        ))}
      </div>
    </div>
  )
}
