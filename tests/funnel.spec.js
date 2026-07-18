// funnel.spec.js — the PRODUCTION first-run, end to end (P1).
//
// Every other spec boots through the DEV-only /?demo=live or /?onboarding
// doors. This one walks the door an App Store user actually opens: '/' with an
// empty store → RequireSurvey routes into the interview → INITIALIZE →
// redirect to '/' → the deck mounts with the tour auto-open → the dictated
// block prints on the day-0 page → the day seals → a reload keeps the book.

import { test } from '@playwright/test'
import {
  expect,
  stubSupabaseOffline,
  completeSurvey,
  initializeButton,
  SURVEY_ANSWERS,
} from './helpers.js'

test('/ with no survey → interview → deck + tour → seal → reload keeps the book', async ({ page }) => {
  await stubSupabaseOffline(page)
  await page.goto('/')

  // The gate finds no survey and no sandbox snapshot (web) → the interview.
  await expect(page.getByText(/how many of the last 7 days/i)).toBeVisible()
  await completeSurvey(page)
  await initializeButton(page).click()

  // Processing → redirect to '/' → the REAL deck (no demo param), and the
  // first-run tour auto-opens exactly once.
  await expect(page.getByText(/this is a ledger, not a feed/i)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /skip/i }).click()

  // The day-0 page: the block the user dictated 60 seconds ago prints verbatim.
  await expect(page.getByText('Open the night page')).toBeVisible()
  await expect(page.getByText(SURVEY_ANSWERS.dayBlockTitle)).toBeVisible()

  // Rule off the day — the ceremony (tap opens the sheet, 1.2s hold attests).
  const finish = page.getByRole('button', { name: /rule off the day/i })
  await finish.scrollIntoViewIfNeeded()
  await finish.click()
  const hold = page.getByRole('button', { name: /hold to seal/i })
  const box = await hold.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByRole('button', { name: /ruled off/i })).toBeVisible()

  // A reload keeps everything: no interview, no tour replay, seal intact.
  await page.reload()
  await expect(page.getByText('Open the night page')).toBeVisible()
  await expect(page.getByText(/this is a ledger, not a feed/i)).toHaveCount(0)
  const queued = page.getByRole('button', { name: /ruled off/i })
  await queued.scrollIntoViewIfNeeded()
  await expect(queued).toBeDisabled()
})

test('a mid-interview kill resumes at the same step with answers intact', async ({ page }) => {
  await stubSupabaseOffline(page)
  await page.goto('/')
  await expect(page.getByText(/how many of the last 7 days/i)).toBeVisible()

  // Answer the baseline, advance one node, then "die".
  await page.getByRole('button', { name: '7', exact: true }).click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.reload()

  // The draft rehydrates: NOT back on the baseline question.
  await expect(page.getByText(/how many of the last 7 days/i)).toHaveCount(0)
  // And the walked step count survived (02/…, not 01/…).
  await expect(page.getByText(/02\//)).toBeVisible()
})
