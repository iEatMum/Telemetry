// HealthPanel.jsx — the biometrics telemetry center.
//
// Native: today's HealthKit snapshot (steps / sleep / resting HR / HRV) beside
// the personal EWMA baselines the Guardian keeps, plus the readiness band that
// drives the Forgiveness Protocol. Web/simulator: readToday() returns null and
// this degrades to the manual check-in + an honest notice — never fake numbers.
//
// Deliberately NOT a green/red sleep-hours tracker (PSYCHOLOGY.md bans that
// framing): deltas are shown against the user's OWN baseline, data-not-verdict.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { readToday, requestHealthAuth, isHealthAvailable } from '../lib/health.js'
import { readGuardian } from '../lib/guardianEngine.js'
import { calculateReadinessScore } from '../lib/readiness.js'
import { appDayKey } from '../lib/dates.js'
import { Card, SectionLabel, Grid, KpiTile, LedgerNotice, Stat } from '../components/ui.jsx'
import WellnessSheet from '../components/WellnessSheet.jsx'

const READY_TONE = { low: 'text-warn', moderate: 'text-ink', high: 'text-accent' }
const READY_LINE = {
  low: 'Recovery day — the deck reflows heavy blocks to maintenance.',
  moderate: 'Steady. The plan runs as dealt.',
  high: 'Green light. Full send on the ◆ blocks.',
}

export default function HealthPanel() {
  const { wellness, settings, updateSettings } = useStore()
  const [snap, setSnap] = useState(undefined) // undefined = loading, null = unavailable
  const [available, setAvailable] = useState(false)
  const [asking, setAsking] = useState(false)
  // The manual check-in input (WellnessSheet) mounts HERE now — this surface is
  // its only live door since the Morning screen retired (M2). Without it the
  // panel promised a check-in "below" that nothing could actually enter.
  const [checkinOpen, setCheckinOpen] = useState(false)
  useEffect(() => {
    let alive = true
    readToday()
      .then((s) => alive && setSnap(s))
      .catch(() => alive && setSnap(null))
    isHealthAvailable().then((ok) => alive && setAvailable(ok))
    return () => {
      alive = false
    }
  }, [])

  // First-run on a real device: HealthKit read access must be REQUESTED once —
  // nothing else in the app fires the native permission sheet. All-null fields
  // with the SDK available is the "never asked" signature.
  const neverAsked =
    available && snap && snap.steps == null && snap.sleepHours == null && snap.hrv == null && snap.restingHR == null
  async function enableHealth() {
    setAsking(true)
    await requestHealthAuth() // fail-soft; iOS shows the grant sheet
    const fresh = await readToday().catch(() => null)
    setSnap(fresh)
    setAsking(false)
  }

  // The connect switch this surface was missing: a user who skipped (or never
  // saw) onboarding's health step had NO path to link later — the Trends
  // biometrics card just said "not linked" at them forever. Linking writes the
  // same settings.healthIntegration record onboarding writes, and on a real
  // device fires the HealthKit grant sheet; on web/sim the mock streams stand
  // in so the readouts are still walkable.
  const linked = !!settings.healthIntegration?.linked
  async function connectHealth() {
    setAsking(true)
    const hi = {
      ...settings.healthIntegration,
      linked: true,
      providers: ['apple-health'],
      synchronizedMetrics: ['sleep', 'activity', 'heart-rate'],
    }
    try {
      hi.nativeAvailable = await isHealthAvailable()
      const auth = hi.nativeAvailable ? await requestHealthAuth() : { ok: false, reason: 'unavailable' }
      hi.authorized = !!auth?.ok
      hi.lastReason = auth?.reason || null // 'denied' | 'timeout' | 'unavailable' | null
    } catch {
      hi.authorized = false
      hi.lastReason = 'error'
    }
    updateSettings({ healthIntegration: hi })
    const fresh = await readToday().catch(() => null)
    setSnap(fresh)
    setAsking(false)
  }
  // "Connected" was printed even when iOS DECLINED the grant (P3 honesty fix):
  // on a real device with the SDK present but authorized:false, the truthful
  // state is "declined — and here is the one place iOS lets you undo that."
  const declinedOnDevice =
    settings.healthIntegration?.nativeAvailable === true && settings.healthIntegration?.authorized === false
  function disconnectHealth() {
    updateSettings({ healthIntegration: { ...settings.healthIntegration, linked: false } })
  }

  const baselines = readGuardian().baselines || {}
  const today = wellness[appDayKey()] || null
  // No snapshot → no band. Claiming "moderate" with zero data would be a
  // verdict without evidence — the readout stays honest and says so.
  const readiness = snap ? calculateReadinessScore(snap.sleepHours, snap.hrv) : null

  const delta = (val, base) =>
    val != null && base != null ? Math.round((val - base) * 10) / 10 : undefined

  return (
    <div className="space-y-5">
      {/* Apple Health — the connect/disconnect seam for the whole surface */}
      <div>
        <SectionLabel className="mb-2 px-1">Apple Health</SectionLabel>
        {linked ? (
          <Card className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[0.8125rem] text-ink">
              {declinedOnDevice ? 'Health access is off for Telemetry' : 'Connected — sleep, activity, heart-rate'}
              {settings.healthIntegration?.nativeAvailable === false && (
                <span className="block text-[0.6875rem] text-muted">live readings arrive from Apple Health on your iPhone</span>
              )}
              {declinedOnDevice && (
                <span className="block text-[0.6875rem] leading-relaxed text-muted">
                  {settings.healthIntegration?.lastReason === 'timeout'
                    ? 'The iOS permission sheet never arrived (the request stalled). Force-quit Telemetry, reopen, and Retry — the Xcode console logs which call stalls.'
                    : 'iOS asks exactly once. Turn it on in the Health app → Sharing → Apps → Telemetry, then reopen this page.'}
                </span>
              )}
            </span>
            {declinedOnDevice ? (
              <button
                type="button"
                onClick={connectHealth}
                className="shrink-0 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted underline decoration-line underline-offset-4"
              >
                Retry
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnectHealth}
                className="shrink-0 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted underline decoration-line underline-offset-4"
              >
                Disconnect
              </button>
            )}
          </Card>
        ) : (
          <button
            type="button"
            onClick={connectHealth}
            disabled={asking}
            className="w-full rounded-md border border-accent px-4 py-3.5 font-clock text-xs font-semibold uppercase tracking-widest2 text-accent"
          >
            {asking ? 'Connecting…' : 'Connect Apple Health'}
          </button>
        )}
      </div>

      {/* Readiness — the band that drives the Forgiveness Protocol */}
      <div>
        <SectionLabel className="mb-2 px-1">Readiness</SectionLabel>
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <span className={`font-clock text-lg font-semibold uppercase tracking-widest2 ${readiness ? READY_TONE[readiness] : 'text-muted'}`}>
              {readiness || '—'}
            </span>
            <span className="text-[0.6875rem] text-muted">sleep + HRV</span>
          </div>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            {readiness ? READY_LINE[readiness] : 'Nothing on the record yet — the band waits for real sleep data.'}
          </p>
        </Card>
      </div>

      {/* Today's native snapshot vs personal baseline */}
      <div>
        <SectionLabel className="mb-2 px-1">Today · vs your baseline</SectionLabel>
        {neverAsked ? (
          <button
            type="button"
            onClick={enableHealth}
            disabled={asking}
            className="w-full rounded-md border border-accent px-4 py-3.5 font-clock text-xs font-semibold uppercase tracking-widest2 text-accent"
          >
            {asking ? 'Requesting…' : 'Enable Health access'}
          </button>
        ) : snap === undefined ? (
          <LedgerNotice>Reading HealthKit…</LedgerNotice>
        ) : snap === null ? (
          <LedgerNotice>
            Sleep, activity, and heart-rate arrive from Apple Health on your iPhone. The manual check-in
            below still feeds the Guardian.
          </LedgerNotice>
        ) : (
          <Grid cols={2} gap={12}>
            <KpiTile label="Sleep" value={snap.sleepHours ?? '—'} unit="h" delta={delta(snap.sleepHours, baselines.sleep)} deltaSuffix="h" accent />
            <KpiTile label="HRV · SDNN" value={snap.hrv ?? '—'} unit="ms" delta={delta(snap.hrv, baselines.hrv)} deltaSuffix="ms" />
            <KpiTile label="Steps" value={snap.steps != null ? snap.steps.toLocaleString() : '—'} />
            <KpiTile label="Resting HR" value={snap.restingHR ?? '—'} unit="bpm" />
          </Grid>
        )}
      </div>

      {/* The manual morning check-in (works everywhere, syncs) */}
      <div>
        <SectionLabel className="mb-2 px-1">Morning check-in</SectionLabel>
        {today ? (
          <Card className="flex justify-around px-2 py-1">
            <Stat label="Sleep" value={today.sleep != null ? `${today.sleep}/5` : '—'} />
            <Stat label="Legs" value={today.legs != null ? `${today.legs}/5` : '—'} />
            <Stat label="Mind" value={today.mind != null ? `${today.mind}/5` : '—'} />
            {today.rhr != null && <Stat label="RHR" value={today.rhr} />}
          </Card>
        ) : (
          <LedgerNotice>No check-in yet today.</LedgerNotice>
        )}
        <button
          type="button"
          onClick={() => setCheckinOpen(true)}
          className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-left text-[0.875rem] text-ink"
        >
          {today ? 'Update today’s check-in' : 'Log this morning’s check-in'}
        </button>
      </div>

      {checkinOpen && <WellnessSheet onClose={() => setCheckinOpen(false)} />}
    </div>
  )
}
