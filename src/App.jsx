import { useEffect, useState } from 'react'
import LiveDeck from './components/LiveDeck.jsx'
import NavBar from './components/NavBar.jsx'
import UrgeProtocol from './components/UrgeProtocol.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import WeeklyReview from './components/WeeklyReview.jsx'
import Sprint from './screens/Sprint.jsx'
import HealthPanel from './screens/HealthPanel.jsx'
import GuardianPanel from './screens/GuardianPanel.jsx'
import CommandPanel from './screens/CommandPanel.jsx'
import { useEngagementSummary } from './lib/engagement.js'
import { syncDailyBriefingWidget } from './lib/widgets.js'
import { isSupabaseConfigured } from './lib/supabaseClient.js'

// A quiet, honest read for the status LED: LOCAL when there's no backend wired
// up, OFFLINE when configured but the network's down, else LIVE. Reactive to the
// browser's online/offline events; safe off-DOM.
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
  if (!isSupabaseConfigured) return { label: 'LOCAL', tone: 'muted' }
  return online ? { label: 'LIVE', tone: 'accent' } : { label: 'OFFLINE', tone: 'warn' }
}

// The shell: five SURFACES on a bottom nav — DECK (the generative deck, whose
// payload-driven tab strip stays the AI's), SPRINTS (the deep-work cockpit),
// HEALTH (biometrics), GUARDIAN (drift review), COMMAND (config hub). Two
// globals float as overlays because they aren't "data on a card": HELP NOW
// (the crisis path — one tap from ANY surface) and the sheets. The Sync &
// Refactor control now lives IN the deck's scroll flow (LayoutHost footer), so
// nothing is ever trapped beneath a floating banner.
export default function App() {
  const [surface, setSurface] = useState('deck')
  const [urgeOpen, setUrgeOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const conn = useConnState()

  // Keep the native home-screen widget in lockstep with the live deck's DAILY
  // BRIEFING numbers. Deps are primitives so it only fires when a stat changes
  // (fail-soft no-op on web — see lib/widgets.js).
  const summary = useEngagementSummary()
  const impactDone = summary.impact?.done ?? 0
  const engagedPercent = summary.engagementRate ?? 0
  const cardsEngaged = (summary.used || []).length
  useEffect(() => {
    syncDailyBriefingWidget(impactDone, engagedPercent, cardsEngaged)
  }, [impactDone, engagedPercent, cardsEngaged])

  return (
    <div className="min-h-full bg-bg text-ink">
      {/* Status LED strip — pt-safe keeps it below the notch/Dynamic Island */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-line bg-bg/95 px-3 py-1 font-clock text-[10px] uppercase tracking-widest2 backdrop-blur pt-safe">
        <div
          className={`flex items-center gap-1.5 ${
            conn.tone === 'accent' ? 'text-accent' : conn.tone === 'warn' ? 'text-warn' : 'text-muted'
          }`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              conn.tone === 'accent' ? 'bg-accent animate-pulse-live' : conn.tone === 'warn' ? 'bg-warn' : 'bg-muted'
            }`}
          />
          {conn.label}
        </div>
      </div>

      {/* The active surface. DECK owns its own scroll padding (LayoutHost's
          pb-deck); the others get the shared centered track with nav clearance. */}
      <div className="pt-7">
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

      {/* HELP NOW — global crisis path, floating just above the nav */}
      {!urgeOpen && (
        <div className="bottom-help pointer-events-none fixed left-1/2 z-40 w-full max-w-app -translate-x-1/2 px-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setUrgeOpen(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-ink shadow-glow"
            >
              Help now
            </button>
          </div>
        </div>
      )}

      <NavBar active={surface} onChange={setSurface} />

      {urgeOpen && <UrgeProtocol onClose={() => setUrgeOpen(false)} />}
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
    </div>
  )
}
