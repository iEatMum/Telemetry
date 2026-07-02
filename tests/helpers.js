// helpers.js — shared E2E plumbing for the LOCKED IN suites.
//
// The app is offline-first and fail-soft (see supabaseClient.js): it only talks
// to a backend when `isSupabaseConfigured` is true. playwright.config.js injects
// STUB creds so that flag is on, which means the real network paths run — and we
// must intercept every one of them so a test never touches a live project.

import { expect } from '@playwright/test'

// Mirrors the stub creds in playwright.config.js. supabase-js derives the auth
// storage key as `sb-${hostname.split('.')[0]}-auth-token`, so a fixed host of
// `stub.supabase.co` gives us the deterministic key below.
export const SUPABASE = {
  host: 'stub.supabase.co',
  storageKey: 'sb-stub-auth-token',
  // Every REST / auth / functions / realtime round-trip for the stub project.
  glob: '**/stub.supabase.co/**',
  // The Architect Edge Function specifically (supabase.functions.invoke('architect')).
  architectGlob: '**/functions/v1/architect**',
}

/**
 * Intercept ALL Supabase traffic for the stub project and fail it, simulating an
 * unreachable backend. The Architect Edge Function gets its own handler so a test
 * can both (a) choose the failure mode and (b) assert the call was actually made.
 *
 * Returns a live `calls` counter: { architect, other } — read it after the flow.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ architect?: 'abort' | 'error500' }} [opts]
 */
export async function stubSupabaseOffline(page, opts = {}) {
  const calls = { architect: 0, other: 0 }
  const mode = opts.architect || 'abort'

  // Register the CATCH-ALL first. Playwright tries the most-recently-added route
  // first, so the specific architect handler (added next) wins for its URL while
  // everything else falls here.
  await page.route(SUPABASE.glob, async (route) => {
    calls.other++
    await route.abort('failed')
  })

  // Headline mock: the Edge Function call fails. 'abort' = dropped connection
  // (true offline); 'error500' = the function reachable but erroring.
  await page.route(SUPABASE.architectGlob, async (route) => {
    calls.architect++
    if (mode === 'error500') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'architect unavailable' }),
      })
    } else {
      await route.abort('failed')
    }
  })

  return calls
}

/**
 * Seed a structurally-valid, far-future GoTrue session into localStorage BEFORE
 * the app boots, so `supabase.auth.getSession()` resolves truthy without a
 * network refresh. auth-js only requires an object carrying access_token /
 * refresh_token / expires_at, and skips the refresh when the token isn't expired.
 *
 * Without this the Architect client short-circuits at its `if (!session)` guard
 * and never issues the Edge Function request — so the failure we want to test
 * would never happen.
 */
export async function seedSupabaseSession(page) {
  await page.addInitScript((storageKey) => {
    const oneYear = 31_536_000
    const session = {
      access_token: 'e2e-fake-access-token',
      refresh_token: 'e2e-fake-refresh-token',
      token_type: 'bearer',
      expires_in: oneYear,
      expires_at: Math.floor(Date.now() / 1000) + oneYear, // never "expired"
      user: {
        id: '00000000-0000-4000-8000-000000000000',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'e2e@locked-in.test',
        app_metadata: { provider: 'email' },
        user_metadata: {},
      },
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(session))
    } catch {
      /* private mode — test will surface the failure downstream */
    }
  }, SUPABASE.storageKey)
}

/** Read + parse the survey sidecar the onboarding flow writes. */
export async function readSurvey(page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('lockedin:__survey')
    return raw ? JSON.parse(raw) : null
  })
}

/** The forward nav button on a non-final onboarding step. */
export function nextButton(page) {
  return page.getByRole('button', { name: /next/i })
}
/** The submit button — shown only on the final step (STEP 7 · STAKES). */
export function initializeButton(page) {
  return page.getByRole('button', { name: /initialize/i })
}

// The known answers completeSurvey() drives in, and what each must serialize to
// in the survey — so a spec can assert the payload against these.
export const SURVEY_ANSWERS = {
  baseline: 7,
  timeLeakLabel: /Infinite Scrolling/,
  timeLeakKey: 'infinite-scrolling',
  wakeTime: '06:15',
  peakLabel: 'Morning',
  peakKey: 'morning',
  streakLabel: /Never break it/,
  streakKey: 'avoidance',
  themeLabel: /Terminal/,
  themeKey: 'terminal',
  stakeLabel: /Friction/,
  stakeKey: 'friction',
}

/**
 * Walk the full 7-step diagnostic with the known SURVEY_ANSWERS, leaving the page
 * on STEP 7 with INITIALIZE actionable (the 'Friction' stake needs no target, so
 * the final gate is satisfied). `consent` flips the AI-personalization toggle on
 * STEP 4 (LOADOUT); `mission` fills the optional mission field there.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ consent?: boolean, mission?: string }} [opts]
 */
export async function completeSurvey(page, { consent = false, mission = '' } = {}) {
  // STEP 1 · BASELINE
  await page.getByRole('button', { name: String(SURVEY_ANSWERS.baseline), exact: true }).click()
  await nextButton(page).click()
  // STEP 2 · BOTTLENECK
  await page.getByRole('button', { name: SURVEY_ANSWERS.timeLeakLabel }).click()
  await nextButton(page).click()
  // STEP 3 · ENGINE — wake has a default; set a known one + pick a peak window
  await page.locator('input[type="time"]').fill(SURVEY_ANSWERS.wakeTime)
  await page.getByRole('button', { name: SURVEY_ANSWERS.peakLabel, exact: true }).click()
  await nextButton(page).click()
  // STEP 4 · LOADOUT — all optional; fill mission + flip AI consent when asked
  if (mission) await page.getByPlaceholder(/break 1:50/i).fill(mission)
  if (consent) await page.getByRole('button', { name: /Personalize with Claude/ }).click()
  await nextButton(page).click()
  // STEP 5 · GOAL MODEL
  await page.getByRole('button', { name: SURVEY_ANSWERS.streakLabel }).click()
  await nextButton(page).click()
  // STEP 6 · INTERFACE
  await page.getByRole('button', { name: SURVEY_ANSWERS.themeLabel }).click()
  await nextButton(page).click()
  // STEP 7 · STAKES — 'Friction' requires no target, so INITIALIZE goes live
  await page.getByRole('button', { name: SURVEY_ANSWERS.stakeLabel }).click()
}

// Re-export so specs import everything from one place.
export { expect }
