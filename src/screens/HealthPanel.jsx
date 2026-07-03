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
import { readToday } from '../lib/health.js'
import { readGuardian } from '../lib/guardianEngine.js'
import { calculateReadinessScore } from '../lib/readiness.js'
import { appDayKey } from '../lib/dates.js'
import { Card, SectionLabel, Grid, KpiTile, LedgerNotice, Stat } from '../components/ui.jsx'

const READY_TONE = { low: 'text-warn', moderate: 'text-ink', high: 'text-accent' }
const READY_LINE = {
  low: 'Recovery day — the deck reflows heavy blocks to maintenance.',
  moderate: 'Steady. The plan runs as dealt.',
  high: 'Green light. Full send on the ◆ blocks.',
}

export default function HealthPanel() {
  const { wellness } = useStore()
  const [snap, setSnap] = useState(undefined) // undefined = loading, null = unavailable
  useEffect(() => {
    let alive = true
    readToday()
      .then((s) => alive && setSnap(s))
      .catch(() => alive && setSnap(null))
    return () => {
      alive = false
    }
  }, [])

  const baselines = readGuardian().baselines || {}
  const today = wellness[appDayKey()] || null
  // No snapshot → no band. Claiming "moderate" with zero data would be a
  // verdict without evidence — the readout stays honest and says so.
  const readiness = snap ? calculateReadinessScore(snap.sleepHours, snap.hrv) : null

  const delta = (val, base) =>
    val != null && base != null ? Math.round((val - base) * 10) / 10 : undefined

  return (
    <div className="space-y-5">
      {/* Readiness — the band that drives the Forgiveness Protocol */}
      <div>
        <SectionLabel className="mb-2 px-1">Readiness</SectionLabel>
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <span className={`font-clock text-lg font-semibold uppercase tracking-widest2 ${readiness ? READY_TONE[readiness] : 'text-muted'}`}>
              {readiness || '—'}
            </span>
            <span className="text-[11px] text-muted">sleep + HRV</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {readiness ? READY_LINE[readiness] : 'No biometric signal on this build — the band waits for real data.'}
          </p>
        </Card>
      </div>

      {/* Today's native snapshot vs personal baseline */}
      <div>
        <SectionLabel className="mb-2 px-1">Today · vs your baseline</SectionLabel>
        {snap === undefined ? (
          <LedgerNotice>Reading HealthKit…</LedgerNotice>
        ) : snap === null ? (
          <LedgerNotice>
            Biometrics arrive on the phone build — HealthKit is native-only. The manual check-in
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
      </div>
    </div>
  )
}
