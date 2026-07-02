import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'
import RequireSurvey from './components/RequireSurvey.jsx'
import Deck from './screens/Deck.jsx'
import LayoutDemo from './screens/LayoutDemo.jsx'
import Waitlist from './pages/Waitlist.jsx'
import Onboarding from './pages/Onboarding.jsx'
import { StoreProvider } from './lib/store.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import './index.css'

// TEMP (P3.1 / P3.2): demo routes that bypass auth so the new UI can be reviewed
// without a magic-link session. Remove these (and the Deck/LayoutDemo screens)
// once the work is signed off.
//   /?demo         → the P3.1 widget-primitive gallery
//   /?demo=layout  → the P3.2 Server-Driven UI rendering defaultLayout.json
let demoMode = null
let isWaitlist = false
let isOnboarding = false
try {
  const p = new URLSearchParams(window.location.search)
  if (p.has('demo')) demoMode = p.get('demo') || 'widgets'
  if (p.has('waitlist')) isWaitlist = true
  if (p.has('onboarding')) isOnboarding = true
} catch {
  /* no window / bad URL — fall through to the real app */
}

// On device, start listening for the magic-link deep link before first paint, so
// a tap on the email link is caught the moment iOS hands the URL to the app. The
// module (and its native @capacitor/app dependency) is loaded only on native, so
// the web build never touches it.
if (Capacitor.isNativePlatform()) {
  import('./lib/nativeAuth.js').then(({ initNativeAuth }) => initNativeAuth())
}

function Root() {
  // /?onboarding → the intake survey that feeds the AI Architect (no auth/store).
  if (isOnboarding) return <Onboarding />
  // /?waitlist → the marketing landing page (its own scoped theme, no auth/store).
  if (isWaitlist) return <Waitlist />
  // /?demo=live → the REAL app shell (App) wrapped in the store but WITHOUT the
  // auth gate, so the live-data deck is reviewable without a magic-link session.
  if (demoMode === 'live') {
    return (
      <StoreProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StoreProvider>
    )
  }
  if (demoMode === 'layout') return <LayoutDemo />
  if (demoMode) return <Deck />
  // The real app: authenticate, then hard-gate on a survey baseline (local or DB)
  // before the deck. A user with no survey can't reach App — they land in intake.
  return (
    <AuthGate>
      <StoreProvider>
        <ThemeProvider>
          <RequireSurvey>
            <App />
          </RequireSurvey>
        </ThemeProvider>
      </StoreProvider>
    </AuthGate>
  )
}

// Cache the root on the container so Vite HMR re-running this entry module reuses
// the existing root instead of calling createRoot twice (which logs a warning).
const container = document.getElementById('root')
const root = container._reactRoot || (container._reactRoot = ReactDOM.createRoot(container))
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
