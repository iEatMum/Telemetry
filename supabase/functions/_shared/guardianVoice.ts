// guardianVoice.ts — the Guardian's voice, server side. The shame screen and the
// Pulse template picker, shared by the counsel + referee functions. Mirrors
// src/lib/guardian.js's screen() so the no-shame rail is enforced on the server
// too, not just the client.
//
// IMPORTANT — screen() is a last-ditch TRIPWIRE, not the safety boundary. It is a
// fixed word-list and cannot catch paraphrased shame ("you keep choosing the
// screen over the man you said you'd be") or every faith-moralizing turn. The
// real guarantee rests on the system prompt's HARD RULES + the canned fallback in
// the counsel function. A future hardening is a cheap LLM-judge pass ("does this
// shame the self or moralize faith? y/n") gating the send. Do not over-trust this.

import persona from './guardianPersona.json' with { type: 'json' }

const BANNED: string[] = ((persona as any).constraints?.bannedWords ?? []).map((w: string) =>
  String(w).toLowerCase(),
)

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word-boundary match (with an optional trailing plural 's') — so we can safely
// list short words like "god" / "sin" without matching "good" / "using".
const BANNED_RE: RegExp | null = BANNED.length
  ? new RegExp(`\\b(${BANNED.map(escapeRe).join('|')})s?\\b`, 'i')
  : null

// Returns { ok, banned }. ok=false means the text carries self-as-bad or
// faith-moralizing language and must NOT be sent — better silence than a wound.
export function screen(text: string): { ok: boolean; banned: string | null } {
  const m = BANNED_RE ? String(text ?? '').match(BANNED_RE) : null
  return { ok: !m, banned: m ? m[1].toLowerCase() : null }
}

interface Template {
  id: string
  title: string
  body: string
}

// The Guardian's line for a negative verdict on a critical checkpoint. A non-hit
// BEDTIME is the high-risk late-night window for this user, so it ALWAYS routes
// to the partner (the "late-screen" template) — partner routing is a property of
// the danger condition, not of which template happens to be picked. Wake routes
// to the Morning face; bedtime to the Examen.
export function pulseFor(kind: string, verdict: string) {
  const templates: Template[] = ((persona as any).alertTemplates ?? []) as Template[]
  const byId = (id: string) => templates.find((t) => t.id === id)

  const t = kind === 'wake' ? byId('morning-cue') : byId('late-screen')
  if (!t) return { ok: false, banned: null, reason: 'no-template' as const }

  const face = kind === 'wake' ? 'morning' : 'examen'
  const safe = screen(`${t.title} ${t.body}`)
  return {
    title: t.title,
    body: t.body,
    url: `/?face=${face}`,
    tag: 'guardian-pulse',
    ok: safe.ok,
    banned: safe.banned,
  }
}

export { persona }
