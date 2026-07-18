// Onboarding.jsx — opening your book. The front door, a CONDITIONAL DIAGNOSTIC.
// Not a linear stepper: a directed node graph (src/lib/onboardingFlow.json) is
// walked via the declarative resolver (src/lib/flowResolver.js), so which
// question comes next is computed from the live answer slice — an elite baseline
// skips the anchor step, a late-night danger window on the recovery module
// surfaces a counter-move, and a typed mission unlocks the confidence check.
// One question is shown at a time; NEXT is gated by each node's `validate` rule.
//
// Design (Split Ledger deliverable 05): this page wears the APP's tokens — the
// same manila page the deck opens onto, so the first minute and the thousandth
// look like one object. Selection = border-accent-deep + surface-2 (the same
// "current line" treatment as the night page's NOW step); lane-red fills are
// reserved for the final seal (INITIALIZE). Nothing shouts, nothing glows.
//
// Data model (all mocked/local — Supabase paused):
//   answers    — the state slice the resolver reads (executionRate7d, dangerWindow,
//                anchorHabit, slipResponse, missionConfidence, + the originals)
//   flowState  — { currentId, visited[], anchorRequired, recommendSocial } runtime
//
// Submit flow (unchanged in spirit):
//   1. deriveGuardianSeed(answers) → writeGuardianSeed() into the drift sidecar
//   2. apply locally (settings + a full-survey sidecar) — offline-safe
//   3. write survey JSON to user_profile (real in prod; fail-soft with no backend)
//   4. if AI consent → invoke `architect`; then the opening screen → the deck
//
// Reachable at /?onboarding and as RequireSurvey's intake gate. Writes through
// storage.js.

import { useEffect, useMemo, useState } from 'react'
import * as storage from '../lib/storage.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { buildInitialLayout } from '../lib/architectClient.js'
import FLOW from '../lib/onboardingFlow.json'
import { normalizeFlow, getNode, resolveNext, evalValidate, longestPathFrom } from '../lib/flowResolver.js'
import { deriveGuardianSeed, writeGuardianSeed } from '../lib/guardianSeed.js'
import { isHealthAvailable, requestHealthAuth } from '../lib/health.js'
import { sealCommit } from '../lib/haptics.js'
import { track } from '../lib/analytics.js'

// The mid-interview draft (P1 kill-resilience). A sidecar, wiped with the rest.
const INTAKE_DRAFT_KEY = 'lockedin:__intake_draft'

// ── Option sets. Stable keys, UI labels. Referenced from the flow by name so the
// JSON graph stays label-free (single source of truth for copy lives here). ────
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

// dangerWindow — locate the time-leak in the day (the {window} the Guardian arms).
const DANGER_WINDOWS = [
  { key: 'post-wake', label: 'Right after waking', sub: 'the first hour bleeds' },
  { key: 'midday-slump', label: 'Afternoon slump', sub: 'post-lunch dead zone' },
  { key: 'evening', label: 'After dinner', sub: 'the wind-down slide' },
  { key: 'late-night', label: 'Late night', sub: 'past bedtime · alone' },
]

// anchorHabit — the existing routine the first block gets stacked onto.
const ANCHOR_HABITS = [
  { key: 'workout', label: 'Training / workout', sub: 'lift · run · practice' },
  { key: 'coffee-breakfast', label: 'Coffee / breakfast', sub: 'the morning fuel' },
  { key: 'shower', label: 'Shower', sub: 'the daily reset' },
  { key: 'commute', label: 'Commute / class', sub: 'the leave-the-house cue' },
  { key: 'evening-meal', label: 'Evening meal', sub: 'dinner, every day' },
  { key: 'none', label: "Nothing's fixed yet", sub: 'no reliable daily anchor' },
]

// counterMove — the pre-loaded THEN of a coping plan (recovery + late-night only).
const COUNTER_MOVES = [
  { key: 'move', label: 'Move', sub: '20 pushups · hard 2-min effort' },
  { key: 'relocate', label: 'Relocate', sub: 'leave the room · get outside' },
  { key: 'reach-out', label: 'Reach out', sub: 'text the accountability contact' },
  { key: 'ride-out', label: 'Ride it out', sub: 'open the timer · let it crest' },
]

// slipResponse — the historical response to a broken streak (calibrates post-reset
// copy). Framed as "the tape", situational, no self-as-bad language.
const SLIP_RESPONSES = [
  { key: 'spiral', label: 'Day gets written off', sub: 'one miss becomes an off day · sometimes a week' },
  { key: 'critic', label: 'I tear into myself', sub: 'harsh self-talk · but I keep moving' },
  { key: 'shrug', label: 'Reset and move', sub: 'log it, back on the next block' },
  { key: 'ghost', label: 'I stop looking', sub: 'avoid the plan · go dark a while' },
]

const STREAK_MODELS = [
  { key: 'avoidance', label: 'Never break it', sub: 'protect an unbroken chain · one miss hurts' },
  { key: 'accumulation', label: 'Stack wins', sub: 'every rep banks upward · totals only climb' },
  { key: 'engagement', label: 'Just show up', sub: 'consistency over perfection · daily contact' },
]

const THEMES = [
  { key: 'split_book', label: 'Split Book', sub: 'manila paper · carbon ink · daylight' },
  { key: 'lamplight', label: 'Lamplight', sub: 'amber-washed · quiet · built for late nights' },
  { key: 'carbon', label: 'Carbon', sub: 'graphite dark · bone ink · all-day dark' },
]

// Accountability — only mechanisms that actually exist in the local-first v1.
// A witness = a real accountability partner (settings.partners): they appear on
// the night page for a one-tap text, sent by the user. Nothing here promises a
// charge, a ping, or a lock the app can't perform.
const STAKES = [
  { key: 'witness', label: 'A witness', sub: 'someone in your corner · one-tap text on the night page' },
  { key: 'none', label: 'Just me', sub: 'pure intrinsic · add someone later in Settings' },
]

// focusGoal — directs the blocks seeded into ScheduleMatrix + GoalProgress.
const FOCUS_GOALS = [
  { key: 'running', label: 'Running', sub: 'track · roads · tempo' },
  { key: 'work', label: 'Deep work', sub: 'ship the output' },
  { key: 'reading', label: 'Reading', sub: 'pages every day' },
  { key: 'gym', label: 'Gym / lifting', sub: 'strength · hypertrophy' },
  { key: 'all', label: 'All-round', sub: 'balance across domains' },
]

// healthIntegration option domains (the checkbox sets).
const HEALTH_PROVIDERS = [
  { key: 'apple-health', label: 'Apple Health' },
]
const HEALTH_METRICS = [
  { key: 'sleep', label: 'Sleep' },
  { key: 'activity', label: 'Activity' },
  { key: 'heart-rate', label: 'Heart rate' },
]

const OPTION_SETS = { TIME_LEAKS, PEAK_WINDOWS, DANGER_WINDOWS, ANCHOR_HABITS, COUNTER_MOVES, SLIP_RESPONSES, STREAK_MODELS, THEMES, STAKES, FOCUS_GOALS }

const Label = ({ children, className = '' }) => (
  <span className={'font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted ' + className}>{children}</span>
)

function Toggle({ on, onChange, label, sub }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3.5 text-left"
      aria-pressed={on}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="min-w-0">
        <span className="block text-[0.875rem] text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-[0.75rem] leading-snug text-muted">{sub}</span>}
      </span>
      <span className={'relative h-6 w-11 flex-none rounded-full transition-colors ' + (on ? 'bg-ink' : 'border border-line bg-surface2')}>
        <span className={'absolute top-0.5 h-5 w-5 rounded-full transition-all ' + (on ? 'left-[22px] bg-bg' : 'left-0.5 bg-muted')} />
      </span>
    </button>
  )
}

function FlashButton({ onClick, className = '', children, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={'relative overflow-hidden active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ' + className}
    >
      {children}
    </button>
  )
}

// A parameterized mono-tabular numeric grid — used for executionRate7d (0–7) and
// missionConfidence (1–10). Config drives range, columns, anchors, and readout.
function BaselineGrid({ value, onChange, config = {} }) {
  const { min = 1, max = 10, cols = 5, unit = '/10', readout = 'baseline', anchorLo = '01 · slipping', anchorHi = '10 · locked in' } = config
  const count = max - min + 1
  const pad = String(max).length
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }).map((_, i) => {
          const n = min + i
          const on = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={on}
              style={{ animationDelay: `${i * 28}ms` }}
              className={
                'animate-data-stream flex aspect-square items-center justify-center rounded-md border font-clock tnum text-[1.1875rem] transition-colors ' +
                (on
                  ? 'border-accent-deep bg-surface2 font-medium text-ink'
                  : 'border-line bg-surface text-muted hover:border-linebright hover:text-ink')
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between font-clock text-[10.5px] uppercase tracking-widest2 text-faint">
        <span>{anchorLo}</span>
        <span className="text-muted">
          {readout}:{' '}
          <span className="tnum font-medium text-ink">
            {value != null ? String(value).padStart(pad, '0') : '--'}{unit}
          </span>
        </span>
        <span>{anchorHi}</span>
      </div>
    </div>
  )
}

// Rigid selection grid (2-up). `recommended` highlights an option without picking
// it. Selected = the current-line treatment (accent-deep hairline + surface-2);
// never a red fill — the seal stays with INITIALIZE.
function SelectGrid({ options, value, onChange, recommended = null }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((o, i) => {
        const on = value === o.key
        const rec = !on && recommended === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            style={{ animationDelay: `${i * 45}ms` }}
            className={
              'animate-data-stream relative flex min-h-[88px] flex-col justify-between rounded-md border p-3.5 text-left transition-colors ' +
              (on
                ? 'border-accent-deep bg-surface2'
                : rec
                  ? 'border-linebright bg-surface'
                  : 'border-line bg-surface hover:border-linebright')
            }
          >
            {rec && (
              <span className="absolute right-2 top-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">suggested</span>
            )}
            <span className={'text-[0.875rem] leading-tight ' + (on ? 'font-medium text-ink' : 'text-ink')}>{o.label}</span>
            <span className="mt-2 block text-[0.6875rem] leading-snug text-muted">{o.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-md border border-line bg-surface p-1.5">
      {options.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={
              'rounded py-3 font-clock text-[0.75rem] uppercase tracking-widest2 transition-colors ' +
              (on ? 'bg-ink text-bg' : 'text-muted hover:text-ink')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Node renderers, keyed by node.type (the onboarding INPUT_REGISTRY). Each gets
// (node, answers, set) where set(path, value) writes into the answer slice. ─────
const NODE_RENDERERS = {
  BaselineGrid: (node, answers, set) => (
    <BaselineGrid value={answers[node.writes]} onChange={(v) => set(node.writes, v)} config={node.config} />
  ),

  SelectGrid: (node, answers, set) => (
    <SelectGrid
      options={OPTION_SETS[node.config?.optionsRef] || []}
      value={answers[node.writes]}
      onChange={(k) => set(node.writes, k)}
    />
  ),

  EnginePanel: (_node, answers, set) => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <Label>target wake time</Label>
        <input
          type="time"
          value={answers.wakeTime}
          onChange={(e) => set('wakeTime', e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-5 py-5 text-center font-clock tnum text-[2.75rem] text-ink outline-none focus:border-accent-deep"
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <Label>peak execution window</Label>
        <Segmented options={PEAK_WINDOWS} value={answers.peakWindow} onChange={(k) => set('peakWindow', k)} />
      </div>
    </div>
  ),

  ProtocolPanel: (_node, answers, set) => {
    const setModule = (k) => (v) => set('modules', { ...answers.modules, [k]: v })
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <Label>protocol overrides · optional</Label>
          <div className="border-t border-line">
            <Toggle on={answers.modules.faith} onChange={setModule('faith')} label="Faith & reflection" sub="Scripture, examen, prayer prompts." />
            <Toggle on={answers.modules.recovery} onChange={setModule('recovery')} label="Recovery protocol" sub="Urge support + accountability. Private, non-clinical." />
            <Toggle on={answers.modules.monk} onChange={setModule('monk')} label="Monk mode" sub="Aggressive 5am, no-compromise scheduling." />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Label>ai personalization</Label>
          <div className="border-t border-line">
            <Toggle
              on={answers.consent}
              onChange={(v) => set('consent', v)}
              label="Personalize with Claude (Anthropic)"
              sub="When the AI coach is live, this lets it read your survey answers to compose your plan. Off by default — and in this version your plan is built on-device, so nothing leaves your phone either way. Change anytime in Settings."
            />
          </div>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-faint">
            We name the provider up front — Anthropic's Claude — and send nothing unless this switch is on. This version transmits nothing; your answers stay on your device.
          </p>
        </div>
      </div>
    )
  },

  // RawChoice / HealthLinkPanel keep their SEMANTIC form controls (real radios
  // and checkboxes — the core-systems contract) and now wear the ledger's rules:
  // each option is a ruled line, the control itself inked on selection.
  RawChoice: (node, answers, set) => {
    const options = OPTION_SETS[node.config?.optionsRef] || []
    const value = answers[node.writes]
    return (
      <fieldset className="border-t border-line">
        <legend className="sr-only">{node.meta?.tag}</legend>
        {options.map((o) => (
          <label
            key={o.key}
            className={
              'flex min-h-[52px] cursor-pointer items-center gap-3 border-b border-line px-1 py-3 ' +
              (value === o.key ? 'bg-surface2' : '')
            }
          >
            <input
              type="radio"
              name={node.writes}
              value={o.key}
              checked={value === o.key}
              onChange={() => set(node.writes, o.key)}
              className="h-4 w-4 flex-none"
              style={{ accentColor: 'var(--text)' }}
            />
            <span className="min-w-0">
              <span className={'block text-[0.875rem] ' + (value === o.key ? 'font-medium text-ink' : 'text-ink')}>{o.label}</span>
              <span className="block text-[0.6875rem] text-muted">{o.sub}</span>
            </span>
          </label>
        ))}
      </fieldset>
    )
  },

  HealthLinkPanel: (_node, answers, set) => {
    const hi = answers.healthIntegration || { linked: false, providers: [], synchronizedMetrics: [] }
    const patch = (next) => set('healthIntegration', { ...hi, ...next })
    const toggleIn = (arrKey, key) => {
      const arr = hi[arrKey] || []
      patch({ [arrKey]: arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key] })
    }
    const row = 'flex min-h-[44px] cursor-pointer items-center gap-3 border-b border-line px-1 py-2.5 text-[0.875rem] text-ink'
    const box = { accentColor: 'var(--text)' }
    return (
      <div className="flex flex-col gap-5">
        <label className={row + ' border-t'}>
          <input type="checkbox" checked={!!hi.linked} onChange={(e) => patch({ linked: e.target.checked })} className="h-4 w-4 flex-none" style={box} />
          Link health data
        </label>
        <fieldset disabled={!hi.linked} className={!hi.linked ? 'opacity-40' : ''}>
          <legend className="mb-1"><Label>providers</Label></legend>
          <div className="border-t border-line">
            {HEALTH_PROVIDERS.map((p) => (
              <label key={p.key} className={row}>
                <input
                  type="checkbox"
                  checked={(hi.providers || []).includes(p.key)}
                  onChange={() => toggleIn('providers', p.key)}
                  className="h-4 w-4 flex-none"
                  style={box}
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={!hi.linked} className={!hi.linked ? 'opacity-40' : ''}>
          <legend className="mb-1"><Label>synchronized metrics</Label></legend>
          <div className="border-t border-line">
            {HEALTH_METRICS.map((m) => (
              <label key={m.key} className={row}>
                <input
                  type="checkbox"
                  checked={(hi.synchronizedMetrics || []).includes(m.key)}
                  onChange={() => toggleIn('synchronizedMetrics', m.key)}
                  className="h-4 w-4 flex-none"
                  style={box}
                />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    )
  },

  // The dictation step — the user writes their OWN day. Three ruled lines:
  // optional time, the block itself, and a ◆ toggle for "the day hinges on
  // this". These land in settings.dayBlocks and print on the Today heat sheet;
  // the day-plan editor (deck + Settings) edits the same list later.
  DayBlocksPanel: (_node, answers, set) => {
    const blocks = answers.dayBlocks
    const patch = (i, field, value) =>
      set('dayBlocks', blocks.map((b, j) => (j === i ? { ...b, [field]: value } : b)))
    const hints = ['e.g. Chem — study block', 'e.g. Practice', 'e.g. Call home']
    return (
      <div className="flex flex-col gap-3">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-stretch gap-2">
            <input
              type="time"
              value={b.time}
              onChange={(e) => patch(i, 'time', e.target.value)}
              aria-label={`Block ${i + 1} time (optional)`}
              className="w-[104px] flex-none rounded-md border border-line bg-surface px-2 py-3 text-center font-clock tnum text-[0.875rem] text-ink outline-none focus:border-accent-deep"
            />
            <input
              type="text"
              value={b.block}
              onChange={(e) => patch(i, 'block', e.target.value)}
              placeholder={hints[i]}
              aria-label={`Block ${i + 1}`}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-3 text-[0.875rem] text-ink outline-none placeholder:text-muted focus:border-accent-deep"
            />
            <button
              type="button"
              onClick={() => patch(i, 'impact', b.impact === 'high' ? undefined : 'high')}
              aria-pressed={b.impact === 'high'}
              aria-label={`Mark block ${i + 1} high-impact`}
              className={
                'w-11 flex-none rounded-md border font-clock text-[0.9375rem] transition-colors ' +
                (b.impact === 'high' ? 'border-accent-deep bg-surface2 text-accent' : 'border-line bg-surface text-muted')
              }
            >
              ◆
            </button>
          </div>
        ))}
        <p className="text-[0.6875rem] leading-relaxed text-muted">
          ◆ marks the block the day hinges on — it becomes the deep-work timer. One line is enough to start.
        </p>
      </div>
    )
  },

  MissionField: (_node, answers, set) => (
    <div className="flex flex-col gap-2.5">
      <Label>current active mission</Label>
      <input
        type="text"
        value={answers.mission}
        onChange={(e) => set('mission', e.target.value)}
        placeholder="e.g. break 1:50 in the 800m · ship the app · 90 clean days"
        className="w-full rounded-md border border-line bg-surface px-4 py-4 text-[0.9375rem] text-ink outline-none placeholder:text-muted focus:border-accent-deep"
      />
    </div>
  ),

  StakePanel: (node, answers, set, flowState) => (
    <div className="flex flex-col gap-6">
      <SelectGrid
        options={STAKES}
        value={answers.stakePref}
        recommended={flowState.recommendSocial ? 'witness' : null}
        onChange={(k) => { set('stakePref', k); set('stakeTarget', k === 'witness' ? { type: 'witness', ...answers.stakeTarget } : {}) }}
      />
      {flowState.recommendSocial && answers.stakePref !== 'witness' && (
        <p className="-mt-3 font-serif text-[0.8125rem] italic leading-relaxed text-muted">
          You said you go dark after a miss — a witness is the strongest counter to that. Just a suggestion.
        </p>
      )}
      {answers.stakePref === 'witness' && (
        <div className="flex flex-col gap-2.5">
          {/* Visible labels persist after typing (a placeholder is not a
              label), and the gate states its own unlock condition instead of
              leaving a silently-dimmed INITIALIZE. */}
          <Label>witness · name</Label>
          <input
            type="text"
            value={answers.stakeTarget.name || ''}
            onChange={(e) => set('stakeTarget', { ...answers.stakeTarget, type: 'witness', name: e.target.value })}
            placeholder="Name"
            aria-label="Witness name"
            className="w-full rounded-md border border-line bg-surface px-4 py-4 text-[0.9375rem] text-ink outline-none placeholder:text-muted focus:border-accent-deep"
          />
          <Label>witness · phone, for the one-tap text</Label>
          <input
            type="tel"
            value={answers.stakeTarget.phone || ''}
            onChange={(e) => set('stakeTarget', { ...answers.stakeTarget, type: 'witness', phone: e.target.value })}
            placeholder="+1 555…"
            aria-label="Witness phone number"
            className="w-full rounded-md border border-line bg-surface px-4 py-4 font-clock text-[0.9375rem] text-ink outline-none placeholder:text-muted focus:border-accent-deep"
          />
          <p className="text-[0.6875rem] leading-relaxed text-muted">They land on your night page as a one-tap text. You send it; the app never contacts them.</p>
          {!stakeTargetSatisfied(answers) && (
            <p role="status" className="text-[0.6875rem] leading-relaxed text-muted">
              Initialize unlocks when both the name and the number are down.
            </p>
          )}
        </div>
      )}
    </div>
  ),
}

// Dictation needs at least one written block — an all-empty dictation step
// would hand the deck right back to invented defaults. Lives here (not the JSON
// validate rule) because "some row has text" isn't expressible in the OPS list.
function dictationSatisfied(answers) {
  return (answers.dayBlocks || []).some((b) => b.block && b.block.trim())
}

// The stake target sub-requirement is conditional on the stake TYPE, so it lives
// here rather than in the JSON validate rule (which covers stakePref itself).
function stakeTargetSatisfied(answers) {
  if (answers.stakePref === 'witness')
    return !!(answers.stakeTarget?.name && answers.stakeTarget.name.trim() && answers.stakeTarget?.phone && answers.stakeTarget.phone.trim())
  return true
}

// Invoke the native health connector when linking was requested. Records the
// resolved permission on the survey's healthIntegration so the deck knows
// whether real streams are available (native) or the mock stands in (web/sim).
// Never throws — a denied/absent SDK simply leaves linked flags but no auth.
async function linkHealth(survey) {
  const hi = survey.healthIntegration
  if (!hi || !hi.linked) return
  try {
    const available = await isHealthAvailable()
    hi.nativeAvailable = available
    if (available) {
      const res = await requestHealthAuth()
      hi.authorized = !!res.ok
    } else {
      hi.authorized = false // web/simulator → mock streams (liveLayout handles it)
    }
  } catch {
    hi.authorized = false
  }
}

function applyLocally(survey) {
  try {
    localStorage.setItem('lockedin:__survey', JSON.stringify(survey))
  } catch {
    /* quota */
  }
  storage.update('settings', (s) => ({
    ...s,
    wakeTime: survey.wakeTime || s.wakeTime,
    mission: survey.mission || s.mission,
    modules: survey.modules,
    theme: survey.theme || s.theme,
    streakModel: survey.streakModel || s.streakModel,
    stake: survey.stake || s.stake,
    // New diagnostic signals — persisted so the local deck + Guardian can read
    // them without the backend (they also ride settings sync when it resumes).
    executionRate7d: survey.executionRate7d ?? s.executionRate7d,
    timeLeak: survey.timeLeak || s.timeLeak,
    dangerWindow: survey.dangerWindow || s.dangerWindow,
    anchorHabit: survey.anchorHabit || s.anchorHabit,
    peakWindow: survey.peakWindow || s.peakWindow,
    focusGoal: survey.focusGoal || s.focusGoal,
    dayBlocks: Array.isArray(survey.dayBlocks) && survey.dayBlocks.length ? survey.dayBlocks : s.dayBlocks,
    missionConfidence: survey.missionConfidence ?? s.missionConfidence,
    counterMove: survey.counterMove || s.counterMove,
    slipResponse: survey.slipResponse || s.slipResponse,
    healthIntegration: survey.healthIntegration || s.healthIntegration,
  }))
  // A named witness becomes a real accountability partner — the same list the
  // night page's one-tap text and the HELP protocol read. Nothing else in the
  // app ever contacts them; the entry only puts the button within reach.
  const w = survey.stake?.target
  if (survey.stake?.preference === 'witness' && w?.name?.trim() && w?.phone?.trim()) {
    storage.update('settings', (s) => {
      const partners = s.partners || []
      const exists = partners.some((p) => (p.phone || '').trim() === w.phone.trim())
      return exists
        ? s
        : {
            ...s,
            partners: [
              ...partners,
              { id: `wit-${Date.now().toString(36)}`, name: w.name.trim(), phone: w.phone.trim() },
            ],
          }
    })
  }
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
  const flow = useMemo(() => normalizeFlow(FLOW), [])

  const [phase, setPhase] = useState('form') // form | processing
  // The interview survives a kill (P1): a phone call or iOS jetsam at step 13
  // of 16 used to restart the whole intake — answers lived only in useState.
  // Every change mirrors {answers, flowState} to a draft sidecar; a fresh
  // mount rehydrates it; initialize() burns it. A draft whose saved node no
  // longer exists (flow changed between builds) is discarded whole.
  const draft = useMemo(() => {
    try {
      const d = JSON.parse(localStorage.getItem(INTAKE_DRAFT_KEY) || 'null')
      if (d && d.answers && d.flowState && getNode(flow, d.flowState.currentId)) return d
    } catch {
      /* unreadable draft — start clean */
    }
    return null
  }, [flow])
  const [answers, setAnswers] = useState(() => ({
    executionRate7d: null,
    anchorHabit: null,
    modules: { faith: false, recovery: false, monk: false },
    consent: false,
    timeLeak: null,
    dangerWindow: null,
    counterMove: null,
    wakeTime: '05:30',
    peakWindow: null,
    focusGoal: null,
    dayBlocks: [
      { time: '', block: '', impact: undefined },
      { time: '', block: '', impact: undefined },
      { time: '', block: '', impact: undefined },
    ],
    mission: '',
    missionConfidence: null,
    slipResponse: null,
    streakModel: null,
    theme: null,
    healthIntegration: { linked: false, providers: [], synchronizedMetrics: [] },
    stakePref: null,
    stakeTarget: {},
    ...(draft ? draft.answers : {}),
  }))
  const [flowState, setFlowState] = useState(
    () => (draft ? draft.flowState : { currentId: flow.entryId, visited: [flow.entryId], anchorRequired: false, recommendSocial: false })
  )

  useEffect(() => {
    if (phase !== 'form') return
    try {
      localStorage.setItem(INTAKE_DRAFT_KEY, JSON.stringify({ answers, flowState, at: new Date().toISOString() }))
    } catch {
      /* quota — the interview still works, it just won't survive a kill */
    }
  }, [answers, flowState, phase])

  const node = getNode(flow, flowState.currentId)
  // Every node writes a top-level answer key (modules/stakeTarget are whole
  // objects), so a flat setter is sufficient and keeps the slice shape stable.
  const set = (key, value) => setAnswers((a) => ({ ...a, [key]: value }))

  // Node validity: the declarative rule, plus the conditional stake-target guard.
  const baseValid = evalValidate(node?.validate, answers)
  const canAdvance =
    node?.id === 'stakePref'
      ? baseValid && stakeTargetSatisfied(answers)
      : node?.id === 'dayBlocks'
        ? baseValid && dictationSatisfied(answers)
        : baseValid

  const transition = resolveNext(node, answers)
  const isLast = transition.goto === 'initialize' || transition.goto === null

  const depth = flowState.visited.length - 1
  // Honest step count: what's walked plus the deepest branch still reachable
  // from HERE. A short branch shrinks the denominator (14 → 13) instead of
  // ending the flow stranded at "13/15".
  const totalSteps = depth + longestPathFrom(flow, flowState.currentId)

  const advance = () => {
    if (!canAdvance) return
    // Funnel tally (counts only, on-device only): where does onboarding leak?
    track(`onboarding_node_${node.id}`)
    const { goto, set: patch } = resolveNext(node, answers)
    const nextFlow = { ...flowState, ...(patch || {}) }
    if (!goto || goto === 'initialize') {
      setFlowState(nextFlow)
      initialize()
      return
    }
    setFlowState({ ...nextFlow, currentId: goto, visited: [...flowState.visited, goto] })
  }

  const back = () => {
    if (flowState.visited.length <= 1) return
    const visited = flowState.visited.slice(0, -1)
    setFlowState({ ...flowState, currentId: visited[visited.length - 1], visited })
  }

  async function initialize() {
    sealCommit() // INITIALIZE — the first seal, the one success haptic
    setPhase('processing')
    track('onboarding_complete')
    const survey = {
      executionRate7d: answers.executionRate7d,
      timeLeak: answers.timeLeak,
      dangerWindow: answers.dangerWindow,
      anchorHabit: answers.anchorHabit,
      wakeTime: answers.wakeTime,
      peakWindow: answers.peakWindow,
      focusGoal: answers.focusGoal,
      // Dictation: keep only written lines, stamped with ids the editor can key on.
      dayBlocks: answers.dayBlocks
        .filter((b) => b.block && b.block.trim())
        .map((b, i) => ({ id: `dict-${Date.now().toString(36)}-${i}`, time: b.time || '', block: b.block.trim(), impact: b.impact })),
      mission: answers.mission.trim(),
      missionConfidence: answers.missionConfidence,
      counterMove: answers.counterMove,
      modules: answers.modules,
      slipResponse: answers.slipResponse,
      streakModel: answers.streakModel,
      theme: answers.theme,
      healthIntegration: answers.healthIntegration,
      stake: { preference: answers.stakePref, target: answers.stakeTarget },
      consent: { aiProcessing: answers.consent, provider: 'anthropic' },
      createdAt: new Date().toISOString(),
    }
    // Arm the Guardian with day-0 priors BEFORE anything else — the drift
    // sentinel reads this the first time the deck mounts.
    writeGuardianSeed(deriveGuardianSeed(answers))
    // If the user opted into health linking, invoke the native connector now.
    // On device this fires the HealthKit/Health-Connect auth prompt; on web/sim
    // it no-ops (isHealthAvailable false) and the mock streams stand in.
    await linkHealth(survey)
    applyLocally(survey)
    // The book is safe locally from this line on — burn the interview draft.
    try {
      localStorage.removeItem(INTAKE_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    const floor = new Promise((r) => setTimeout(r, 1300)) // keep the opening screen visible
    // TIMEBOXED network (P1): the survey is already saved locally above, so a
    // flaky/paused backend must never strand the user on the Processing screen
    // — 5s each, then the deck opens regardless.
    const timebox = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, ms))])
    await timebox(
      writeProfile(survey, {
        theme_preference: answers.theme,
        streak_model: answers.streakModel,
        stake_preference: answers.stakePref,
        stake_target: answers.stakeTarget,
      }),
      5000
    )
    if (answers.consent) await timebox(buildInitialLayout(), 5000)
    await floor
    window.location.href = '/'
  }

  if (phase === 'processing') return <Processing consent={answers.consent} />
  if (!node) return null

  const renderNode = NODE_RENDERERS[node.type]

  return (
    <div className="relative min-h-screen bg-bg font-sans text-ink">
      <div className="relative mx-auto flex min-h-screen max-w-[520px] flex-col px-6 py-8 pt-safe">
        <div className="flex items-baseline justify-between">
          <div className="font-clock text-[0.8125rem] font-medium tracking-[0.22em]">TELEMETRY</div>
          <Label>opening your book · {String(depth + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}</Label>
        </div>
        {/* progress rule — ink fills the line, drawn against the deepest branch
            still reachable (the same honest total as the counter above) */}
        <div className="mt-4 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={'h-[3px] flex-1 ' + (i <= depth ? 'bg-ink' : 'bg-line')} />
          ))}
        </div>

        {/* node body — remounts per node so ink-settle replays the entry */}
        <div key={node.id} className="animate-data-stream mt-12 flex-1">
          <Step index={String(depth + 1).padStart(2, '0')} tag={node.meta?.tag} title={node.meta?.title} hint={node.meta?.hint}>
            {renderNode ? renderNode(node, answers, set, flowState) : null}
          </Step>
        </div>

        <div className="mt-8 flex items-center gap-3 pb-safe">
          {flowState.visited.length > 1 && (
            <FlashButton onClick={back} className="rounded-md border border-line px-5 py-3.5 font-clock text-[0.75rem] uppercase tracking-widest2 text-muted">
              ← Back
            </FlashButton>
          )}
          {/* NEXT turns the page in ink; INITIALIZE is the seal — the page's
              only lane-red, pressed once. */}
          <FlashButton
            onClick={advance}
            disabled={!canAdvance}
            className={
              'ml-auto rounded-md px-7 py-3.5 font-clock text-[0.8125rem] font-semibold uppercase tracking-widest2 ' +
              (isLast ? 'bg-accent text-accent-ink' : 'bg-ink text-bg')
            }
          >
            {isLast ? 'Initialize →' : 'Next →'}
          </FlashButton>
        </div>
      </div>
    </div>
  )
}

function Step({ index, tag, title, hint, children }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-2">
          <span className="font-clock tnum text-[0.75rem] text-muted">{index}</span>
          {tag && <Label>{tag}</Label>}
        </div>
        <h1 className="m-0 text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
        {hint && <p className="mt-2 text-[0.875rem] leading-relaxed text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Processing({ consent }) {
  const lines = [
    "Setting the guardian's watch…",
    'Ruling the pages…',
    consent ? 'Composing your plan on-device…' : 'Composing the standard protocol…',
    'Preparing the first page…',
  ]
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-6 text-ink">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse-accent" />
        <span className="font-clock text-[0.9375rem] uppercase tracking-[0.24em] text-ink">Opening the book</span>
      </div>
      <div className="flex flex-col gap-1.5 font-clock text-[0.75rem] text-muted">
        {lines.map((l, i) => (
          <span key={i} className="animate-data-stream" style={{ animationDelay: `${i * 220}ms` }}>{l}</span>
        ))}
      </div>
    </div>
  )
}
