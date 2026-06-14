// strava.ts — the pure mapping from a Strava activity to the app's `runs` model.
// No Deno, no network: unit-testable on its own. This is the part the sprint
// cares most about — "distance metric conversions, active duration, timestamps".

export interface StravaActivity {
  id: number
  name?: string
  distance?: number // meters
  moving_time?: number // seconds
  elapsed_time?: number // seconds
  type?: string // legacy: 'Run', 'Ride', ...
  sport_type?: string // 'Run', 'TrailRun', 'VirtualRun', ...
  workout_type?: number | null // run: 0 default, 1 race, 2 long run, 3 workout
  start_date?: string // ISO (UTC)
  start_date_local?: string // ISO in the athlete's local time
  average_heartrate?: number
  suffer_score?: number
  gear?: { name?: string } | null
}

export interface RunRecord {
  id: string
  date: string // 'YYYY-MM-DD'
  type: string
  miles: number
  minutes: number
  rpe: number
  note: string
  shoe: string
  warmup: boolean
  verified: boolean
  source: string
  stravaId: number
}

const METERS_PER_MILE = 1609.344

export function metersToMiles(m: number): number {
  return Math.round((m / METERS_PER_MILE) * 100) / 100
}
export function secondsToMinutes(s: number): number {
  return Math.round((s / 60) * 10) / 10
}

// Deterministic id from the Strava activity id => a re-delivered webhook is an
// idempotent UPSERT, never a duplicate run. (Mirrors Sprint 3's base-36 ids.)
export function runIdFor(activityId: number): string {
  return 'st_' + Math.trunc(activityId).toString(36)
}

// 'YYYY-MM-DD' from start_date_local (already in the athlete's local time).
export function localDate(iso: string): string {
  return String(iso || '').slice(0, 10)
}

export function isRun(a: StravaActivity): boolean {
  const t = String(a.sport_type || a.type || '')
  return t === 'Run' || t === 'TrailRun' || t === 'VirtualRun'
}

export function runType(a: StravaActivity, miles: number): string {
  if (a.workout_type === 1) return 'Race'
  if (a.workout_type === 3) return 'Workout'
  if (a.workout_type === 2 || miles >= 10) return 'Long'
  return 'Easy'
}

export function mapActivityToRun(a: StravaActivity): RunRecord {
  const miles = metersToMiles(Number(a.distance) || 0)
  const minutes = secondsToMinutes(Number(a.moving_time ?? a.elapsed_time) || 0)
  return {
    id: runIdFor(a.id),
    date: localDate(a.start_date_local || a.start_date || ''),
    type: runType(a, miles),
    miles,
    minutes,
    rpe: 0, // Strava has no RPE; left for the athlete to fill in
    note: a.name || 'Strava run',
    shoe: a.gear?.name || '',
    warmup: false,
    verified: true,
    source: 'strava',
    stravaId: Math.trunc(a.id),
  }
}
