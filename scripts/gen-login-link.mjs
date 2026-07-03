// gen-login-link.mjs — mint a login for the iOS Simulator with NO email.
//
// Supabase's built-in SMTP hard-caps auth emails (~2/hour), which stalls
// Simulator testing. This sidesteps email entirely: the admin API generates a
// magic-link token, and we hand its token_hash straight to the app through the
// custom URL scheme — nativeAuth.js verifies it with verifyOtp (no PKCE
// verifier needed, no Safari hop, immune to link scanners and rate limits).
//
// Usage (service key stays in your shell env — NEVER commit or paste it in chat):
//   SUPABASE_SERVICE_ROLE_KEY='<from Dashboard → Project Settings → API>' \
//     ~/.local/node/bin/node scripts/gen-login-link.mjs you@email.com
//
// With a booted Simulator it opens the app signed-in automatically; otherwise
// it prints the deep link + the exact simctl command.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !serviceKey) {
  console.error(
    "usage: SUPABASE_SERVICE_ROLE_KEY='…' node scripts/gen-login-link.mjs you@email.com"
  )
  process.exit(1)
}

// Project URL from .env.local (only the URL — the anon key is not needed here).
let url
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
} catch {
  /* fall through */
}
if (!url) {
  console.error('could not read VITE_SUPABASE_URL from .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: 'telemetry://auth-callback' },
})
if (error) {
  console.error('generateLink failed:', error.message)
  process.exit(1)
}

const tokenHash = data?.properties?.hashed_token
if (!tokenHash) {
  console.error('no hashed_token in response — dump:', JSON.stringify(data?.properties || {}))
  process.exit(1)
}

// The direct-to-app link: iOS routes the scheme into Telemetry, nativeAuth.js
// runs verifyOtp({ token_hash, type: 'email' }) and the session is live.
const deepLink = `telemetry://auth-callback?token_hash=${tokenHash}&type=email`
console.log('\ndeep link:\n  ' + deepLink + '\n')

try {
  execFileSync('xcrun', ['simctl', 'openurl', 'booted', deepLink], { stdio: 'inherit' })
  console.log('→ opened in the booted Simulator. The app should now be signed in.')
} catch {
  console.log('no booted Simulator — run manually:\n  xcrun simctl openurl booted "' + deepLink + '"')
}
