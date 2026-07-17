// onboarding.spec.js — the node-flow diagnostic intake (src/pages/Onboarding.jsx
// driving src/lib/onboardingFlow.json through flowResolver.js).
//
// Covers the two contracts the AI Architect depends on:
//   1. the NEXT gate — a node can't be advanced until it validates (and the
//      terminal node submits with INITIALIZE, not NEXT), and
//   2. the submit payload — the exact `lockedin:__survey` shape handed
//      downstream, including every new diagnostic key the Guardian seeds from.
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

test('NEXT is gated per node; the terminal node submits, and the deck unlocks', async ({ page }) => {
  // ── 01 · BASELINE (executionRate7d) ─────────────────────────────────────────
  await expect(page.getByText('How many of the last 7 days did you execute?')).toBeVisible()
  // The honest denominator starts at the deepest branch…
  await expect(page.getByText(/01\/16/)).toBeVisible()
  await expect(nextButton(page)).toBeDisabled() // nothing selected yet
  await page.getByRole('button', { name: '7', exact: true }).click()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 02 · PROTOCOLS (fork F2: 7 ≥ 6 skipped the anchor-habit node) ───────────
  // Modules + AI consent are all optional, so NEXT is live immediately.
  await expect(page.getByText('Configure your protocols')).toBeVisible()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 03 · TIME LEAK ──────────────────────────────────────────────────────────
  await expect(page.getByText('Identify your primary time-leak')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled() // re-gated on the new node
  await page.getByRole('button', { name: /Infinite Scrolling/ }).click()
  await nextButton(page).click()

  // ── 04 · DANGER WINDOW ──────────────────────────────────────────────────────
  await expect(page.getByText('When does the leak hit hardest?')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /After dinner/ }).click()
  await nextButton(page).click()

  // ── 05 · ENGINE ─────────────────────────────────────────────────────────────
  // Wake time has a default, but the peak window starts empty, so the node is
  // still gated until a window is picked.
  await expect(page.getByText('Set the engine')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Morning', exact: true }).click()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 06 · FOCUS GOAL (raw radios by the core-systems contract) ───────────────
  await expect(page.getByText('What is this mostly for?')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('radio', { name: /Deep work/ }).check()
  await nextButton(page).click()

  // ── 07 · DICTATION — gated until at least one block is WRITTEN ──────────────
  await expect(page.getByText('Dictate your day')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.locator('input[aria-label="Block 1"]').fill('Chem — study block')
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 08 · MISSION (optional) — left blank, so confidence is skipped (F4) ─────
  await expect(page.getByText('Name the mission')).toBeVisible()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 09 · SLIP RESPONSE ──────────────────────────────────────────────────────
  await expect(page.getByText('When a streak breaks, what does the tape show?')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Reset and move/ }).click()
  await nextButton(page).click()

  // ── 10 · GOAL MODEL ─────────────────────────────────────────────────────────
  await expect(page.getByText('How should your streak work?')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Never break it/ }).click()
  await nextButton(page).click()

  // ── 11 · INTERFACE ──────────────────────────────────────────────────────────
  await expect(page.getByText('Pick your interface')).toBeVisible()
  await expect(nextButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /Carbon/ }).click()
  await nextButton(page).click()

  // ── 12 · HEALTH LINK (optional) ─────────────────────────────────────────────
  await expect(page.getByText('Link your health data')).toBeVisible()
  await expect(nextButton(page)).toBeEnabled()
  await nextButton(page).click()

  // ── 13 · YOUR CORNER (terminal gate) ────────────────────────────────────────
  // The last node shows INITIALIZE (never a NEXT) and is gated until a choice
  // lands. 'A witness' opens name+phone follow-ups and stays gated until BOTH
  // are filled (a half-named witness is no witness); 'Just me' needs nothing.
  await expect(page.getByText('Set your accountability')).toBeVisible()
  // …and has SHRUNK to the walked path by the final page (elite path = 13
  // nodes): the counter can never strand at "13/16".
  await expect(page.getByText(/13\/13/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^next\b/i })).toHaveCount(0)
  await expect(initializeButton(page)).toBeDisabled()
  await page.getByRole('button', { name: /A witness/ }).click()
  await expect(initializeButton(page)).toBeDisabled()
  await page.getByLabel('Witness name').fill('Sam')
  await expect(initializeButton(page)).toBeDisabled()
  await page.getByLabel('Witness phone number').fill('+1 555 0100')
  await expect(initializeButton(page)).toBeEnabled()
  // Switching to 'Just me' drops the requirement — still enabled.
  await page.getByRole('button', { name: /Just me/ }).click()
  await expect(initializeButton(page)).toBeEnabled()
})

test('submitting writes lockedin:__survey with every diagnostic key', async ({ page }) => {
  await completeSurvey(page, { mission: 'ship the app' })

  // Submit. applyLocally() writes the survey synchronously before the opening
  // screen paints, so once "Opening the book" is visible the sidecar is guaranteed set.
  await initializeButton(page).click()
  await expect(page.getByText('Opening the book', { exact: false })).toBeVisible()

  const survey = await readSurvey(page)
  expect(survey, 'lockedin:__survey should be written to localStorage').not.toBeNull()

  // Every key the AI Architect + profile write + Guardian seed consume.
  for (const key of [
    'executionRate7d',
    'timeLeak',
    'dangerWindow',
    'wakeTime',
    'peakWindow',
    'focusGoal',
    'mission',
    'missionConfidence',
    'modules',
    'consent',
    'slipResponse',
    'streakModel',
    'theme',
    'healthIntegration',
    'stake',
    'createdAt',
  ]) {
    expect(survey, `survey must carry "${key}"`).toHaveProperty(key)
  }

  // …and each must hold what the user actually entered.
  expect(survey.executionRate7d).toBe(SURVEY_ANSWERS.executionRate7d)
  expect(survey.timeLeak).toBe(SURVEY_ANSWERS.timeLeakKey)
  expect(survey.dangerWindow).toBe(SURVEY_ANSWERS.dangerKey)
  expect(survey.wakeTime).toBe(SURVEY_ANSWERS.wakeTime)
  expect(survey.peakWindow).toBe(SURVEY_ANSWERS.peakKey)
  expect(survey.focusGoal).toBe(SURVEY_ANSWERS.focusKey)
  expect(survey.mission).toBe('ship the app') // .trim() applied in source
  expect(survey.missionConfidence).toBe(SURVEY_ANSWERS.missionConfidence)
  expect(survey.slipResponse).toBe(SURVEY_ANSWERS.slipKey)
  expect(survey.streakModel).toBe(SURVEY_ANSWERS.streakKey)
  expect(survey.theme).toBe(SURVEY_ANSWERS.themeKey)
  expect(survey.stake.preference).toBe(SURVEY_ANSWERS.stakeKey)
  expect(survey.modules).toEqual({ faith: false, recovery: false, monk: false })
  expect(survey.consent).toEqual({ aiProcessing: false, provider: 'anthropic' })

  // createdAt is stamped by design — assert it exists without pinning a value.
  expect(typeof survey.createdAt).toBe('string')
})

test('a named witness becomes a real accountability partner (the sweep-1 write-through)', async ({ page }) => {
  await completeSurvey(page)

  // Choose the witness instead of 'Just me' and put a real person down.
  await page.getByRole('button', { name: /A witness/ }).click()
  await page.getByLabel('Witness name').fill('Sam')
  await page.getByLabel('Witness phone number').fill('+1 555 0100')
  await initializeButton(page).click()
  await expect(page.getByText('Opening the book', { exact: false })).toBeVisible()

  // The survey records the stake…
  const survey = await readSurvey(page)
  expect(survey.stake.preference).toBe('witness')
  expect(survey.stake.target).toMatchObject({ name: 'Sam', phone: '+1 555 0100' })

  // …and the witness lands in settings.partners — the exact list the night
  // page's one-tap text and the HELP protocol read. No entry here would be
  // the phantom-stake failure this node was rebuilt to eliminate.
  const partners = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem('lockedin:settings') || '{}').partners || []
  )
  expect(partners).toHaveLength(1)
  expect(partners[0]).toMatchObject({ name: 'Sam', phone: '+1 555 0100' })
  expect(partners[0].id).toBeTruthy()
})
