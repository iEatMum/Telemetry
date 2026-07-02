// toneEngine.js — psychological mirroring for the Guardian's voice.
//
// The survey types the user's motivational engine (settings.streakModel):
//   avoidance    — protects an unbroken chain; loss framing works BEFORE a loss
//   accumulation — stacks wins; totals only climb
//   engagement   — shows up; consistency over perfection
// Every Guardian-authored line (drift cards, the pre-window warning, the urge
// screen) is written three ways and picked by profile, so the same event reads
// as "don't hand back day 12" to one user and "bank win #38" to another.
//
// TWO HARD RULES (PSYCHOLOGY.md §2 — binding):
//   1. POST-SLIP COPY IS ONE VOICE FOR ALL PROFILES. Loss framing is for
//      PROTECTING a streak, never for indicting a broken one — shame predicts
//      relapse (Randles & Tracy 2013), so 'slipped' deliberately ignores the
//      profile and speaks compassion + redirect. Do not "fix" this.
//   2. Severity shifts REGISTER, not volume. The tone engine never decides to
//      send more notifications — guardianEngine caps that at one per app-day.
//
// Theme adjusts the register at the edges only: terminal keeps the clipped
// scoreboard voice, zen softens imperatives, night_ops runs quiet. The meat of
// the differentiation is the profile, not the theme.
//
// Pure functions, no imports from the store — callers pass the profile in.
// Every string here must clear guardian.screen(); the test suite enforces it.

const MODELS = new Set(['avoidance', 'accumulation', 'engagement'])

function normModel(m) {
  return MODELS.has(m) ? m : 'engagement' // gentlest default when unset
}

// Fill {tokens} from params; unknown tokens render as '—' so a missing param
// can never ship "undefined" to a notification.
function fill(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k]
    return v === 0 || v ? String(v) : '—'
  })
}

// ── The lexicon ──────────────────────────────────────────────────────────────
// slot → streakModel → string (or { title, body } for notification slots).
// Params available: {days} current run, {best} best run in days, {wins} lifetime
// urges outlasted, {window} human label for the vulnerable window ("around 10pm").

const LEXICON = {
  // InsightCard text at WATCH — a forecast, not a verdict.
  'drift.watch': {
    avoidance:
      'Conditions are drifting — the pattern says {window} is the exposed stretch. Day {days} is yours; it stays yours if the phone is out of the room before the window opens.',
    accumulation:
      'Conditions are drifting — {window} is where reps have been lost before. One clean pass through it tonight and the pile grows: {wins} urges outlasted and counting.',
    engagement:
      'Conditions are drifting — {window} has been the hard stretch before. Nothing to win or lose tonight: just show up for the next block and let the window pass.',
  },

  // InsightCard text at CRITICAL — direct, still weather-report framing.
  'drift.critical': {
    avoidance:
      'Multiple signals are stacked against you today — short sleep, a drifting deck, and the {window} window ahead. The chain holds if you make one move now: phone out of the room, then the next scheduled block.',
    accumulation:
      'Multiple signals are stacked today. This is exactly the kind of night a banked win comes from — {wins} outlasted so far, and the setup for the next one is one move: phone out of the room now.',
    engagement:
      'Multiple signals are stacked today. Lower the bar, not the standard: one small block, done, is the whole assignment tonight. The window passes whether or not you fight it.',
  },

  // The single pre-window local notification (native). Action-cued per doctrine.
  'warn.notification': {
    avoidance: {
      title: 'Guardian · day {days} on the line tonight',
      body: 'The {window} stretch is where runs have ended before. Phone out of the room before it opens — that one move protects the chain.',
    },
    accumulation: {
      title: 'Guardian · win #{winsNext} is set up tonight',
      body: 'The {window} stretch has taken reps before. Pass through it clean and it banks — phone out of the room before it opens.',
    },
    engagement: {
      title: 'Guardian · the {window} stretch is coming',
      body: 'It has been the hard window before. You only have to show up for the next block — phone out of the room and let it pass.',
    },
  },

  // UrgeProtocol subtitle while the clock runs.
  'urge.open': {
    avoidance: 'You are not your urge. Day {days} stands as long as you stand. Work the steps.',
    accumulation: 'You are not your urge. {wins} outlasted already — this is the setup for the next one. Work the steps.',
    engagement: 'You are not your urge. All you owe the next 15 minutes is staying. Work the steps.',
  },

  // UrgeProtocol completion line (the WIN).
  'urge.survived': {
    avoidance: 'It passed and the chain held. Day {days} is still yours.',
    accumulation: 'It passed. That banks — {wins} urges outlasted, a number that only climbs.',
    engagement: 'It passed. You stayed, and staying was the whole job.',
  },

  // POST-SLIP — ONE VOICE, ALL PROFILES (see header). Compassion + redirect.
  'urge.slipped': {
    avoidance: 'Logged. The clock restarts; the work does not. Everyone resets — next rep: leave the room, phone stays out tonight.',
    accumulation: 'Logged. The clock restarts; the work does not. Everyone resets — next rep: leave the room, phone stays out tonight.',
    engagement: 'Logged. The clock restarts; the work does not. Everyone resets — next rep: leave the room, phone stays out tonight.',
  },

  // Framing line above the commitment step in a forged protocol.
  'step.commit': {
    avoidance: 'Seal it — the chain is easier to hold with a witness.',
    accumulation: 'Seal it — a witnessed rep counts double in your own book.',
    engagement: 'Seal it — showing up is easier said out loud.',
  },
}

// ── Register shifts (theme) ──────────────────────────────────────────────────
// terminal: clipped scoreboard voice — uppercase notification titles.
// zen: soften — swap hard imperatives for invitations, drop "on the line".
// night_ops: quiet — lowercase titles, no other change.

function shiftRegister(text, theme, { isTitle = false } = {}) {
  let out = text
  if (theme === 'zen') {
    out = out
      .replace(/Work the steps\./g, 'Walk the steps, one at a time.')
      .replace(/on the line tonight/g, 'worth guarding tonight')
      .replace(/that one move protects the chain/g, 'one gentle move keeps it whole')
  }
  if (isTitle && theme === 'terminal') out = out.toUpperCase()
  if (isTitle && theme === 'night_ops') out = out.toLowerCase()
  return out
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * The Guardian's line for a copy slot, mirrored to the user's profile.
 *   voice({ streakModel, theme }, 'drift.watch', { days: 12, window: 'around 10pm' })
 * Returns a string, or { title, body } for 'warn.notification'.
 * Unknown slot → '' (a bad caller can never crash a render).
 */
export function voice(profile = {}, slot, params = {}) {
  const model = normModel(profile.streakModel)
  const theme = profile.theme
  const entry = LEXICON[slot] && LEXICON[slot][model]
  if (!entry) return ''
  if (typeof entry === 'string') return shiftRegister(fill(entry, params), theme)
  return {
    title: shiftRegister(fill(entry.title, params), theme, { isTitle: true }),
    body: shiftRegister(fill(entry.body, params), theme),
  }
}

/** Every slot/model pair flattened — exists so tests can screen ALL copy. */
export function allLines() {
  const out = []
  for (const [slot, models] of Object.entries(LEXICON)) {
    for (const [model, entry] of Object.entries(models)) {
      if (typeof entry === 'string') out.push({ slot, model, text: entry })
      else out.push({ slot, model, text: `${entry.title} ${entry.body}` })
    }
  }
  return out
}

/** 'HH:MM'-ish hour → a human window label ("around 10pm"). */
export function windowLabel(hour) {
  if (hour == null || !Number.isFinite(hour)) return 'the usual stretch'
  const h = ((Math.round(hour) % 24) + 24) % 24
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `around ${h12}${ampm}`
}
