// nativeAuth.js — the native-only half of sign-in (the iOS auth bridge).
//
// THE PROBLEM this solves: on iOS the magic-link email opens in Safari, not in
// the app, so the WKWebView never sees the token and login silently never
// completes. The fix is a custom URL scheme (`telemetry://auth-callback`) that iOS
// hands straight back to the app. Capacitor surfaces that hand-off as an
// `appUrlOpen` event; we pull the auth payload off the URL and establish the
// session ourselves (supabaseClient sets detectSessionInUrl:false on native so
// nothing races us).
//
// We accept ALL THREE ways Supabase can return the session, so the link "just
// works" regardless of the flow + email template in use:
//   • ?token_hash=…  (custom magic-link template)        → verifyOtp
//   • ?code=…        (PKCE — the DEFAULT template)       → exchangeCodeForSession
//   • #access_token=…&refresh_token=… (implicit flow)    → setSession
// The default Supabase template + our flowType:'pkce' produce the ?code= path,
// so that's the one that fires for immediate Simulator testing.
//
// This module is imported ONLY when Capacitor.isNativePlatform() is true (see
// main.jsx). On the web it never loads, so the web bundle never needs
// @capacitor/app. Requires: `npm i @capacitor/app && npx cap sync ios`.

import { supabase } from './supabaseClient.js'

export async function initNativeAuth() {
  // No backend configured → nothing to verify (local-only mode). Stay silent.
  if (!supabase) return

  // Imported lazily so this native-only dependency is pulled in only on device.
  const { App } = await import('@capacitor/app')

  App.addListener('appUrlOpen', async ({ url }) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      return // not a URL we can parse — ignore
    }

    // Tokens may ride on the query (?code=, ?token_hash=) or, for the implicit
    // flow, in the fragment (#access_token=…). Read both.
    const query = parsed.searchParams
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
    const tokenHash = query.get('token_hash')
    const type = query.get('type') // 'email'/'magiclink' for magic link; set by the template
    const code = query.get('code')
    const accessToken = hash.get('access_token') || query.get('access_token')
    const refreshToken = hash.get('refresh_token') || query.get('refresh_token')

    try {
      if (tokenHash) {
        // Custom magic-link template path.
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type || 'email',
        })
        if (error) console.error('[nativeAuth] verifyOtp failed:', error.message)
      } else if (code) {
        // PKCE path (the default template). The code_verifier was stored in this
        // WebView when signInWithOtp ran, so the exchange completes here.
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) console.error('[nativeAuth] exchangeCodeForSession failed:', error.message)
      } else if (accessToken && refreshToken) {
        // Implicit-flow path — establish the session directly from the tokens.
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) console.error('[nativeAuth] setSession failed:', error.message)
      } else {
        return // not an auth link — nothing to do
      }
      // On success supabase-js persists the session and fires SIGNED_IN, which
      // AuthGate's onAuthStateChange consumes to swap Login → the live deck. The
      // native shell is a SPA rooted at AuthGate, so no manual navigation is
      // needed (and a hard redirect would fight the gate).
    } catch (e) {
      console.error('[nativeAuth] deep-link auth error:', e)
    }
  })
}
