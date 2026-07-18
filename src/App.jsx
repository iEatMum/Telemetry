import { useEffect, useState } from 'react'
import LiveDeck from './components/LiveDeck.jsx'
import NavBar from './components/NavBar.jsx'
import UrgeProtocol, { hasActiveRide } from './components/UrgeProtocol.jsx'
import Paywall from './components/Paywall.jsx'
import { LegalOverlay } from './components/LegalSheet.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import DayPlanSheet from './components/DayPlanSheet.jsx'
import TourSheet, { tourSeen } from './components/TourSheet.jsx'
import Toast from './components/Toast.jsx'
import WeeklyReview from './components/WeeklyReview.jsx'
import Sprint from './screens/Sprint.jsx'
import HealthPanel from './screens/HealthPanel.jsx'
import GuardianPanel from './screens/GuardianPanel.jsx'
import CommandPanel from './screens/CommandPanel.jsx'
import { useEngagementSummary } from './lib/engagement.js'
import { trackDailyOpen } from './lib/analytics.js'
import { syncDailyBriefingWidget } from './lib/widgets.js'
import { refreshEntitlement } from './lib/purchases.js'
import { initDynamicType } from './lib/dynamicType.js'
import { writeSnapshot } from './lib/snapshots.js'
import { initKeyboardInsets } from './lib/nativeChrome.js'
import { Capacitor } from '@capacitor/core'
import { appDayKey } from './lib/dates.js'
import StorageAlert from './components/StorageAlert.jsx'
import { queuedCount, status as syncStatus } from './lib/sync.js'
import * as storage from './lib/storage.js'
import { StatusLED } from './components/ui.jsx'

// A quiet, honest read for the status LED. v1 is local-first BY DESIGN
// (CONSTITUTION M0.1): the book living on this device is the healthy state —
// ON DEVICE, calm-positive, never a warning. Connectivity semantics (LIVE /
// OFFLINE) are earned only by a sync session that actually exists — configured
// keys alone don't make the book live anywhere but here, and printing LIVE on
// a device-only book is a lie. OFFLINE stays muted-still: edits queue and
// catch up; silence is content, not an alarm.
function useConnState() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  const sync = syncStatus()
  if (!sync.configured || !sync.signedIn) return { label: 'ON DEVICE', tone: 'pos' }
  return online ? { label: 'LIVE', tone: 'accent' } : { label: 'OFFLINE', tone: 'muted' }
}

// Mono clock for the strip — minute resolution, wall-clock true.
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(id)
  }, [])
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// 'queued n' beside the LED while OFFLINE — data, not warning (muted). Re-reads
// on every local write; clears itself the moment the LED goes LIVE.
function useQueued(active) {
  const [n, setN] = useState(() => queuedCount())
  useEffect(() => {
    if (!active) return undefined
    setN(queuedCount())
    return storage.subscribe(() => setN(queuedCount()))
  }, [active])
  return n
}

// The shell: five SURFACES on a bottom nav — DECK (the generative deck, whose
// payload-driven tab strip stays the AI's), SPRINTS (the deep-work cockpit),
// HEALTH (biometrics), GUARDIAN (drift review), COMMAND (config hub) — plus
// HELP, the crisis path, docked as the nav's sixth slot (one tap from ANY
// surface, and never floating over content). The sheets are the only overlays.
// The Sync & Refactor control lives IN the deck's scroll flow (LayoutHost
// footer), so nothing is ever trapped beneath a floating banner.
export default function App() {
  const [surface, setSurface] = useState('deck')
  // A ride that survived process death reopens with the shell (P1 crisis path):
  // the user walked away mid-protocol, iOS killed the app, and coming back must
  // land them back ON the ride — not on a deck pretending nothing was happening.
  const [urgeOpen, setUrgeOpen] = useState(() => hasActiveRide())
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [dayPlanOpen, setDayPlanOpen] = useState(false)
  // The tour auto-opens exactly once: the shell only mounts past RequireSurvey,
  // so "no tour flag yet" means "first minute on the deck, fresh off intake".
  // The survey check guards the one surveyless mount (the DEV ?demo=live route)
  // — a demo/E2E deck shouldn't boot into a first-run ritual.
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return !tourSeen() && !!localStorage.getItem('lockedin:__survey')
    } catch {
      return false
    }
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const conn = useConnState()
  const clock = useClock()
  const queued = useQueued(conn.label === 'OFFLINE')

  // Keep the native home-screen widget in lockstep with the live deck's DAILY
  // BRIEFING numbers. Deps are primitives so it only fires when a stat changes
  // (fail-soft no-op on web — see lib/widgets.js).
  const summary = useEngagementSummary()
  const impactDone = summary.impact?.done ?? 0
  const engagedPercent = summary.engagementRate ?? 0
  const cardsEngaged = (summary.used || []).length
  // The widget's HERO stat must be a real dependency (P1): reading it inside
  // the effect meant marking today clean without moving an engagement stat
  // left the home-screen widget on yesterday's count. A storage subscription
  // keeps it live — streak writes land in state, state lands in the deps.
  const [daysOnBook, setDaysOnBook] = useState(() => (storage.get('streak')?.cleanDates || []).length)
  useEffect(
    () =>
      storage.subscribe((name) => {
        if (name === 'streak') setDaysOnBook((storage.get('streak')?.cleanDates || []).length)
      }),
    []
  )
  useEffect(() => {
    // The manila widget heroes "DAYS ON THE BOOK" (native-only; no-op on web).
    syncDailyBriefingWidget(impactDone, engagedPercent, cardsEngaged, daysOnBook)
  }, [impactDone, engagedPercent, cardsEngaged, daysOnBook])

  // The deck's in-flow "Open the night page" line routes here — the urge
  // overlay is owned by the shell (it must cover every surface), so deep
  // children reach it by event rather than prop-drilling through LayoutHost.
  // The paywall uses the same idiom: every CoachGate opens the one sheet.
  useEffect(() => {
    const openUrge = () => setUrgeOpen(true)
    const openPaywall = () => setPaywallOpen(true)
    const openDayPlan = () => setDayPlanOpen(true)
    const openTour = () => setTourOpen(true)
    window.addEventListener('telemetry:open-urge', openUrge)
    window.addEventListener('telemetry:open-paywall', openPaywall)
    window.addEventListener('telemetry:open-dayplan', openDayPlan)
    window.addEventListener('telemetry:open-tour', openTour)
    return () => {
      window.removeEventListener('telemetry:open-urge', openUrge)
      window.removeEventListener('telemetry:open-paywall', openPaywall)
      window.removeEventListener('telemetry:open-dayplan', openDayPlan)
      window.removeEventListener('telemetry:open-tour', openTour)
    }
  }, [])

  // The private tally: one open-count per app day (counts only, on-device only).
  useEffect(() => {
    trackDailyOpen()
  }, [])

  // Dynamic Type seam: listen for the native content-size hook and scale the
  // root type accordingly. No-op on web (the event never fires there).
  useEffect(() => initDynamicType(), [])

  // Keyboard inset seam (native only): sheets read --keyboard-inset to keep
  // their inputs clear of the iOS keyboard.
  useEffect(() => {
    let teardown = () => {}
    initKeyboardInsets().then((fn) => {
      teardown = fn || teardown
    })
    return () => teardown()
  }, [])

  // The crash barrier (P1 "the book survives"): snapshot the whole store to the
  // app sandbox on mount, on every backgrounding (visibilitychange→hidden fires
  // on Capacitor pause), and at the 3am rollover while the app stays open.
  // No-op on web; an empty store never overwrites a good snapshot.
  useEffect(() => {
    writeSnapshot()
    const onVis = () => {
      if (document.visibilityState === 'hidden') writeSnapshot()
    }
    document.addEventListener('visibilitychange', onVis)
    let lastDay = appDayKey()
    const tick = setInterval(() => {
      const day = appDayKey()
      if (day !== lastDay) {
        lastDay = day
        writeSnapshot()
      }
    }, 15 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(tick)
    }
  }, [])

  // Re-mirror Apple's entitlement on launch and every foreground return. Without
  // this the local __coach cache only ever refreshes on a Paywall tap, so a
  // cancelled or expired subscription would keep the coach unlocked forever (and
  // the winback page could never fire). Fail-soft + native-only — a no-op on web.
  useEffect(() => {
    refreshEntitlement()
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshEntitlement()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <div className="min-h-full bg-bg text-ink">
      {/* StatusStrip — LED + queue chip left; signal bars + mono clock right.
          Connectivity truth ONLY, never guardian severity (an ambient threat
          light would make the whole app an anxiety dashboard). pt-safe keeps it
          below the notch/Dynamic Island. */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-3 py-1 backdrop-blur pt-safe">
        <div className="flex items-center gap-2.5">
          <StatusLED status={conn.label} />
          {conn.label === 'OFFLINE' && queued > 0 && (
            <span className="font-clock tnum text-[0.6875rem] uppercase tracking-widest2 text-muted">
              queued {queued}
            </span>
          )}
        </div>
        {/* On native the phone's REAL status bar sits right above this strip —
            painting a second clock and fake signal bars under it reads as a
            cheap imitation (P1 platform). Web/PWA keeps them: there's no
            system chrome to defer to in a standalone web view. */}
        {!Capacitor.isNativePlatform() && (
          <div className="flex items-center gap-2.5">
            <span className="flex items-end gap-[2px]" aria-hidden>
              {[3, 5, 7, 9].map((h, i) => (
                <span
                  key={h}
                  className={`w-[3px] rounded-sm ${
                    i < (conn.label === 'OFFLINE' ? 1 : 4) ? 'bg-muted' : 'bg-line'
                  }`}
                  style={{ height: h }}
                />
              ))}
            </span>
            <span className="font-clock tnum text-[0.6875rem] tracking-widest2 text-muted">{clock}</span>
          </div>
        )}
      </div>

      {/* The active surface. DECK owns its own scroll padding (LayoutHost's
          pb-deck); the others get the shared centered track with nav clearance.
          The offset must carry the SAME safe-area inset the fixed strip pads
          itself down by, or on a notched phone the first ~48px of every surface
          (the Day-one hero) renders trapped beneath the strip. */}
      <div className="pt-[calc(env(safe-area-inset-top)+1.75rem)]">
        {/* Storage honesty strip — only renders after a write refusal or a
            quarantined page; in-flow so it can never trap content beneath it. */}
        <StorageAlert />
        {surface === 'deck' ? (
          <LiveDeck />
        ) : (
          <div className="pb-nav mx-auto w-full max-w-app px-4 pt-5">
            {surface === 'sprints' && <Sprint />}
            {surface === 'health' && <HealthPanel />}
            {surface === 'guardian' && <GuardianPanel />}
            {surface === 'command' && (
              <CommandPanel
                conn={conn}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenReview={() => setReviewOpen(true)}
              />
            )}
          </div>
        )}
      </div>

      {/* HELP lives IN the nav (M2) — a docked slot can never float over content */}
      <NavBar active={surface} onChange={setSurface} onHelp={() => setUrgeOpen(true)} helpActive={urgeOpen} />

      {urgeOpen && <UrgeProtocol onClose={() => setUrgeOpen(false)} />}
      {paywallOpen && <Paywall onClose={() => setPaywallOpen(false)} />}
      {/* The fine print rides above every sheet (the paywall links into it). */}
      <LegalOverlay />
      {settingsOpen && (
        <SettingsSheet
          onClose={() => setSettingsOpen(false)}
          onOpenReview={() => {
            setSettingsOpen(false)
            setReviewOpen(true)
          }}
        />
      )}
      {reviewOpen && <WeeklyReview onClose={() => setReviewOpen(false)} />}
      {/* Mounted AFTER Settings so it stacks above when opened from there
          (same z tier; DOM order decides). */}
      {dayPlanOpen && <DayPlanSheet onClose={() => setDayPlanOpen(false)} />}
      {/* The tour rides last: on first run it must cover the whole shell, and a
          Settings replay must land above the Settings sheet. */}
      {tourOpen && <TourSheet onClose={() => setTourOpen(false)} />}
      <Toast />
    </div>
  )
}
