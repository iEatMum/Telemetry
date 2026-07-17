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

/**
 * Seed the local-first store BEFORE boot so a spec lands on a deterministic
 * deck without walking onboarding. `slices` are raw slice values written to
 * `lockedin:<name>` (storage.get merges them over the app defaults on read):
 * e.g. { settings: { streakModel: 'avoidance' }, streak: {...} }. Also writes
 * the survey sidecar so RequireSurvey passes instantly on gated routes.
 */
export async function seedLocalStore(page, slices = {}) {
  await page.addInitScript((data) => {
    try {
      window.localStorage.setItem(
        'lockedin:__survey',
        JSON.stringify({ seeded: true, createdAt: '2026-01-01T00:00:00.000Z' })
      )
      // A seeded device is not a first run: mark the tour seen, or its
      // full-screen overlay sits above every deck interaction the spec drives.
      window.localStorage.setItem('lockedin:__tour', '1')
      for (const [name, value] of Object.entries(data)) {
        window.localStorage.setItem(`lockedin:${name}`, JSON.stringify(value))
      }
    } catch {
      /* private mode — the spec will surface it downstream */
    }
  }, slices)
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
  // Anchored: option copy can legitimately contain the word "next" (e.g. the
  // slip-response sub "back on the next block"), so match the nav label only.
  return page.getByRole('button', { name: /^next\b/i })
}
/** The submit button — shown only on the final step (STEP 7 · STAKES). */
export function initializeButton(page) {
  return page.getByRole('button', { name: /initialize/i })
}

// The known answers completeSurvey() drives in, and what each must serialize to
// in the survey — so a spec can assert the payload against these.
export const SURVEY_ANSWERS = {
  executionRate7d: 7,
  timeLeakLabel: /Infinite Scrolling/,
  timeLeakKey: 'infinite-scrolling',
  dangerLabel: /After dinner/,
  dangerKey: 'evening',
  wakeTime: '06:15',
  peakLabel: 'Morning',
  peakKey: 'morning',
  focusLabel: /Deep work/,
  focusKey: 'work',
  dayBlockTitle: 'Chem — study block',
  dayBlockTime: '09:00',
  missionConfidence: 7,
  slipLabel: /Reset and move/,
  slipKey: 'shrug',
  streakLabel: /Never break it/,
  streakKey: 'avoidance',
  themeLabel: /Carbon/,
  themeKey: 'carbon',
  stakeLabel: /Just me/,
  stakeKey: 'none',
}

/**
 * Walk the node-flow diagnostic (onboardingFlow.json) with the known
 * SURVEY_ANSWERS, leaving the page on YOUR CORNER with INITIALIZE actionable
 * (the 'Just me' choice needs no witness details, so the final gate is
 * satisfied).
 *
 * The walk takes the high-performer path: executionRate7d = 7 (≥6) routes
 * straight to protocols, skipping the anchor-habit node (fork F2); 'After
 * dinner' avoids the recovery counter-move branch (F3); an empty mission skips
 * the confidence node (F4) — passing `mission` adds it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ consent?: boolean, mission?: string }} [opts]
 */
export async function completeSurvey(page, { consent = false, mission = '' } = {}) {
  // 01 · BASELINE — executionRate7d
  await page
    .getByRole('button', { name: String(SURVEY_ANSWERS.executionRate7d), exact: true })
    .click()
  await nextButton(page).click()
  // 02 · PROTOCOLS — modules + AI consent, all optional (toggles are switches)
  if (consent) await page.getByRole('switch', { name: /Personalize with Claude/ }).click()
  await nextButton(page).click()
  // 03 · TIME LEAK
  await page.getByRole('button', { name: SURVEY_ANSWERS.timeLeakLabel }).click()
  await nextButton(page).click()
  // 04 · DANGER WINDOW
  await page.getByRole('button', { name: SURVEY_ANSWERS.dangerLabel }).click()
  await nextButton(page).click()
  // 05 · ENGINE — wake has a default; set a known one + pick a peak window
  await page.locator('input[type="time"]').fill(SURVEY_ANSWERS.wakeTime)
  await page.getByRole('button', { name: SURVEY_ANSWERS.peakLabel, exact: true }).click()
  await nextButton(page).click()
  // 06 · FOCUS GOAL — raw radios (unstyled by the core-systems contract)
  await page.getByRole('radio', { name: SURVEY_ANSWERS.focusLabel }).check()
  await nextButton(page).click()
  // 07 · DICTATION — at least one written block is required to advance
  await page.locator('input[aria-label="Block 1 time (optional)"]').fill(SURVEY_ANSWERS.dayBlockTime)
  await page.locator('input[aria-label="Block 1"]').fill(SURVEY_ANSWERS.dayBlockTitle)
  await nextButton(page).click()
  // 08 · MISSION (optional) — a truthy mission routes through confidence (F4)
  if (mission) await page.getByPlaceholder(/break 1:50/i).fill(mission)
  await nextButton(page).click()
  if (mission) {
    await page
      .getByRole('button', { name: String(SURVEY_ANSWERS.missionConfidence), exact: true })
      .click()
    await nextButton(page).click()
  }
  // 08 · SLIP RESPONSE
  await page.getByRole('button', { name: SURVEY_ANSWERS.slipLabel }).click()
  await nextButton(page).click()
  // 09 · STREAK MODEL
  await page.getByRole('button', { name: SURVEY_ANSWERS.streakLabel }).click()
  await nextButton(page).click()
  // 10 · THEME
  await page.getByRole('button', { name: SURVEY_ANSWERS.themeLabel }).click()
  await nextButton(page).click()
  // 11 · HEALTH LINK — optional, skip
  await nextButton(page).click()
  // 12 · YOUR CORNER — 'Just me' requires no witness, so INITIALIZE goes live
  await page.getByRole('button', { name: SURVEY_ANSWERS.stakeLabel }).click()
}

// Re-export so specs import everything from one place.
export { expect }
