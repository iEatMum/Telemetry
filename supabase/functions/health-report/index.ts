// health-report — the AI health read (V3). Deno, runs on Supabase.
//
// Input: { metrics: { name: number } } — today's HealthKit snapshot, numbers
// only, cleaned client-side AND re-validated here. Output: one short
// plain-language wellness read. HARD CONSTRAINTS: no diagnosis, no medical
// advice, no alarm — patterns and general habits only, and the client prints a
// permanent not-medical-advice disclaimer regardless of what we return.
// Model: Haiku (the counsel cost tier). Screened for shame like every surface.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { screen } from '../_shared/guardianVoice.ts'

const MODEL = Deno.env.get('HEALTH_REPORT_MODEL') || 'claude-haiku-4-5-20251001'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const KNOWN = new Set([
  'sleepHours', 'steps', 'distance', 'flightsClimbed', 'distanceCycling', 'activeCalories',
  'basalCalories', 'totalCalories', 'exerciseTime', 'workouts', 'mindfulness', 'heartRate',
  'restingHeartRate', 'hrv', 'respiratoryRate', 'oxygenSaturation', 'vo2Max', 'bloodPressure',
  'bloodGlucose', 'bodyTemperature', 'weight', 'height', 'bodyFat',
])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let payload: { metrics?: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  const metrics: Record<string, number> = {}
  for (const [k, v] of Object.entries(payload.metrics ?? {})) {
    if (KNOWN.has(k) && typeof v === 'number' && Number.isFinite(v)) metrics[k] = v
  }
  if (!Object.keys(metrics).length) return json({ error: 'no metrics' }, 400)

  const system = [
    'You write a short daily wellness read for a personal-discipline app. You are NOT a clinician and this is NEVER medical advice.',
    'HARD RULES:',
    '- No diagnosis, no disease names, no medication or supplement suggestions, no alarm. If a number looks concerning, say only: "worth mentioning to a clinician" — once, calmly.',
    '- Speak to patterns and general habits (sleep timing, movement, recovery). Data, not verdicts. Never shame; never moralize.',
    '- 3-5 plain sentences, no markdown, no lists, no preamble.',
  ].join('\n')
  const user = `Today's readings (unit-normalized): ${JSON.stringify(metrics)}. Write the read.`

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = (msg.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim()
    if (!text || !screen(text).ok) return json({ error: 'blocked' }, 502)
    return json({ heading: 'Health read', source: 'health-report', synthesis: 'ai', text })
  } catch (err) {
    const detail = `${(err as any)?.status ?? ''} ${String((err as Error)?.message ?? '').slice(0, 140)}`.trim()
    return json({ error: 'synthesis failed', detail }, 502)
  }
})
