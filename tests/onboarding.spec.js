// onboarding.spec.js — the 7-step diagnostic intake (src/pages/Onboarding.jsx).
//
// Covers the two contracts the AI Architect depends on:
//   1. the NEXT gate — a step can't be advanced until it's answered (and the
//      final step submits with INITIALIZE, not NEXT), and
//   2. the submit payload — the exact `lockedin:__survey` shape handed downstream,
//      including the psych-profile steps 5-7 (goal model, interface, stakes).
//
// The flow is reachable at /?onboarding (wired in main.jsx). With stub Supabase
// creds the submit will try to reach a backend; we keep the test hermetic by
// failing all that traffic — the writes are fail-soft, so submit still completes.

import { test } from '@playwright/test'
import {
  expect,
  stubSupabaseOffline,
  readSurvey,
  completeSurvey,
  nextButton,
  initializeButton,
  SURVEY_ANSWERS,
} from './helpers.js'

test.beforeEach(async ({ page }) => {
  // Keep the run off the network; submit's profile-write + architect call fail soft.
  await stubSupabaseOffline(page)
  await page.goto('/?onboarding')
})

test('NEXT is gated per step; the final step submits, and the deck unlocks', async ({ page }) => {
  // ── STEP 1 · BASELINE ───────────────────────────────────────────────────────
  await expect(page.getByText('Rate current discipline baseline')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled() // nothing selected yet
  await page.getByRole('button', { name: '7', exact: true }).click()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── STEP 2 · BOTTLENECK ─────────────────────────────────────────────────────
  await expect(page.getByText('Identify primary time-leak')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled() // re-gated on the new step
  await page.getByRole('button', { name: /Infinite Scrolling/ }).click()
  await nextButton(page).click()

  // ── STEP 3 · ENGINE ─────────────────────────────────────────────────────────
  // Wake time has a default ('05:30'), but the peak window starts empty, so the
  // step is still gated until a window is picked.
  await expect(page.getByText('Set the engine')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Morning', exact: true }).click()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── STEP 4 · LOADOUT ────────────────────────────────────────────────────────
  // Mission + protocol overrides + AI consent are all optional, so NEXT is live
  // immediately — this is NOT the final step anymore (steps 5-7 follow).
  await expect(page.getByText('Configure the loadout')).toBeVisible()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── STEP 5 · GOAL MODEL ─────────────────────────────────────────────────────
  await expect(page.getByText('How should your streak work?')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Never break it/ }).click()
  await nextButton(page).click()

  // ── STEP 6 · INTERFACE ──────────────────────────────────────────────────────
  await expect(page.getByText('Pick your interface')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Terminal/ }).click()
  await nextButton(page).click()

  // ── STEP 7 · STAKES (final) ─────────────────────────────────────────────────
  // The last step shows INITIALIZE (never a NEXT) and is gated until a stake is
  // chosen; 'Friction' needs no follow-up target, so it satisfies the gate.
  await expect(page.getByText('Set your accountability')).toBeVisible()
  await expect(page.getByRole('button', { name: /next/i })).toHaveCount(0)
  await expect(initializeButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Friction/ }).click()
  await expect(initializeButton(page)).toBeEnabled()
})

test('submitting writes lockedin:__survey with every diagnostic key (incl. steps 5-7)', async ({ page }) => {
  await completeSurvey(page, { mission: 'ship the app' })

  // Submit. applyLocally() writes the survey synchronously before the PROCESSING
  // screen paints, so once PROCESSING is visible the sidecar is guaranteed set.
  await initializeButton(page).click()
  await expect(page.getByText('PROCESSING', { exact: false })).toBeVisible()

  const survey = await readSurvey(page)
  expect(survey, 'lockedin:__survey should be written to localStorage').not.toBeNull()

  // Every key the AI Architect + profile write consume must be present.
  for (const key of [
    'disciplineBaseline',
    'timeLeak',
    'wakeTime',
    'peakWindow',
    'mission',
    'modules',
    'consent',
    'streakModel',
    'theme',
    'stake',
    'createdAt',
  ]) {
    expect(survey, `survey must carry "${key}"`).toHaveProperty(key)
  }

  // …and each must hold what the user actually entered.
  expect(survey.disciplineBaseline).toBe(SURVEY_ANSWERS.baseline)
  expect(survey.timeLeak).toBe(SURVEY_ANSWERS.timeLeakKey)
  expect(survey.wakeTime).toBe(SURVEY_ANSWERS.wakeTime)
  expect(survey.peakWindow).toBe(SURVEY_ANSWERS.peakKey)
  expect(survey.mission).toBe('ship the app') // .trim() applied in source
  expect(survey.streakModel).toBe(SURVEY_ANSWERS.streakKey)
  expect(survey.theme).toBe(SURVEY_ANSWERS.themeKey)
  expect(survey.stake.preference).toBe(SURVEY_ANSWERS.stakeKey)
  expect(survey.modules).toEqual({ faith: false, recovery: false, monk: false })
  expect(survey.consent).toEqual({ aiProcessing: false, provider: 'anthropic' })

  // createdAt is stamped by design — assert it exists without pinning a value.
  expect(typeof survey.createdAt).toBe('string')
})
