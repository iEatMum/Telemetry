import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RequireSurvey from './components/RequireSurvey.jsx'
import Waitlist from './pages/Waitlist.jsx'
import Onboarding from './pages/Onboarding.jsx'
import { StoreProvider } from './lib/store.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import { Capacitor } from '@capacitor/core'
// The stopwatch face (Split Ledger data type). Bundled so the WKWebView never
// falls back to a different mono between devices; 400/500 are the only weights
// the design sanctions.
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'

// DEV-ONLY (CONSTITUTION M1): /?demo=live mounts the real app without the auth
// gate so the deck is reviewable/E2E-testable against the dev server. Gated on
// import.meta.env.DEV so no store build ever ships an auth bypass. (The old
// /?demo widget-gallery and /?demo=layout routes are gone with their screens.)
//
// /?waitlist and /?onboarding are WEB surfaces (the marketing funnel). Inside
// the native shell they're dead ends a deep link could otherwise reach — a
// telemetry://?waitlist must never replace the user's book with a signup page —
// so both are gated off native (MASTERPLAN Phase 1 · store-build integrity).
const isNative = Capacitor.isNativePlatform()
let demoLive = false
let isWaitlist = false
let isOnboarding = false
try {
  const p = new URLSearchParams(window.location.search)
  demoLive = import.meta.env.DEV && p.get('demo') === 'live'
  if (!isNative && p.has('waitlist')) isWaitlist = true
  if (!isNative && p.has('onboarding')) isOnboarding = true
} catch {
  /* no window / bad URL — fall through to the real app */
}

function Root() {
  // /?onboarding → the intake survey that feeds the AI Architect (no auth/store).
  if (isOnboarding) return <Onboarding />
  // /?waitlist → the marketing landing page (its own scoped theme, no auth/store).
  if (isWaitlist) return <Waitlist />
  if (demoLive) {
    return (
      <StoreProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StoreProvider>
    )
  }
  // The real funnel (CONSTITUTION M0.1/M2): no accounts, no email door. First
  // run → RequireSurvey finds no baseline → onboarding ("opening your book")
  // → the deck. A returning user passes the local survey check instantly.
  return (
    <StoreProvider>
      <ThemeProvider>
        <RequireSurvey>
          <App />
        </RequireSurvey>
      </ThemeProvider>
    </StoreProvider>
  )
}

// Cache the root on the container so Vite HMR re-running this entry module reuses
// the existing root instead of calling createRoot twice (which logs a warning).
const container = document.getElementById('root')
const root = container._reactRoot || (container._reactRoot = ReactDOM.createRoot(container))
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
)
