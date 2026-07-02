// index.ts — the AI Counsel edge function. Deno, runs on Supabase.
//
// The Guardian's brain, server side. The client detects a drift PATTERN over the
// witnessed checkpoints (src/lib/counsel.js) and POSTs it here. This function
// cross-references the pattern with the curated Library + the Guardian persona,
// asks the model to synthesize a single "Consider" insight in the Guardian's
// voice, screens it for shame, and returns a formatted card the UI renders.
//
// SECURITY: the ANTHROPIC_API_KEY lives ONLY in function secrets — it never
// ships to the client. This function is deployed WITH JWT verification (the
// default), so only the signed-in user can call it. It does no DB writes and
// reads nothing privileged. The pattern arrives in the body: its `key` is
// allow-listed and its `summary` is app-generated + length-capped. The one
// user-authored value, `partnerName`, is clamped AND screened before it touches
// the prompt — so no raw free text of his own can be echoed back.
//
// Secrets:
//   ANTHROPIC_API_KEY     required
//   COUNSEL_MODEL         optional, defaults to claude-opus-4-8 (your call to change)

import Anthropic from 'npm:@anthropic-ai/sdk'
import persona from '../_shared/guardianPersona.json' with { type: 'json' }
import library from '../_shared/counselLibrary.json' with { type: 'json' }
import { screen } from '../_shared/guardianVoice.ts'

const MODEL = Deno.env.get('COUNSEL_MODEL') || 'claude-opus-4-8'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

interface Pattern {
  key?: string
  severity?: string
  count?: number
  danger?: boolean
  summary?: string
}

// Same resource selection as the client: best-tagged, then a `general` fallback.
function selectResource(patternKey: string) {
  const all = (library as any).resources ?? []
  const tagged = all.filter((r: any) => (r.tags ?? []).includes(patternKey))
  if (tagged.length) return tagged[0]
  const general = all.filter((r: any) => (r.tags ?? []).includes('general'))
  return general[0] ?? all[0] ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let payload: { pattern?: Pattern; partnerName?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }

  const pattern = payload.pattern
  const KNOWN_KEYS = ['late-wake', 'missed-bedtime', 'evening-drift', 'consistency', 'general']
  if (
    !pattern ||
    typeof pattern.key !== 'string' ||
    !KNOWN_KEYS.includes(pattern.key) ||
    typeof pattern.summary !== 'string'
  ) {
    return json({ error: 'missing/invalid pattern' }, 400)
  }
  const summary = pattern.summary.slice(0, 240) // cap the one client-supplied string

  // partnerName is the ONLY user-authored value that reaches the prompt. Clamp it
  // AND screen it, so a banned word can't ride in through the partner's name.
  const rawPartner = (payload.partnerName || '').toString().slice(0, 60)
  const partnerName = rawPartner && screen(rawPartner).ok ? rawPartner : 'your partner'

  const resource = selectResource(pattern.key)

  // Build the prompt. The model writes ONLY the card text — the resource is
  // selected deterministically above and attached after. The pattern summary is
  // app-generated (no free text) and capped; partnerName is the one user-authored
  // value and is clamped + screened above. So nothing of his own raw words can be
  // echoed back.
  const dangerNote = pattern.danger
    ? `This is a DANGER pattern (the late-night high-risk window). You MUST route him to ${partnerName} (text one line, before — not after) AND keep one concrete 60-second action. Do not leave him alone with willpower.`
    : `End with one concrete action he can take in the next 24 hours.`

  const userPrompt = [
    `A drift has shown up in the witnessed record. Write a single short "Consider" card for tonight's Examen — one or two sentences, in your voice.`,
    ``,
    `The pattern: ${summary}`,
    `${dangerNote}`,
    ``,
    resource
      ? `Point him toward this one resource for the next 24 hours (name it naturally; do not invent a different one): "${resource.title}" by ${resource.by} (${resource.type}).`
      : `No resource is available; just give the framing and the action.`,
    ``,
    `Remember the HARD RULES: data not verdict, never shame, never quote his own words, never moralize about faith. Output ONLY the card text — no preamble, no quotes, no markdown.`,
  ].join('\n')

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: (persona as any).systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = (msg.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim()

    // Final safety gate: never ship a banned word, even from the model.
    const safe = screen(text)
    let cardText = safe.ok && text
      ? text
      : `A pattern is forming in the record. ${pattern.danger ? `Text ${partnerName} one line tonight — before, not after — and put the phone in the other room.` : 'Name the cue, set the next rep.'}`
    // Re-screen the chosen text — the fallback too. If it still trips (shouldn't,
    // since partnerName is screened), drop to a partner-name-free constant.
    if (!screen(cardText).ok) {
      cardText = pattern.danger
        ? 'A pattern is forming in the record. Reach out to your corner tonight — before, not after — and put the phone in the other room.'
        : 'A pattern is forming in the record. Name the cue, set the next rep.'
    }

    return json({
      heading: 'Consider',
      source: 'counsel',
      synthesis: 'ai',
      pattern: pattern.key,
      danger: !!pattern.danger,
      text: cardText,
      resource: resource
        ? { type: resource.type, title: resource.title, by: resource.by, url: resource.url || '' }
        : null,
    })
  } catch (err) {
    // Fail soft — the client keeps its local rule-based card. Log the detail
    // server-side rather than returning it (the client discards it anyway).
    console.error('[counsel] synthesis failed:', (err as Error)?.message)
    return json({ error: 'synthesis failed' }, 502)
  }
})
