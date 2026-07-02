// supabaseClient.js — the ONE place we create the Supabase connection.
//
// Phase 3 gives the app a backend, but the app still has to work offline-first
// (Lally 2010: the habit loop can't wait on a round-trip). So this file is built
// to FAIL SOFT — if no credentials are present, `supabase` is null and the whole
// app keeps running in pure local mode, exactly like Phase 1/2. Auth and sync
// only switch on once real keys exist. (Marlatt's AVE, in config form: a missing
// key must never cascade into a total lockout.)
//
// Keys come from Vite env vars. The VITE_ prefix means they're baked into the
// client bundle at build time — which is fine here:
//   VITE_SUPABASE_URL       — your project URL
//   VITE_SUPABASE_ANON_KEY  — the PUBLIC anon key. Safe to ship in the client
//                             because Row-Level Security ("own rows only",
//                             auth.uid() = user_id) is what actually guards the
//                             data. NEVER put the service_role key here — it
//                             bypasses RLS.
//
// Copy .env.example → .env.local and fill these in from the Supabase dashboard
// (Project Settings → API). .env.local is gitignored, so secrets never commit.

import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

// On the web the magic link returns to an https URL the browser owns, so
// supabase-js can read the token straight off `window.location` (detectSessionInUrl).
// Inside the native WKWebView the link instead returns via a custom URL scheme
// that the browser never parses — we catch it in `appUrlOpen` (see nativeAuth.js)
// and call verifyOtp by hand. So native must NOT auto-detect, or it races us.
const isNative = Capacitor.isNativePlatform()

// `import.meta.env` is always present under Vite; the `?? {}` keeps this module
// importable in plain Node too (unit tests, a future edge function) where it isn't.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

// True only when BOTH are present. Everything downstream checks this before
// assuming there's a backend to talk to.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Persist the session in localStorage and re-hydrate on load, so a
        // returning (already-authenticated) user opens straight into the app —
        // even with no network.
        persistSession: true,
        autoRefreshToken: true,
        // Web: token rides back on the redirect URL → let supabase-js read it.
        // Native: the token arrives via the custom scheme and we verify it
        // manually in nativeAuth.js, so disable auto-detection here.
        detectSessionInUrl: !isNative,
        flowType: 'pkce',
      },
    })
  : null
