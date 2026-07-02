// Login.jsx — the gate. One field, one tap, a magic link in your inbox.
//
// Passwordless sign-in via Supabase: no password to forget, which fits the
// zero-friction idea — the only job here is to prove it's you so your data
// follows you across devices. (Implementation Intention framing: the cue
// "open the app" binds to one clean response, "you're you.")
//
// Styled on the terminal token system (Phase 3): near-black surface, electric
// green action. No hardcoded colors — it tracks the theme like everything else.

import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabaseClient.js'

// Where the magic link should send the user back to. On the web that's just the
// origin (localhost in dev, Vercel in prod) and supabase-js reads the token off
// the URL. On native there's no https origin the WKWebView owns, so we redirect
// to a custom URL scheme that iOS hands back to the app via `appUrlOpen`. The
// scheme (`telemetry`) must match CFBundleURLTypes in Info.plist AND be added to
// Supabase's Auth → URL Configuration → Redirect URLs allow-list, or the link
// falls back to the Site URL and never reaches the app.
const REDIRECT_TO = Capacitor.isNativePlatform()
  ? 'telemetry://auth-callback'
  : window.location.origin

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  async function sendLink(e) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setStatus('sending')
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: addr,
      options: {
        emailRedirectTo: REDIRECT_TO,
      },
    })
    if (err) {
      setStatus('error')
      setError(err.message || 'Could not send the link. Try again.')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg text-ink">
      <div className="w-full max-w-sm">
        <h1 className="font-clock text-2xl font-semibold uppercase tracking-widest2">TELEMETRY</h1>
        <p className="mt-1 text-sm text-muted">Sign in to sync. Your data follows you.</p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-md border border-line bg-surface p-4 text-sm leading-relaxed text-ink">
            Check <span className="font-medium">{email.trim()}</span> for a sign-in link, then
            open it on this device.
            <button
              type="button"
              className="mt-3 block text-muted underline"
              onClick={() => setStatus('idle')}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-md border border-line bg-surface2 px-4 py-3 text-ink placeholder:text-muted outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-accent py-3 font-semibold text-accent-ink shadow-glow-sm disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-sm text-neg">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
