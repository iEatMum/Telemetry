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
import { appDayKey, streakDays } from '../lib/dates.js'
import { shareBookCard } from '../lib/shareCard.js'
import { LayoutHost } from './BlockRenderer.jsx'
import RefactorIndicator from './RefactorIndicator.jsx'

// The book header (Split Ledger 01) — the page hero above the tab strip. The
// LIFETIME figure holds the dominant position (§8: totals only accrue); the
// current run and its week print as one small mono line beside the date.
function BookHeader({ store }) {
  const total = store.streak?.cleanDates?.length || 0
  const run = streakDays(store.streak?.startedAt) || 0
  const wk = Math.floor(run / 7) + 1
  const now = new Date()
  const wd = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const md = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

  // Day-zero is an INVITATION, never a stark "0" hero (psychology spine): an
  // empty book opens to "Day one · your first entry goes here", not a 0.
  const empty = total === 0
  return (
    <header className="flex items-end justify-between px-4 pb-3 pt-4">
      <div>
        <div className="font-clock text-[10px] uppercase tracking-widest2 text-muted">
          {empty ? 'The book opens' : 'Days on the book'}
        </div>
        {empty ? (
          <>
            <div className="mt-1.5 font-clock text-3xl font-medium leading-none text-ink">Day one</div>
            <div className="mt-1.5 text-[13px] leading-snug text-muted">Your first entry goes here.</div>
          </>
        ) : (
          <div className="mt-1.5 font-clock tnum text-5xl font-medium leading-none text-ink">{total}</div>
        )}
      </div>
      <div className="flex flex-col items-end">
        <div className="font-clock tnum text-[11px] uppercase tracking-widest2 text-muted">
          {wd} · {md}
        </div>
        <div className="mt-1 font-clock tnum text-[11px] lowercase text-faint">
          run {run} · wk {wk}
        </div>
        {/* The page as an image (M4) — the hero frame is the app's shareable
            object. Quiet text affordance; the card renders in the active skin.
            Hidden on an empty book: "DAYS ON THE BOOK 0" is an anti-ad, and
            nobody should be nudged to post a page with nothing on it. The
            negative margins pay for the 44px hit area without moving the ink. */}
        {total > 0 && (
          <button
            type="button"
            onClick={() => shareBookCard({ total, run, wk })}
            aria-label="Share the book page"
            className="-mb-3 -mr-3 flex min-h-[44px] min-w-[44px] items-center justify-end px-3 pb-3 font-clock text-[10px] uppercase tracking-widest2 text-muted underline decoration-line underline-offset-4"
          >
            Share
          </button>
        )}
      </div>
    </header>
  )
}

// The milestone share moment (growth judge, second panel): the card is only
// offered when the number is worth showing — day 7 / 30 / 100 / 365 on the
// book — and each milestone asks exactly once. Dismissals persist in a sidecar
// (never synced, never exported: a nudge's memory is not an entry in the book).
const SHARE_MILESTONES = [365, 100, 30, 7]
const MILESTONE_KEY = 'lockedin:__share_milestones'

function readMilestones() {
  try {
    const v = JSON.parse(localStorage.getItem(MILESTONE_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function MilestoneShareCard({ total, run, wk }) {
  const [seen, setSeen] = useState(readMilestones)
  const due = SHARE_MILESTONES.find((m) => total >= m && !seen[m])
  if (!due) return null
  const settle = () => {
    // Marking every milestone ≤ total keeps an imported/long-running book from
    // replaying old asks (a 100-day book should never see the day-7 card).
    const next = { ...seen }
    for (const m of SHARE_MILESTONES) if (total >= m) next[m] = true
    try {
      localStorage.setItem(MILESTONE_KEY, JSON.stringify(next))
    } catch {
      /* quota — the in-memory state still hides it this session */
    }
    setSeen(next)
  }
  return (
    // bg-surface, not surface2: muted text must hold ≥4.5:1 on this card's own
    // ground, and the two actions pay for 44px hit areas with negative margins.
    <div className="mx-4 mb-1 border-l-2 border-linebright bg-surface px-4 py-3">
      <div className="font-clock text-[10px] uppercase tracking-widest2 text-muted">
        Day {due} on the book
      </div>
      <p className="mt-1 font-serif text-[14px] italic leading-relaxed text-muted">
        A page worth showing.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            settle()
            shareBookCard({ total, run, wk })
          }}
          className="-ml-3 flex min-h-[44px] items-center px-3 font-clock text-[11px] uppercase tracking-widest2 text-ink underline decoration-line underline-offset-4"
        >
          Share the page
        </button>
        <button
          type="button"
          onClick={settle}
          className="flex min-h-[44px] items-center px-3 font-clock text-[11px] uppercase tracking-widest2 text-muted"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

// The dictation line — the deck's in-flow door to the day-plan editor. The
// schedule only prints what the user wrote, so the pen has to live where the
// page is read. App.jsx owns the sheet (same idiom as the night page below).
function DictateLine() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('telemetry:open-dayplan'))}
      className="mt-2 flex min-h-[44px] w-full items-center justify-between border-t border-line pt-3 text-left"
    >
      <span className="text-[13px] text-muted">
        This is your page. <span className="text-ink">Dictate the day</span>
      </span>
      <span className="text-muted" aria-hidden>
        →
      </span>
    </button>
  )
}

// The quiet footer entry to the night page (Split Ledger 01's closing line).
// The floating HELP NOW pill stays — this is the calm in-flow route to the
// same protocol. App.jsx listens for the event (the urge overlay is owned
// there, above the deck).
function NightPageLine() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('telemetry:open-urge'))}
      className="mt-4 flex min-h-[44px] w-full items-center justify-between border-t border-line pt-3 text-left"
    >
      <span className="text-[13px] text-muted">
        Slipping? <span className="text-ink">Open the night page</span>
      </span>
      <span className="text-muted" aria-hidden>
        →
      </span>
    </button>
  )
}

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

  // The drift sentinel: predictive risk from sleep/HRV baselines, deck
  // engagement, streak phase, and the user's own historical urge hours.
  // At watch+ it injects a Guardian card (below) and pre-schedules ONE
  // action-cued warning before tonight's predicted window (native only).
  const drift = useDriftSentinel()
  // Full tone profile: streakModel + theme drive the base voice; slipResponse +
  // missionConfidence + executionRate7d drive the scaffold/strict register.
  const profile = {
    streakModel: store.settings?.streakModel,
    theme: store.settings?.theme,
    slipResponse: store.settings?.slipResponse,
    missionConfidence: store.settings?.missionConfidence,
    executionRate7d: store.settings?.executionRate7d,
  }

  // Prefer a real AI layout (server or its cache); fall back to the live local
  // mapping. 'default' / 'error' both mean "no AI layout yet" → go local. The
  // drift assessment rides along so Internal Markets' sentiment reads the
  // Guardian's conditions (R7) instead of a blind composite.
  const baseLayout =
    source === 'server' || source === 'cache'
      ? served
      : normalizeLayout(buildLiveLayout(store, summary, { assessment: drift }))
  const driftBand = drift?.band || 'stable'
  // Keyed on the APP-DAY as well as the band: keyed on the band alone, a user
  // sitting at 'watch' across the 3am rollover (a long-lived iOS webview is
  // normal) never re-armed — day 2's warning simply didn't exist. The scheduler
  // itself still enforces one-per-day and replaces by fixed notification id.
  const armDay = appDayKey()
  useEffect(() => {
    if (driftBand === 'stable') return
    scheduleGuardianWarning(drift, profile) // one per app-day; no-ops on web
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driftBand, armDay])

  // Forgiveness Protocol reflows a low-readiness day; hydrate the Counsel card;
  // then the Guardian's forecast card lands on top. All immutable transforms
  // over the resolved layout.
  const composed = applyGuardian(applyCounsel(applyReadiness(baseLayout, readiness), counsel), drift, profile)

  // "Let it go" on the Guardian card (spec §7): a named drift the user has
  // consciously taken on must not re-indict for the rest of the app-day. Same
  // day-scoped counselAck sidecar the Counsel card uses; applyGuardian itself
  // stays untouched — this is a post-transform filter/decoration.
  const guardianAcked = (store.handover?.counselAck || []).some(
    (a) => a.key === 'guardian-drift' && a.day === appDayKey()
  )
  const layout = {
    ...composed,
    tabs: (composed.tabs || []).map((t) => ({
      ...t,
      blocks: guardianAcked
        ? t.blocks.filter((b) => b.id !== 'guardian-drift')
        : t.blocks.map((b) =>
            b.id === 'guardian-drift'
              ? {
                  ...b,
                  config: {
                    ...b.config,
                    dismissLabel: 'Let it go',
                    onDismiss: () => store.dismissCounsel('guardian-drift'),
                  },
                }
              : b
          ),
    })),
  }

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
  const heroTotal = store.streak?.cleanDates?.length || 0
  const heroRun = streakDays(store.streak?.startedAt) || 0
  return (
    <LayoutHost
      layout={layout}
      header={
        <>
          <BookHeader store={store} />
          <MilestoneShareCard total={heroTotal} run={heroRun} wk={Math.floor(heroRun / 7) + 1} />
        </>
      }
      footer={
        <div className="w-full">
          <RefactorIndicator className="w-full" />
          <DictateLine />
          <NightPageLine />
        </div>
      }
    />
  )
}
