// LiveDeck.jsx — the deck that powers the real app.
//
// Generative-UI with a local-first fallback, in priority order:
//   1. an AI-authored layout from the Architect (ui_layouts, via useLayout) when
//      one exists for this signed-in user — the eventual "the AI designed your
//      day" state, and
//   2. otherwise a layout built live from the local store (buildLiveLayout) —
//      your real data, offline, no backend required.
// Either way it renders through the same LayoutHost. Must be inside <StoreProvider>.

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useEngagementSummary } from '../lib/engagement.js'
import { useLayout } from '../lib/layout.js'
import { buildLiveLayout } from '../lib/liveLayout.js'
import { normalizeLayout } from '../lib/uiSchema.js'
import { scheduleDailyBlocks, layoutScheduleKey } from '../lib/notifications.js'
import { readToday } from '../lib/health.js'
import { calculateReadinessScore, adjustDailyTargets } from '../lib/readiness.js'
import { useDriftSentinel, applyGuardian, scheduleGuardianWarning } from '../lib/guardianEngine.js'
import { useRecord } from '../lib/record.js'
import { strongestPattern, counselFor } from '../lib/counsel.js'
import { invokeCounsel } from '../lib/counselClient.js'
import { appDayKey } from '../lib/dates.js'
import { LayoutHost } from './BlockRenderer.jsx'
import RefactorIndicator from './RefactorIndicator.jsx'

// Forgiveness Protocol: rewrite every ScheduleMatrix block's rows for the day's
// readiness band (no-op unless 'low'). Immutable — returns a fresh layout.
function applyReadiness(layout, readiness) {
  if (readiness !== 'low' || !layout || !Array.isArray(layout.tabs)) return layout
  return {
    ...layout,
    tabs: layout.tabs.map((t) => ({
      ...t,
      blocks: Array.isArray(t.blocks)
        ? t.blocks.map((b) =>
            b && b.type === 'ScheduleMatrix' && b.config && Array.isArray(b.config.rows)
              ? { ...b, config: { ...b.config, rows: adjustDailyTargets(b.config.rows, readiness) } }
              : b,
          )
        : t.blocks,
    })),
  }
}

// Hydrate the "Counsel" InsightCard with the Guardian's counsel (AI or local).
// Immutable; a no-op when there's no counsel or no matching card in the layout.
function applyCounsel(layout, counsel) {
  if (!counsel || !counsel.text || !layout || !Array.isArray(layout.tabs)) return layout
  const tone = counsel.danger ? 'neg' : undefined
  const source = counsel.synthesis === 'ai' ? 'counsel' : 'live'
  return {
    ...layout,
    tabs: layout.tabs.map((t) => ({
      ...t,
      blocks: Array.isArray(t.blocks)
        ? t.blocks.map((b) =>
            b && b.type === 'InsightCard' && b.config && b.config.heading === 'Counsel'
              ? { ...b, config: { ...b.config, text: counsel.text, tone, source } }
              : b,
          )
        : t.blocks,
    })),
  }
}

export default function LiveDeck() {
  const store = useStore()
  const summary = useEngagementSummary()
  const { layout: served, source } = useLayout()
  // Witnessed Referee verdicts (checkpoints). Fail-soft: [] on web / off-backend.
  const { rows: checkpoints } = useRecord()

  // Objective readiness from HealthKit (sleep + HRV). Native-only + fail-soft:
  // a null snapshot on web/simulator leaves it 'moderate' → no schedule change.
  const [readiness, setReadiness] = useState('moderate')
  useEffect(() => {
    let alive = true
    readToday()
      .then((snap) => {
        if (alive && snap) setReadiness(calculateReadinessScore(snap.sleepHours, snap.hrv))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Guardian Counsel over the witnessed checkpoints. The local rule-based card
  // (counselFor) shows instantly and is the offline fallback; the server-side AI
  // synthesis (invokeCounsel) swaps in when Supabase is configured + online.
  // Mirrors Counsel.jsx; fail-soft — no pattern / no backend → null → no-op.
  const partnerName = (store.settings?.partners || [])[0]?.name || ''
  const localCounsel = counselFor(checkpoints, { partnerName })
  const pattern = strongestPattern(checkpoints)
  const [aiCounsel, setAiCounsel] = useState(null)
  useEffect(() => {
    let alive = true
    setAiCounsel(null)
    if (!pattern) return
    invokeCounsel(pattern, { partnerName }).then((card) => {
      if (alive && card) setAiCounsel(card)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern?.key, pattern?.count, partnerName])
  const rawCounsel = aiCounsel || localCounsel
  // Honor the Examen's "Let it go" dismissal so a worked-on drift doesn't re-indict.
  const counsel =
    rawCounsel && !(store.handover?.counselAck || []).some((a) => a.key === rawCounsel.pattern && a.day === appDayKey())
      ? rawCounsel
      : null

  // Prefer a real AI layout (server or its cache); fall back to the live local
  // mapping. 'default' / 'error' both mean "no AI layout yet" → go local.
  const baseLayout =
    source === 'server' || source === 'cache' ? served : normalizeLayout(buildLiveLayout(store, summary))

  // The drift sentinel: predictive risk from sleep/HRV baselines, deck
  // engagement, streak phase, and the user's own historical urge hours.
  // At watch+ it injects a Guardian card (below) and pre-schedules ONE
  // action-cued warning before tonight's predicted window (native only).
  const drift = useDriftSentinel()
  const profile = { streakModel: store.settings?.streakModel, theme: store.settings?.theme }
  const driftBand = drift?.band || 'stable'
  useEffect(() => {
    if (driftBand === 'stable') return
    scheduleGuardianWarning(drift, profile) // one per app-day; no-ops on web
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driftBand])

  // Forgiveness Protocol reflows a low-readiness day; hydrate the Counsel card;
  // then the Guardian's forecast card lands on top. All immutable transforms
  // over the resolved layout.
  const layout = applyGuardian(applyCounsel(applyReadiness(baseLayout, readiness), counsel), drift, profile)

  // Native notification engine: this is the chokepoint where the RESOLVED layout
  // (AI or local) is known. Whenever its schedule changes — a fresh load or an AI
  // refactor — clear yesterday's block notifications and schedule today/tomorrow's.
  // Keyed on the schedule signature so it only fires on real changes; no-ops on web.
  const schedKey = layoutScheduleKey(layout)
  useEffect(() => {
    scheduleDailyBlocks(layout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedKey])

  // Sync & Refactor closes out the deck IN the scroll flow — the end-of-day
  // action belongs at the end of the day's cards, and in-flow content can't
  // overlap anything (the old fixed-banner trap).
  return <LayoutHost layout={layout} footer={<RefactorIndicator className="w-full" />} />
}
