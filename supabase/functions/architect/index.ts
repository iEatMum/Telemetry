// index.ts — the Architect edge function (P3.4 → P6). Deno, runs on Supabase.
//
// This is the brain of the Generative UI. The client writes the user's
// onboarding DIAGNOSTIC into public.user_profile.survey
// ({ disciplineBaseline, timeLeak, peakWindow, wakeTime, mission, modules,
// consent }). This function turns that into a Server-Driven UI payload built
// ONLY from the allow-listed widgets, and persists it.
//
// TWO PATHS, decided by consent (App Store 5.1.2):
//   • CONSENTED  → Claude generates research + a fully calibrated layout. The
//     system prompt + a server-computed CALIBRATION DIRECTIVE tune schedule
//     density to disciplineBaseline, anchor the day to wakeTime, place the
//     DeepWorkTimer in the peakWindow, and aim the DailyBriefing at the timeLeak.
//   • NOT CONSENTED → NOTHING is sent to Anthropic. A deterministic, rule-based
//     layout is built locally that STILL honors wakeTime + peakWindow + density.
//   • OFFLINE FALLBACK → if the model errors or returns nothing renderable, the
//     same deterministic builder takes over, so a user always gets a usable deck.
//
// SECURITY / PRIVACY
//   • ANTHROPIC_API_KEY lives only in function secrets; never ships to a client.
//   • Deployed WITH JWT verification (the default). We additionally call
//     auth.getUser() so writes are scoped to the authenticated user_id.
//   • ui_layouts / ai_runs are service-role-only at the RLS layer (see 0006);
//     this function is the sole writer.
//   • CONSENT: survey.consent must be { aiProcessing: true, provider: 'anthropic' }
//     for the model path. Anything else → the deterministic path, zero data sent.
//
// Secrets / env (SUPABASE_* are injected automatically):
//   ANTHROPIC_API_KEY            required (the model path; deterministic path no-ops without it only if consented)
//   ARCHITECT_MODEL              optional, defaults to claude-opus-4-8 (the
//                                high-quality route for this heavy, one-time
//                                generation; set to claude-sonnet-4-6 to cut cost)
//   SUPABASE_URL                 injected
//   SUPABASE_ANON_KEY            injected (used to verify the caller's JWT)
//   SUPABASE_SERVICE_ROLE_KEY    injected (used for privileged writes)

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { screen } from '../_shared/guardianVoice.ts'

// Initial generation is heavy, one-time reasoning → route to the high-quality
// tier (Opus 4.8 by default; Ian's "Claude = the CPU" tier). Override with
// ARCHITECT_MODEL=claude-sonnet-4-6 for a cheaper run.
const MODEL = Deno.env.get('ARCHITECT_MODEL') || 'claude-opus-4-8'

// The widget allow-list — MUST stay in sync with src/lib/registry.js. A block
// whose type isn't here is dropped before storage (defense in depth: the client
// also drops unknown types, but we never persist junk).
const KNOWN_TYPES = new Set([
  'ScheduleMatrix',
  'KpiGrid',
  'StatRow',
  'BiometricChart',
  'GoalProgress',
  'DeepWorkTimer',
  'InsightCard',
  'DailyBriefing',
  'EnergyTrendLine',
  'MarketSentimentWidget',
])

const SCHEMA_VERSION = 1

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  v != null && typeof v === 'object' && !Array.isArray(v)

// ── Server-side payload normalizer (mirror of src/lib/uiSchema.js, plus the
//    KNOWN_TYPES allow-list). Drops malformed blocks/tabs instead of throwing,
//    so an off-spec model response can never poison the stored layout. ────────
function normalizeBlock(raw: unknown, index: number) {
  if (!isObj(raw)) return null
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!type || !KNOWN_TYPES.has(type)) return null // allow-list enforced here
  const block: Record<string, unknown> = {
    type,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${type}-${index}`,
    config: isObj(raw.config) ? raw.config : {},
  }
  return block
}

function normalizeTab(raw: unknown, index: number) {
  if (!isObj(raw)) return null
  const key = typeof raw.key === 'string' && raw.key ? raw.key : `tab-${index}`
  const label =
    typeof raw.label === 'string' && raw.label
      ? raw.label
      : key.replace(/^\w/, (c) => c.toUpperCase())
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((b, i) => normalizeBlock(b, i)).filter(Boolean)
    : []
  if (!blocks.length) return null
  return { key, label, blocks }
}

function normalizeLayout(raw: unknown) {
  const src = isObj(raw) ? raw : {}
  const seen = new Set<string>()
  const tabs = (Array.isArray(src.tabs) ? src.tabs : [])
    .map((t, i) => normalizeTab(t, i))
    .filter(Boolean)
    .filter((t) => (seen.has(t!.key) ? false : (seen.add(t!.key), true))) as Array<{
    key: string
    label: string
    blocks: Array<Record<string, unknown>>
  }>

  const defaultTab =
    typeof src.defaultTab === 'string' && tabs.some((t) => t.key === src.defaultTab)
      ? src.defaultTab
      : tabs[0]?.key || null

  const schemaVersion = Number.isInteger(src.schemaVersion as number)
    ? (src.schemaVersion as number)
    : SCHEMA_VERSION

  return { schemaVersion, defaultTab, tabs }
}

// Screen every InsightCard's text for shame language — this is a recovery/faith
// app, and AI-authored copy must clear the same bar as the Guardian's voice.
// A tripped card keeps its structure but loses the offending text.
function screenInsightText(layout: { tabs: Array<{ blocks: Array<Record<string, unknown>> }> }) {
  for (const tab of layout.tabs) {
    for (const block of tab.blocks) {
      if (block.type !== 'InsightCard') continue
      const config = (block.config ?? {}) as Record<string, unknown>
      const text = typeof config.text === 'string' ? config.text : ''
      if (text && !screen(text).ok) {
        config.text = 'A pattern is forming in the record. Name the cue, set the next rep.'
        block.config = config
      }
    }
  }
  return layout
}

// ── DIAGNOSTIC SURVEY → CALIBRATION ─────────────────────────────────────────
// The onboarding funnel writes these. Helpers below sanitize them server-side
// (never trust the raw value) and turn them into both (a) a CALIBRATION DIRECTIVE
// injected into the model prompt and (b) the deterministic rule-based layout.

const PEAK_WINDOWS = new Set(['morning', 'midday', 'night'])

// Time-leak key → human phrase used in the DailyBriefing "defending against …".
const TIME_LEAKS: Record<string, string> = {
  'infinite-scrolling': 'infinite scrolling',
  'context-switching': 'context switching',
  'over-planning': 'over-planning',
  fatigue: 'fatigue',
}

// How the deterministic builder structurally counters each leak (briefing copy).
const LEAK_DEFENSE: Record<string, string> = {
  'infinite-scrolling':
    "the phone is parked outside the deep-work block — the feed doesn't get a vote until the work is done.",
  'context-switching':
    'single-threaded blocks with notifications silenced — one task owns each window.',
  'over-planning': 'the plan is locked; today is execution only. Bias to ship.',
  fatigue: 'effort is front-loaded and recovery is protected — no hero late nights.',
}

function clampBaseline(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const i = Math.round(n)
  return i >= 1 && i <= 10 ? i : null
}

function normPeak(v: unknown): 'morning' | 'midday' | 'night' {
  const s = String(v ?? '').toLowerCase().trim()
  return (PEAK_WINDOWS.has(s) ? s : 'morning') as 'morning' | 'midday' | 'night'
}

function normLeakKey(v: unknown): string | null {
  const s = String(v ?? '').toLowerCase().trim()
  return TIME_LEAKS[s] ? s : null
}

function normWake(v: unknown): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim())
  if (!m) return '06:00'
  const h = +m[1]
  const min = +m[2]
  if (h > 23 || min > 59) return '06:00' // out of range → default, never clamp (a clamped 23:59 would degenerate the whole day)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function densityTier(baseline: number | null): 'ramp' | 'standard' | 'elite' {
  if (baseline == null) return 'standard'
  if (baseline < 5) return 'ramp'
  if (baseline >= 8) return 'elite'
  return 'standard'
}

// Psychological-profile signals (0008 / onboarding steps A–C). Sanitized to the
// known enums; null when unset so the directive simply omits that line.
const STREAK_MODELS = new Set(['avoidance', 'accumulation', 'engagement'])
const THEMES = new Set(['terminal', 'zen', 'night_ops'])
const STAKES = new Set(['financial', 'social', 'friction', 'none'])

function normStreakModel(v: unknown): string | null {
  const s = String(v ?? '').toLowerCase().trim()
  return STREAK_MODELS.has(s) ? s : null
}
function normTheme(v: unknown): string | null {
  const s = String(v ?? '').toLowerCase().trim()
  return THEMES.has(s) ? s : null
}
function normStake(v: unknown): string | null {
  // `stake` may be the raw key or the { preference, target } object.
  const raw = isObj(v) ? (v as Record<string, unknown>).preference : v
  const s = String(raw ?? '').toLowerCase().trim()
  return STAKES.has(s) ? s : null
}

// "HH:MM" → minutes-of-day; minutes-of-day → "HH:MM" (wrapped into [0,1440)).
function toMin(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  return m ? +m[1] * 60 + +m[2] : 0
}
function fromMin(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Where the day's deep-work block starts, by peak window (clamped after wake).
function peakStartMin(peak: 'morning' | 'midday' | 'night', wakeMin: number): number {
  if (peak === 'morning') return wakeMin + 60
  if (peak === 'midday') return Math.max(wakeMin + 120, toMin('12:30'))
  return Math.max(wakeMin + 120, toMin('19:30')) // night
}

function deepWorkMinutes(tier: 'ramp' | 'standard' | 'elite'): number {
  return tier === 'ramp' ? 50 : tier === 'elite' ? 110 : 90
}

// The per-user, server-computed directive. Kept out of the static system prompt
// so the model gets exact, unambiguous targets it can't drift from.
function calibrationDirective(survey: Record<string, unknown>): string {
  const baseline = clampBaseline(survey.disciplineBaseline)
  const tier = densityTier(baseline)
  const peak = normPeak(survey.peakWindow)
  const wake = normWake(survey.wakeTime)
  const leakKey = normLeakKey(survey.timeLeak)
  const leak = leakKey ? TIME_LEAKS[leakKey] : null
  const dwMin = deepWorkMinutes(tier)
  const deepAt = fromMin(peakStartMin(peak, toMin(wake)))
  const mission = typeof survey.mission === 'string' ? survey.mission.trim() : ''

  const tierLine =
    tier === 'ramp'
      ? `disciplineBaseline = ${baseline ?? 'unknown'} (LOW) → RAMP density: 4-6 schedule rows, generous buffers (≥30 min between blocks), AT MOST one ◆ high-impact block, and seed 1-2 easy wins (hydrate, short walk, make the bed). DeepWorkTimer ≈ ${dwMin} min. Protect momentum over volume — do NOT overload the day.`
      : tier === 'elite'
        ? `disciplineBaseline = ${baseline} (HIGH) → ELITE density: pack 9-12 schedule rows BACK-TO-BACK with ZERO slack (each block starts when the previous ends), 3-4 ◆ high-impact blocks, and a ${dwMin}-min DeepWorkTimer. Stack secondary work immediately adjacent; treat idle time as waste.`
        : `disciplineBaseline = ${baseline ?? 'unknown'} (MID) → STANDARD density: 6-8 schedule rows, light ~15-min buffers, ~2 ◆ high-impact blocks, and a ${dwMin}-min DeepWorkTimer.`

  // Behavioral calibration — TONE + SCHEDULING STRATEGY from the psych profile.
  const streak = normStreakModel(survey.streakModel)
  const theme = normTheme(survey.theme)
  const stake = normStake(survey.stake)

  const themeLine =
    theme === 'zen'
      ? 'theme = ZEN → calm, encouraging tone; INSERT explicit buffer/recovery rows (a 10-15 min "Breathe / reset" block between major efforts); gentle labels; never pack back-to-back, even at a high baseline.'
      : theme === 'night_ops'
        ? 'theme = NIGHT_OPS → quiet, operational, after-hours tone; bias the hardest ◆ blocks toward later in the day; minimal, low-key copy.'
        : theme === 'terminal'
          ? 'theme = TERMINAL → clipped, militaristic, scoreboard tone (terse imperatives like "EXECUTE", "NO SLACK"); NO buffer rows — fill the day edge-to-edge.'
          : null

  const streakLine =
    streak === 'accumulation'
      ? 'streak_model = ACCUMULATION → frame progress as a rising total that only climbs; emphasize banked/compounding wins; every ◆ adds to the pile.'
      : streak === 'engagement'
        ? 'streak_model = ENGAGEMENT → frame around showing up daily, consistency over perfection; reward contact and de-emphasize perfect runs.'
        : streak === 'avoidance'
          ? "streak_model = AVOIDANCE → frame progress as an unbroken chain to protect; a single miss is the threat (\"don't break it\")."
          : null

  const stakeLine =
    stake === 'financial'
      ? 'stake = FINANCIAL → rigid, binding schedule: hard start times, zero-slack ◆ blocks; the briefing names the money on the line ("your pledge is live"). Treat misses as costly.'
      : stake === 'social'
        ? 'stake = SOCIAL → emphasize the watching partner; the briefing references accountability ("someone sees this"); keep ◆ blocks visible and reportable.'
        : stake === 'friction'
          ? 'stake = FRICTION → frame a miss as triggering a cooldown lockout; nudge toward the easy recovery rep.'
          : stake === 'none'
            ? 'stake = NONE → purely intrinsic; motivate through mastery and the mission — no external-pressure language.'
            : null

  const comboLine =
    stake === 'financial' && theme === 'terminal'
      ? 'COMBINED OVERRIDE (financial + terminal): make the day MAXIMALLY rigid and militaristic — absolute hard times, no buffers anywhere, terse imperative labels, scoreboard framing throughout.'
      : null

  const behaviorLines = [themeLine, streakLine, stakeLine, comboLine].filter(Boolean) as string[]

  const lines = [
    'CALIBRATION DIRECTIVE — build the layout to THESE exact constraints:',
    `- Wake anchor: the ScheduleMatrix MUST begin with a "Wake" row at ${wake} (status "hit"); the whole day flows from it.`,
    `- ${tierLine}`,
    `- peakWindow = ${peak.toUpperCase()}: place the DeepWorkTimer AND the hardest ◆ rows in this window. DeepWorkTimer.config.at MUST equal "${deepAt}" and highImpact MUST be true.`,
    leak
      ? `- timeLeak = ${leak}: the FIRST DailyBriefing driver MUST name the defense (start it with "Defending against ${leak} —"), and the schedule should structurally counter it.`
      : '- No specific timeLeak reported — keep the briefing focused on the mission.',
    mission
      ? `- mission = "${mission.slice(0, 160)}": orient the ◆ high-impact blocks toward it.`
      : '- No mission text — keep blocks generic but on-protocol.',
  ]
  if (behaviorLines.length) {
    lines.push(
      'BEHAVIORAL CALIBRATION — tune TONE and SCHEDULING STRATEGY to the user psychology:',
      ...behaviorLines.map((l) => `- ${l}`),
    )
  }
  return lines.join('\n')
}

// Minimal research profile for the deterministic path (no model = no AI summary).
function deterministicResearch(survey: Record<string, unknown>) {
  const peak = normPeak(survey.peakWindow)
  const wake = normWake(survey.wakeTime)
  const tier = densityTier(clampBaseline(survey.disciplineBaseline))
  const leakKey = normLeakKey(survey.timeLeak)
  const modules = (isObj(survey.modules) ? survey.modules : {}) as Record<string, unknown>
  return {
    chronotype: peak === 'morning' ? 'early' : peak === 'night' ? 'late' : 'neutral',
    recommendedWake: wake,
    focusAreas: [tier, `${peak} peak`, leakKey ? `vs ${TIME_LEAKS[leakKey]}` : null].filter(Boolean),
    moduleFlags: { recovery: modules.recovery === true, faith: modules.faith === true },
    summary: `Deterministic ${tier} plan anchored at ${wake} with deep work in the ${peak} window.`,
    source: 'deterministic',
  }
}

// The rule-based layout. Used when consent is off (nothing sent to Anthropic) and
// as the offline fallback when the model is unavailable. Always returns a valid,
// renderable layout that honors wakeTime + peakWindow + density.
function deterministicLayout(survey: Record<string, unknown>) {
  const baseline = clampBaseline(survey.disciplineBaseline)
  const tier = densityTier(baseline)
  const peak = normPeak(survey.peakWindow)
  const wake = normWake(survey.wakeTime)
  const wakeMin = toMin(wake)
  const leakKey = normLeakKey(survey.timeLeak)
  const leak = leakKey ? TIME_LEAKS[leakKey] : null
  const modules = (isObj(survey.modules) ? survey.modules : {}) as Record<string, unknown>
  const faith = modules.faith === true
  const recovery = modules.recovery === true
  const mission = typeof survey.mission === 'string' ? survey.mission.trim() : ''
  const dwMin = deepWorkMinutes(tier)
  const deepStart = peakStartMin(peak, wakeMin)
  const deepLabel = mission ? `Deep Work · ${mission.slice(0, 40)}` : 'Deep Work'
  const peakLabel = peak.charAt(0).toUpperCase() + peak.slice(1)

  // Wind-down anchor (the survey has no bedtime): ~16h after wake, capped to
  // 22:30, and always at least 90 min after the deep-work block finishes.
  let windDown = Math.min(wakeMin + 16 * 60, toMin('22:30'))
  if (windDown <= deepStart + dwMin + 60) windDown = deepStart + dwMin + 90

  // Candidate rows (minute-of-day). Density + easy-wins are chosen per tier; the
  // deep-work block is anchored to the peak window.
  const raw: Array<{ min: number; block: string; status: string; impact?: boolean }> = []
  const add = (min: number, block: string, status = 'open', impact = false) =>
    raw.push({ min, block, status, impact })

  add(wakeMin, 'Wake', 'hit')
  if (tier === 'ramp') {
    add(wakeMin + 15, 'Hydrate + sunlight')
    add(wakeMin + 45, 'Breakfast · unhurried')
    add(deepStart, deepLabel, 'open', true)
    add(deepStart + dwMin + 45, 'Walk · reset')
    add(windDown, 'Phone down')
  } else if (tier === 'elite') {
    add(wakeMin + 5, 'Cold + hydrate')
    add(wakeMin + 25, 'Train · hard', 'open', true)
    add(wakeMin + 85, 'Fuel + set targets')
    add(deepStart, deepLabel, 'open', true)
    add(deepStart + dwMin, 'Block 2 · execute', 'open', true)
    add(deepStart + dwMin + 100, 'Admin · sprint')
    add(deepStart + dwMin + 160, 'Train 2 / mobility', 'open', true)
    add(windDown - 45, 'Review + shutdown')
    add(windDown, 'Phone down')
  } else {
    add(wakeMin + 20, 'Movement')
    add(wakeMin + 55, 'Plan + breakfast')
    add(deepStart, deepLabel, 'open', true)
    add(deepStart + dwMin + 15, 'Second block', 'open', true)
    add(deepStart + dwMin + 150, 'Train / lift')
    add(windDown, 'Phone down')
  }

  // Sort, then nudge collisions so times stay strictly rising. We do NOT clamp to
  // end-of-day: clamping would pile every late row onto 23:59 (duplicate, non-
  // rising times). Minutes are allowed to run past 1440 and fromMin() wraps them,
  // so a pathological late wake just rolls the tail past midnight — and the
  // schedule row + DeepWorkTimer.at (both derived from these minutes) still agree.
  raw.sort((a, b) => a.min - b.min)
  let prev = -1
  for (const r of raw) {
    r.min = Math.max(0, r.min)
    if (r.min <= prev) r.min = prev + 5
    prev = r.min
  }

  const schedRows = raw.map((r) => {
    const row: Record<string, unknown> = { time: fromMin(r.min), block: r.block, status: r.status }
    if (r.impact) row.impact = 'high'
    return row
  })
  const hiCount = raw.filter((r) => r.impact).length

  // The deep-work block's FINAL (post-nudge) minute. The DeepWorkTimer face and
  // its ScheduleMatrix row must show the same start, so both read from here.
  const deepRow = raw.find((r) => r.block === deepLabel)
  const deepAtMin = deepRow ? deepRow.min : deepStart
  const deepAt = fromMin(deepAtMin)
  const deepEnd = fromMin(deepAtMin + dwMin)

  const drivers: Array<{ tone: string; text: string }> = []
  if (leakKey) drivers.push({ tone: 'warn', text: `Defending against ${leak} — ${LEAK_DEFENSE[leakKey]}` })
  drivers.push({
    tone: 'muted',
    text: mission
      ? `Day built around your mission: ${mission}. Finish the ◆ blocks and tomorrow adapts to what you actually did.`
      : 'Baseline plan generated from your survey. Finish the ◆ blocks and tomorrow adapts to what you actually did.',
  })

  const today = {
    key: 'today',
    label: 'Today',
    blocks: [
      {
        type: 'DailyBriefing',
        id: 'today-briefing',
        config: {
          date: 'Day 1',
          stats: [
            { label: 'Baseline', value: baseline != null ? `${baseline}/10` : '—', tone: 'muted' },
            { label: 'Window', value: peakLabel, tone: 'muted' },
            { label: 'Mode', value: tier.toUpperCase(), tone: 'muted' },
          ],
          drivers,
        },
      },
      { type: 'ScheduleMatrix', id: 'today-sched', config: { title: 'Today', rows: schedRows } },
      {
        type: 'DeepWorkTimer',
        id: 'today-focus',
        config: {
          label: 'Anchor · Deep Work',
          minutes: dwMin,
          at: deepAt,
          highImpact: true,
          note: `${deepAt}–${deepEnd} · phone in another room.`,
        },
      },
      {
        type: 'GoalProgress',
        id: 'today-goals',
        config: {
          title: 'Targets',
          items: [
            ...(mission ? [{ label: 'Mission', value: 0, max: 1, right: mission.slice(0, 40), tone: 'accent' }] : []),
            { label: '◆ blocks done', value: 0, max: Math.max(1, hiCount), right: `0 / ${hiCount} ◆`, tone: 'pos' },
          ],
        },
      },
    ],
  }

  const trends = {
    key: 'trends',
    label: 'Trends',
    blocks: [
      {
        type: 'KpiGrid',
        id: 'trend-kpis',
        config: {
          cols: 2,
          items: [
            { label: 'Baseline', value: baseline != null ? `${baseline}` : '—', unit: '/10', accent: true },
            { label: 'Focus mode', value: tier.toUpperCase() },
          ],
        },
      },
      {
        type: 'StatRow',
        id: 'trend-stats',
        config: {
          title: 'Engine',
          cols: 3,
          items: [
            { label: 'Wake', value: wake },
            { label: 'Peak', value: peakLabel },
            { label: 'Deep work', value: `${dwMin}m` },
          ],
        },
      },
    ],
  }

  const tabs: Array<Record<string, unknown>> = [today, trends]

  // Module-gated content (opt-in only). Wording is supportive, non-clinical, and
  // non-inflammatory; screenInsightText() is a final tripwire over all of it.
  if (recovery || faith) {
    const mind: Array<Record<string, unknown>> = []
    if (recovery)
      mind.push({
        type: 'InsightCard',
        id: 'mind-recovery',
        config: {
          heading: 'Recovery',
          source: 'protocol · private',
          text: 'Support is on, and it stays private and non-clinical. When the pull spikes, the move is delay plus distance — step away, start the timer, let the wave pass.',
          tone: 'accent',
        },
      })
    if (faith)
      mind.push({
        type: 'InsightCard',
        id: 'mind-faith',
        config: {
          heading: 'Reflection',
          source: 'opt-in',
          text: 'A minute of stillness before the first block — one breath of gratitude, then go.',
          tone: 'accent',
        },
      })
    tabs.push({ key: 'mind', label: 'Mind', blocks: mind })
  }

  return { schemaVersion: SCHEMA_VERSION, defaultTab: 'today', tabs }
}

// The contract we hand the model. Kept verbose on purpose: the model only ever
// emits DATA against these exact widgets — it can never introduce a new type.
const SYSTEM_PROMPT = `You are the Architect for LOCKED IN, a daily-discipline app with a terminal/scoreboard aesthetic. You turn a user's onboarding diagnostic into (1) a compact "research" profile and (2) a Server-Driven UI layout, precisely calibrated to that user.

OUTPUT: respond with ONE JSON object and nothing else — no markdown, no prose, no code fences. Shape:
{
  "research": {
    "chronotype": "early" | "neutral" | "late",
    "recommendedWake": "HH:MM",
    "focusAreas": string[],          // 2-4 short tags, e.g. ["deep work","sleep"]
    "moduleFlags": { "recovery": boolean, "faith": boolean },
    "summary": string                // one sentence, plain, non-clinical
  },
  "layout": {
    "schemaVersion": 1,
    "defaultTab": "today",
    "tabs": [ { "key": string, "label": string, "blocks": Block[] } ]
  }
}

A Block is { "type": <WidgetType>, "id": string, "config": object }. The ONLY allowed WidgetTypes and their config shapes:
- ScheduleMatrix  config: { title?, rows: [{ time:"HH:MM", block:string, status:"hit"|"done"|"late"|"missed"|"open"|"skip", impact?:"high", delta?:{ value:string, dir:"up"|"down"|"flat" } }] }   // set impact:"high" on the hardest rows — they get a ◆ marker and are tracked for the daily score
- KpiGrid         config: { title?, cols?:number, items: [{ label, value:string, unit?, delta?:number, deltaSuffix?, spark?:number[], sparkTone?:"neg", accent?:boolean }] }
- StatRow         config: { title?, cols?:number, items: [{ label, value:string, delta?:number, deltaSuffix?, accent?:boolean }] }
- BiometricChart  config: { label, value?, unit?, delta?:number, deltaSuffix?, tone?:"accent"|"pos"|"neg"|"warn", data:number[] }
- GoalProgress    config: { title?, items: [{ label, value:number, max:number, right?:string, tone?:"accent"|"pos"|"warn"|"neg" }] }
- DeepWorkTimer   config: { label, minutes:number, at?:"HH:MM", highImpact?:boolean, note? }   // at = the block's START time (used to schedule a device reminder); set highImpact:true for the day's anchor focus block
- InsightCard     config: { heading?, source?, text:string, tone?:"accent"|"warn"|"neg" }
- DailyBriefing   config: { date?, stats: [{ label, value:string, tone:"pos"|"neg"|"warn"|"muted" }], drivers: [{ tone, text }] }   // each driver renders as an "AI:" line
- EnergyTrendLine config: { label?, unit?, points: [{ t:string, v:number }], now?:number, open?:number, avg?:number, ticks?:number, caption?:boolean }
- MarketSentimentWidget config: { label?, status?, sentiment: { score:number(0..100) }, tickers: [{ symbol, last:string, changePct:number, focus?:boolean }] }

CALIBRATION PROTOCOL — read these survey fields and shape the day to them:
- wakeTime → the ScheduleMatrix's first row is "Wake" at exactly this time; everything flows from it.
- disciplineBaseline (1-10) → schedule DENSITY:
    • 1-4 (low): fewer rows, generous buffers (≥30 min), at most one ◆ high-impact block, seed easy wins. Protect momentum; never overload.
    • 5-7 (mid): moderate density, ~15-min buffers, ~2 ◆ blocks.
    • 8-10 (high): pack the matrix back-to-back with ZERO slack, 3-4 ◆ blocks, longer deep-work. Treat idle time as waste.
- peakWindow ("morning"|"midday"|"night") → place the DeepWorkTimer and the hardest ◆ rows IN this window; set DeepWorkTimer.at to that start time and highImpact:true.
- timeLeak → the FIRST DailyBriefing driver MUST name the defense against it (e.g. "Defending against context switching — …") and the schedule should structurally counter it.
- mission → orient the ◆ high-impact blocks toward it.
The exact computed numbers for THIS user arrive in the user message as a CALIBRATION DIRECTIVE — follow them precisely; they override any general guidance here.

RULES:
- Use ONLY the widget types above. Never invent a type or a config key.
- Build the layout from the DIAGNOSTIC. Set targets/labels from what the user told you. This is an initial scaffold; trend arrays (spark/data/points) may be short and neutral or empty — do not fabricate long histories presented as real.
- Always include a "today" tab as defaultTab with a ScheduleMatrix. Add 1-3 more tabs only if the diagnostic supports them.
- RECOVERY content: include ONLY if research.moduleFlags.recovery is true (i.e. the survey opted in). Frame strictly as wellness/self-help. NEVER make medical claims, never imply diagnosis or treatment/cure, never reference explicit content. Keep it supportive and non-shaming.
- FAITH content: include ONLY if research.moduleFlags.faith is true. Keep it accurate, opt-in, and non-inflammatory; never required to use the app.
- VOICE: data, not verdict. Never shame the user. No clinical or diagnostic language. InsightCard text must be supportive and concrete.
- Keep it tight: aim for 1-4 tabs, 2-5 blocks per tab.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Optional body: `regenerate` forces a fresh build; a `performance` payload
  // (engagement telemetry from closeDay) triggers a REFACTOR from yesterday and
  // feeds its human-readable signals into the prompt. Parsed up front because the
  // nightly (server-to-server) auth path below reads `user_id` from it.
  let body: { regenerate?: boolean; performance?: unknown; user_id?: unknown } = {}
  try {
    body = req.method === 'POST' ? await req.json() : {}
  } catch {
    body = {}
  }

  // 1) Identify the caller. TWO auth paths:
  //   • CLIENT  — a user JWT in Authorization (default). user_id comes from the
  //     VERIFIED token; a body-supplied id is never trusted on this path.
  //   • NIGHTLY — the architect-nightly orchestrator (0011) fanning out the nightly
  //     re-composition. It presents `x-cron-secret === CRON_SECRET` and names the
  //     target `user_id` in the body. The secret IS the authorization — it lives
  //     only in function secrets + the cron job (Vault), never on a client. If
  //     CRON_SECRET is unset the path is impossible (empty string !== empty string
  //     is false), so this can never weaken the default JWT gate.
  const cronSecret = req.headers.get('x-cron-secret') || ''
  const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
  const isCron = CRON_SECRET.length > 0 && cronSecret === CRON_SECRET

  let userId: string
  if (isCron) {
    const bid = typeof body.user_id === 'string' ? body.user_id.trim() : ''
    if (!bid) return json({ error: 'cron call missing user_id' }, 400)
    userId = bid
  } else {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) return json({ error: 'missing Authorization' }, 401)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)
    userId = user.id
  }

  // Nightly runs are always a refactor — that's the whole point (recompute tomorrow).
  const regenerate = body?.regenerate === true || isCron
  const performance = isObj(body?.performance) ? (body!.performance as Record<string, unknown>) : null
  const perfSignals =
    performance && Array.isArray(performance.signals)
      ? (performance.signals as unknown[]).slice(0, 12).map((s) => String(s).slice(0, 240))
      : []
  const wantsRefactor = regenerate || perfSignals.length > 0

  // 2) Service-role client for all privileged reads/writes.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // 3) Read the user's profile (survey is client-written; research we author).
  const { data: profile, error: profErr } = await admin
    .from('user_profile')
    .select('survey, research, profile_version, theme_preference, streak_model, stake_preference, stake_target')
    .eq('user_id', userId)
    .maybeSingle()
  if (profErr) return json({ error: 'profile read failed' }, 500)

  const survey = (profile?.survey ?? {}) as Record<string, unknown>
  if (!isObj(survey) || Object.keys(survey).length === 0) {
    return json({ error: 'no survey on file — complete onboarding first' }, 400)
  }

  // Backfill the psychological-profile signals from the 0008 columns when the
  // survey jsonb didn't carry them (e.g. set later in Settings, not onboarding).
  const prow = (profile ?? {}) as Record<string, unknown>
  if (survey.theme == null && prow.theme_preference != null) survey.theme = prow.theme_preference
  if (survey.streakModel == null && prow.streak_model != null) survey.streakModel = prow.streak_model
  if (survey.stake == null && prow.stake_preference != null) {
    survey.stake = { preference: prow.stake_preference, target: prow.stake_target ?? {} }
  }

  // 4) CONSENT (App Store 5.1.2). Consent selects the PATH — it is not a hard
  //    failure. Consented → Claude; not consented → deterministic, zero data sent.
  const consent = (survey.consent ?? {}) as Record<string, unknown>
  const consented =
    consent.aiProcessing === true &&
    String(consent.provider ?? '').toLowerCase() === 'anthropic'

  const currentVersion = Number.isInteger(profile?.profile_version)
    ? (profile!.profile_version as number)
    : 0

  // 5) Idempotency / cost control: reuse the existing active layout unless the
  //    caller explicitly asks to regenerate or sends performance telemetry to
  //    refactor from. "Generate once" by default — applies to both paths.
  //    (To upgrade a deterministic layout after the user later grants consent,
  //    the client calls with { regenerate: true }.)
  if (!wantsRefactor) {
    const { data: existing } = await admin
      .from('ui_layouts')
      .select('payload, profile_version')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (existing?.payload) {
      return json({
        ok: true,
        reused: true,
        profileVersion: existing.profile_version ?? currentVersion,
        layout: existing.payload,
      })
    }
  }

  // 6) Build research + layout. Consented → Claude (only the survey is sent, and
  //    only after the consent check). Not consented → deterministic, nothing sent.
  //    A model error/empty result falls back to deterministic (offline fallback).
  let research: Record<string, unknown> = {}
  let rawLayout: unknown = null
  let inputTokens = 0
  let outputTokens = 0
  let mode: 'anthropic' | 'deterministic' | 'deterministic_fallback' = 'deterministic'
  let usedModel = 'deterministic'

  if (consented) {
    if (!apiKey) {
      // Consented but the key is missing → don't fail the user; build locally.
      console.error('[architect] ANTHROPIC_API_KEY not set — deterministic fallback')
      rawLayout = deterministicLayout(survey)
      research = deterministicResearch(survey)
      mode = 'deterministic_fallback'
    } else {
      try {
        const client = new Anthropic({ apiKey })
        const directive = calibrationDirective(survey)
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content:
                `Here is the user's consented onboarding diagnostic as JSON. Build their research profile and ${
                  perfSignals.length ? 'REFACTOR their' : 'starting'
                } layout.\n\nSURVEY:\n${JSON.stringify(survey)}\n\n${directive}` +
                (perfSignals.length
                  ? `\n\nYesterday's engagement signals — promote what they used, demote what they ignored, and adjust ◆ high-impact blocks accordingly:\n- ${perfSignals.join(
                      '\n- ',
                    )}`
                  : ''),
            },
          ],
        })
        inputTokens = msg.usage?.input_tokens ?? 0
        outputTokens = msg.usage?.output_tokens ?? 0
        const text = (msg.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('')
          .trim()
        const parsed = extractJson(text)
        if (!isObj(parsed)) throw new Error('model did not return a JSON object')
        research = isObj(parsed.research) ? parsed.research : {}
        rawLayout = parsed.layout
        mode = 'anthropic'
        usedModel = MODEL
      } catch (err) {
        console.error('[architect] LLM generation failed — deterministic fallback:', (err as Error)?.message)
        rawLayout = deterministicLayout(survey)
        research = deterministicResearch(survey)
        mode = 'deterministic_fallback'
      }
    }
  } else {
    rawLayout = deterministicLayout(survey)
    research = deterministicResearch(survey)
    mode = 'deterministic'
  }

  // 7) Normalize + safety-screen. If a model layout has no renderable tabs, fall
  //    back to deterministic before giving up — never store an unrenderable payload.
  let layout = screenInsightText(normalizeLayout(rawLayout))
  if (!layout.tabs.length && mode === 'anthropic') {
    console.error('[architect] model layout had no renderable tabs — deterministic fallback')
    layout = screenInsightText(normalizeLayout(deterministicLayout(survey)))
    research = deterministicResearch(survey)
    mode = 'deterministic_fallback'
    usedModel = 'deterministic'
  }
  if (!layout.tabs.length) {
    console.error('[architect] no renderable layout after fallback')
    return json({ error: 'generation produced no renderable layout' }, 502)
  }

  // Cost/audit row (best-effort — a logging failure must not fail the run).
  // Written HERE, before the profile/layout persistence below, so any tokens the
  // model already billed are recorded even if a downstream DB write fails.
  try {
    await admin.from('ai_runs').insert({
      id: `architect-${crypto.randomUUID()}`,
      user_id: userId,
      purpose: mode === 'anthropic' ? 'architect' : 'architect_deterministic',
      model: usedModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
  } catch (err) {
    console.error('[architect] ai_runs log failed (non-fatal):', (err as Error)?.message)
  }

  const newVersion = currentVersion + 1
  const nowIso = new Date().toISOString()

  // 8) Persist research on the profile. updated_at=now() clears the lww_guard
  //    (any value >= the stored one is accepted). Upsert keyed on user_id.
  const { error: upErr } = await admin.from('user_profile').upsert(
    {
      user_id: userId,
      research,
      profile_version: newVersion,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' },
  )
  if (upErr) {
    console.error('[architect] profile write failed:', upErr.message)
    return json({ error: 'profile write failed' }, 500)
  }

  // 9) Swap the active layout. Deactivate the old one FIRST so the partial unique
  //    index (one active row per user) is never violated, then insert the new.
  const { error: deErr } = await admin
    .from('ui_layouts')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  if (deErr) {
    console.error('[architect] deactivate failed:', deErr.message)
    return json({ error: 'layout swap failed' }, 500)
  }

  const layoutId = `architect-${newVersion}-${crypto.randomUUID()}`
  const { error: insErr } = await admin.from('ui_layouts').insert({
    id: layoutId,
    user_id: userId,
    payload: layout,
    schema_version: SCHEMA_VERSION,
    profile_version: newVersion,
    is_active: true,
  })
  if (insErr) {
    console.error('[architect] layout insert failed:', insErr.message)
    return json({ error: 'layout insert failed' }, 500)
  }

  return json({ ok: true, reused: false, mode, profileVersion: newVersion, layout })
})

// Pull the first JSON object out of the model's text, tolerating stray code
// fences or leading prose. Returns the parsed value or null.
function extractJson(text: string): unknown {
  if (!text) return null
  let t = text.trim()
  // strip ```json ... ``` or ``` ... ``` fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  // fall back to the outermost brace span
  if (t[0] !== '{') {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    t = t.slice(start, end + 1)
  }
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}
