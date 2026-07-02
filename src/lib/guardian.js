// guardian.js — the Guardian's logic, sitting on top of its voice.
//
// Three things:
//   1. expose the persona (the voice lives in guardianPersona.json so Ian can
//      edit it over time — see that file's _README),
//   2. fire a Manual Guardian Alert locally, to feel the tone,
//   3. turn a Handover draft into a 'Consideration' for the Evening Examen.
//
// IMPORTANT — what is and isn't AI yet: synthesizeConsideration() below is a
// PLACEHOLDER. The real Guardian runs the raw handover through the model using
// persona.systemPrompt, SERVER-SIDE via an Edge Function (so no API key ever
// ships in the client). That's the Counsel build. Until then we shape the input
// into an honest, in-voice Consideration deterministically — so the Surrender
// ritual is real and the data flows end to end, with nothing pretending to be
// smarter than it is.

import persona from './guardianPersona.json'
import { showLocalNotification, notificationStatus } from './push.js'

export { persona, notificationStatus }
export const guardianVoice = persona.voice
export const alertTemplates = persona.alertTemplates

// Choose an alert line. With no id, vary by the clock so repeated taps surface
// different lines (no Math.random — it's unavailable in some build contexts and
// not needed here).
export function pickTemplate(id) {
  if (id) return persona.alertTemplates.find((t) => t.id === id) || persona.alertTemplates[0]
  const i = new Date().getSeconds() % persona.alertTemplates.length
  return persona.alertTemplates[i]
}

// Safety backstop. No Guardian-voiced line may carry self-as-bad language — even
// if a template gets hand-edited, or (later) a model generates the text. This
// turns persona.constraints.bannedWords from a promise into something the code
// actually enforces on the live path. Returns { ok, text, banned }.
// NOTE: screen() is a last-ditch TRIPWIRE, not the safety boundary — a fixed word
// list can't catch paraphrased shame. The real guarantee is the system prompt's
// HARD RULES + the canned fallback. Word-boundary match (+ optional plural 's') so
// short faith words like "god"/"sin" are safe to list without matching "good"/"using".
const BANNED = (persona.constraints?.bannedWords || []).map((w) => String(w).toLowerCase())
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const BANNED_RE = BANNED.length ? new RegExp(`\\b(${BANNED.map(escapeRe).join('|')})s?\\b`, 'i') : null
export function screen(text) {
  const t = String(text ?? '')
  const m = BANNED_RE ? t.match(BANNED_RE) : null
  return { ok: !m, text: t, banned: m ? m[1].toLowerCase() : null }
}

// Fire a Guardian notification locally, right now. This is the Manual Guardian
// Alert: it proves the channel works and lets Ian tune the voice. The real,
// remote version (the Guardian speaking while the app is closed) sends the same
// shape from a server via Web Push.
//
// Every line is screened first: if a hand-edited template ever introduces a
// banned word, we REFUSE to send it rather than ship shame to someone in a shame
// cycle. Better silence than a wound.
export async function fireManualAlert(templateId) {
  const t = pickTemplate(templateId)
  const check = screen(`${t.title} ${t.body}`)
  if (!check.ok) return { ok: false, reason: 'blocked', banned: check.banned, template: t }
  const res = await showLocalNotification(t.title, {
    body: t.body,
    data: { url: '/', action: t.id },
  })
  return { ...res, template: t }
}

// PLACEHOLDER (see header). Returns a clean, in-voice Consideration plus a
// `synthesis: 'local'` flag the UI uses to mark it as not-yet-AI.
//
// IMPORTANT: it does NOT quote the raw draft back. The Surrender ritual exists so
// the Guardian CARRIES what you hand over — mirroring your own words (which may be
// self-attacking) back under the Guardian's voice, then re-showing them nightly,
// is the exact shame loop this app fights (PSYCHOLOGY.md §2). So we acknowledge
// the act by its kind and never echo the words. The real, content-aware reading
// happens server-side in the AI Counsel step, where output is also screened.
const ACK = {
  'screen time': 'You handed over the numbers.',
  run: 'You handed over the run.',
  night: 'You handed over the night.',
  note: 'You handed it over.',
}
export function synthesizeConsideration(draft) {
  const kind = draft?.kind || 'note'
  const hasContent = (draft?.body || '').trim().length > 0 || (draft?.attachments?.length || 0) > 0
  const ack = hasContent ? ACK[kind] || ACK.note : 'You handed over a blank page. Showing up still counts.'
  const text = `${ack} That took something. This is data, not a verdict. One move from here: name the cue, set the next rep.`
  // Screen our own output too — belt and suspenders.
  const safe = screen(text)
  return {
    heading: 'Consider',
    source: kind,
    synthesis: 'local',
    text: safe.ok ? text : 'You handed it over. This is data, not a verdict. One move from here: name the cue, set the next rep.',
  }
}
