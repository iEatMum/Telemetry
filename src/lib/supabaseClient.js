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
        // even with no network. Magic-link tokens arrive in the URL on redirect;
        // detectSessionInUrl picks them up automatically.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
