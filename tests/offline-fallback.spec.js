// offline-fallback.spec.js — the core resilience contract.
//
// LOCKED IN is offline-first and fail-soft: when the AI Architect Edge Function
// is unreachable, the onboarding submit must NOT hang on "PROCESSING" or blank
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

  // Submit → PROCESSING appears.
  await initializeButton(page).click()
  await expect(page.getByText('PROCESSING', { exact: false })).toBeVisible()

  // The app must escape PROCESSING and land on the live deck (a full redirect to
  // /?demo=live in this demo build). A generous wait covers the ~1.3s floor.
  await expect(page).toHaveURL(/demo=live/, { timeout: 15_000 })

  // The deck rendered by the LOCAL deterministic builder. Its signatures:
  //   • the DailyBriefing date is stamped "<app-day> · live" (buildLiveLayout),
  //   • the hard-coded "Pulse" (KpiGrid) and "Targets" (GoalProgress) titles.
  await expect(page.getByText(/\d{4}-\d{2}-\d{2}.*live/)).toBeVisible()
  await expect(page.getByText('Pulse', { exact: true })).toBeVisible()
  await expect(page.getByText('Targets', { exact: true })).toBeVisible()

  // PROCESSING must be gone — we did not get stuck on it.
  await expect(page.getByText('PROCESSING', { exact: false })).toHaveCount(0)

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

  await expect(page.getByText('Pulse', { exact: true })).toBeVisible()
  await expect(page.getByText(/\d{4}-\d{2}-\d{2}.*live/)).toBeVisible()
  // Tabs from the local payload are present and navigable.
  await expect(page.getByRole('button', { name: 'Trends' })).toBeVisible()
  await page.getByRole('button', { name: 'Trends' }).click()
  await expect(page.getByText('Internal Markets')).toBeVisible()
})
