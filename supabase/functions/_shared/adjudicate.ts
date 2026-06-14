// adjudicate.ts — the pure heart of the Referee. No Deno, no network, no I/O,
// so it's unit-testable on its own (and reusable by a future scheduled checker).
//
// Given a checkpoint kind, the user's settings, and an inbound telemetry
// payload, it returns a verdict: hit | late | missed.
//
// "Deadline" semantics: every target is a "by this time" deadline — be awake BY
// 06:45; phone down BY 22:15. On time / early = hit; a little past = late; well
// past = missed. (Gollwitzer 2006: the cue->target pair is fixed in advance; the
// referee only measures Actual against Target — it never negotiates.)

export type Verdict = 'hit' | 'late' | 'missed'

export interface CheckpointKind {
  field: string // which settings field holds the target 'HH:MM'
  label: string
  fallback: string // default target if settings is missing the field
  graceMin: number // delta <= grace  => hit
  lateMin: number // delta <= late   => late, else missed
  wraps?: boolean // deadline can legitimately land after midnight (bedtime)
}

// The kinds the Referee understands today. Apple Shortcuts sends `kind`.
export const KINDS: Record<string, CheckpointKind> = {
  wake: { field: 'wakeTime', label: 'Wake-up', fallback: '06:45', graceMin: 0, lateMin: 15 },
  bedtime: { field: 'bedTime', label: 'Phone down', fallback: '22:15', graceMin: 0, lateMin: 15, wraps: true },
}

export interface Telemetry {
  kind?: string
  userId?: string
  at?: string // ISO instant (fallback)
  localTime?: string // 'HH:MM' local wall-clock (preferred — no timezone guessing)
  localMinutes?: number
}

export interface Adjudication {
  ok: boolean
  error?: string
  kind?: string
  label?: string
  verdict?: Verdict
  target?: string
  targetMin?: number
  actual?: string
  actualMin?: number
  deltaMin?: number // actual - target (after midnight-wrap normalization)
}

export function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function fmt(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}

// The actual local minutes-of-day from the payload. Prefer explicit local time;
// the ISO `at` fallback reads UTC, so Shortcuts SHOULD send localTime to be exact.
export function actualMinutes(t: Telemetry): number | null {
  if (typeof t.localMinutes === 'number' && isFinite(t.localMinutes)) {
    return ((Math.round(t.localMinutes) % 1440) + 1440) % 1440
  }
  if (typeof t.localTime === 'string') {
    const m = parseHHMM(t.localTime)
    if (m != null) return m
  }
  if (typeof t.at === 'string') {
    const d = new Date(t.at)
    if (!isNaN(d.getTime())) return d.getUTCHours() * 60 + d.getUTCMinutes()
  }
  return null
}

export function adjudicate(t: Telemetry, settings: Record<string, unknown>): Adjudication {
  const kindKey = String(t.kind || '')
  const kind = KINDS[kindKey]
  if (!kind) return { ok: false, error: `unknown kind "${kindKey}"` }

  const fromSettings = settings && typeof settings[kind.field] === 'string' ? (settings[kind.field] as string) : ''
  const targetMin = parseHHMM(fromSettings || kind.fallback)
  if (targetMin == null) return { ok: false, error: `bad target "${fromSettings || kind.fallback}"` }

  const aMin = actualMinutes(t)
  if (aMin == null) return { ok: false, error: 'no usable timestamp (send localTime "HH:MM")' }

  // Deadline delta. For wrapping deadlines (bedtime), an "actual" in the small
  // hours belongs to the previous night — push it PAST the deadline, not before.
  let delta = aMin - targetMin
  if (kind.wraps && delta < -720) delta += 1440

  let verdict: Verdict
  if (delta <= kind.graceMin) verdict = 'hit'
  else if (delta <= kind.lateMin) verdict = 'late'
  else verdict = 'missed'

  return {
    ok: true,
    kind: kindKey,
    label: kind.label,
    verdict,
    target: fmt(targetMin),
    targetMin,
    actual: fmt(aMin),
    actualMin: aMin,
    deltaMin: delta,
  }
}

// The SMS that goes to accountability partners on a negative verdict.
export function partnerMessage(name: string, adj: Adjudication): string {
  const who = (name || '').trim() || 'Your runner'
  const lateBy = Math.max(0, adj.deltaMin ?? 0)
  if (adj.verdict === 'missed') {
    return `LOCKED IN: ${who} MISSED the ${adj.label} checkpoint (target ${adj.target}, logged ${adj.actual}). A nudge might help.`
  }
  return `LOCKED IN: ${who} was LATE on ${adj.label} — ${lateBy} min past ${adj.target} (logged ${adj.actual}).`
}
