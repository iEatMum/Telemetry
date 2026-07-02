// playwright.config.js — E2E harness for the LOCKED IN PWA.
//
// What this config guarantees so the suites are deterministic and hermetic:
//
//  1. A dedicated dev server on its own port (E2E_PORT, default 5273) so a run
//     never collides with — or accidentally reuses — a `npm run dev` you already
//     have open on 5173 with your real .env.local creds.
//
//  2. STUB Supabase credentials injected via `webServer.env`. Vite gives real
//     environment variables higher priority than any `.env*` file, so these
//     override .env.local. The point: `isSupabaseConfigured` is TRUE (the
//     backend code paths are exercised) but the project ref is the fixed,
//     known value `stub` — see SUPABASE in tests/helpers.js. Every test then
//     intercepts *.supabase.co traffic, so nothing ever leaves the machine.
//
//  3. Mobile viewport + WebKit-ish UA — this ships as an iOS Capacitor wrap, so
//     we drive it at phone width.

import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT) || 5273
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  // Explicit so the UI/runner unambiguously registers both suites
  // (onboarding.spec.js, offline-fallback.spec.js). This matches the default,
  // but pinning it removes any doubt about discovery.
  testMatch: '**/*.spec.js',
  // The onboarding submit holds a 1.3s "PROCESSING" floor on purpose; give the
  // offline-fallback assertions comfortable headroom over that.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Phone-sized: this is a PWA wrapped for iOS.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],

  // Boot vite ourselves with the stub backend creds baked into the process env.
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Real env vars beat .env.local under Vite → these win. Fixed project ref
      // ("stub") keeps the auth storage key deterministic for the session seed.
      VITE_SUPABASE_URL: 'https://stub.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'stub-anon-key-for-e2e',
    },
  },
})
