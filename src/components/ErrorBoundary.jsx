// ErrorBoundary.jsx — the shell's last line. An uncaught render error inside a
// WKWebView otherwise white-screens the whole app with no reload affordance;
// this catches it and offers one calm way back. Class component by necessity
// (React has no hook for componentDidCatch).
//
// The fallback leans on Tailwind classes + CSS-var tokens only: the pre-boot
// script in index.html has already stamped data-theme on <html>, so the tokens
// resolve even when the React tree (ThemeProvider included) is the thing that
// crashed.

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Console only — no remote reporting exists in the local-first build, and
    // adding one silently would contradict the privacy labels.
    console.error('[telemetry] render error caught by ErrorBoundary:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
        <div className="font-clock text-[12px] uppercase tracking-[0.25em] text-muted">
          The page tore
        </div>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted">
          Something broke while drawing this screen. Your book is safe — every entry lives on this
          device and nothing was lost.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 w-full max-w-xs rounded-md bg-accent py-4 font-clock text-sm font-semibold uppercase tracking-widest2 text-accent-ink"
        >
          Reopen the book
        </button>
      </div>
    )
  }
}
