// offline-fallback.spec.js — the core resilience contract.
//
// LOCKED IN is offline-first and fail-soft: when the AI Architect Edge Function
// is unreachable, the onboarding submit must NOT hang on the "Opening the book" screen or blank
// out — it must swallow the error and drop the user into the live deck rendered
// by the LOCAL deterministic builder (buildLiveLayout → LayoutHost).
//
// Setup required to genuinely exercise the failure:
//   • seed a fake Supabase session, or the Architect client short-circuits at its
//     `if (!session)` guard and never makes the call;
//   • enable AI consent on the LOADOUT step, or initialize() skips
//     buildInitialLayout();
//   • fail ALL Supabase traffic — the Edge Function (the headline mock) and also
//     the later ui_layouts read, so the deck can't be served a remote layout.

import { test } from '@playwright/test'
import {
  expect,
  stubSupabaseOffline,
  seedSupabaseSession,
  completeSurvey,
  initializeButton,
} from './helpers.js'

test('offline submit: Edge Function fails, app falls back to the local live deck', async ({ page }) => {
  await seedSupabaseSession(page) // before navigation → present at boot
  const calls = await stubSupabaseOffline(page, { architect: 'abort' })

  await page.goto('/?onboarding')
  // Walk the full 7-step diagnostic with AI consent ON so the Architect fires.
  await completeSurvey(page, { consent: true })

  // Submit → the opening screen appears.
  await initializeButton(page).click()
  await expect(page.getByText('Opening the book', { exact: false })).toBeVisible()

  // The app must escape the opening screen and land on the real gated app at '/'
  // (RequireSurvey sees the survey we just wrote and passes straight through).
  // A generous wait covers the ~1.3s opening-screen floor.
  await expect(page).not.toHaveURL(/onboarding/, { timeout: 15_000 })

  // The deck rendered by the LOCAL deterministic builder. A brand-new book
  // deals the minimal first page, so its signatures are:
  //   • the "First steps" orientation card (brand-new-only),
  //   • the block the survey just DICTATED, printed on the heat sheet — proof
  //     the local forge consumed the answers.
  await expect(page.getByText('Open the night page')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('First steps', { exact: true })).toBeVisible()
  await expect(page.getByText('Chem — study block')).toBeVisible()

  // The opening screen must be gone — we did not get stuck on it.
  await expect(page.getByText('Opening the book', { exact: false })).toHaveCount(0)

  // Proof the failure was real and caught: the Architect Edge Function was
  // actually called (and aborted), and at least one other Supabase read failed.
  expect(calls.architect, 'Architect Edge Function should have been invoked').toBeGreaterThanOrEqual(1)
  expect(calls.other, 'other Supabase calls should also have been intercepted').toBeGreaterThanOrEqual(1)
})

test('the live deck itself stays local when the layout fetch errors (500)', async ({ page }) => {
  // Same fallback, reached directly on the deck: ui_layouts SELECT errors out, so
  // useLayout() keeps source='default' and LiveDeck renders buildLiveLayout.
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page, { architect: 'error500' })

  await page.goto('/?demo=live')

  // A storeless demo boot is a brand-new book → the minimal first page.
  await expect(page.getByText('First steps', { exact: true })).toBeVisible()
  await expect(page.getByText('Open the night page')).toBeVisible()
  // Tabs from the local payload are present and navigable.
  await expect(page.getByRole('tab', { name: 'Trends' })).toBeVisible()
  await page.getByRole('tab', { name: 'Trends' }).click()
  await expect(page.getByText('Readiness · 14d')).toBeVisible()
  // Day-0 honesty (CONSTITUTION M1): an all-zero book has no tape to read, so
  // the sentiment card must be absent — never a computed score over no data.
  await expect(page.getByText('Internal Markets')).toHaveCount(0)
})
