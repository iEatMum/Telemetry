// Login.jsx — the gate. One field, one tap, a magic link in your inbox.
//
// Passwordless sign-in via Supabase: no password to forget, which fits the
// zero-friction idea — the only job here is to prove it's you so your data
// follows you across devices. (Implementation Intention framing: the cue
// "open the app" binds to one clean response, "you're you.")
//
// Deliberately minimal styling — the visual layer is a later, UI-sprint concern.

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

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
        // Come back to wherever the app actually runs (localhost in dev, the
        // Vercel URL in prod). supabase-js reads the token off the URL on return.
        emailRedirectTo: window.location.origin,
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
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#0A0B0D] text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">LOCKED IN</h1>
        <p className="mt-1 text-sm text-white/60">Sign in to sync. Your data follows you.</p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm leading-relaxed">
            Check <span className="font-medium">{email.trim()}</span> for a sign-in link, then
            open it on this device.
            <button
              type="button"
              className="mt-3 block text-white/60 underline"
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
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-xl bg-white text-black font-medium py-3 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
