// outlast.spec.js — the OUTLAST IT behavioral contract (design handoff §8).
//
// The two exits carry inverted friction by design:
//   • staying is one tap once the ride is real — "I stayed" arms after
//     STAY_ARM_SECONDS (3s in DEV) so the pile can't be tapped up in seconds;
//   • logging the slip costs 1.2 deliberate seconds — a hold that sweeps L→R, and
//     releasing early cancels at ZERO cost (nothing logged, nothing reset).
// The slipped close is the one-voice screen: LOGGED · THE BOOK STAYS OPEN,
// STILL YOURS, crisis line kept in reach — and the reset it logs is the
// forge's loss-attribution signal.

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

async function openDeck(page, slices) {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, slices)
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()
}

// HELP now opens on the LANDING frame (P1): a still page — no clock, nothing
// logged — until "Start the ride". Every ride-contract test walks through it.
async function startRide(page) {
  await page.getByRole('button', { name: /help now/i }).click()
  await expect(page.getByText(/that was the hard part/i)).toBeVisible()
  await page.getByRole('button', { name: /start the ride/i }).click()
  await expect(page.getByText(/outlast it/i).first()).toBeVisible()
}

async function holdFor(page, locator, ms) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

const readStreak = (page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('lockedin:streak') || '{}'))

test('hold-to-log-the-slip: early release cancels free; completing closes the position calmly', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'avoidance', theme: 'terminal' } })

  await startRide(page)

  const hold = page.getByRole('button', { name: /hold to log the slip/i })

  // Release at 400ms — well under the 1200ms price. Nothing happens, nothing logs.
  await holdFor(page, hold, 400)
  await expect(page.getByText(/logged · the book stays open/i)).toHaveCount(0)
  expect((await readStreak(page)).resets || []).toHaveLength(0)

  // Pay the full price. The close is muted and one-voice — and never red.
  await holdFor(page, hold, 1700)
  await expect(page.getByText(/logged · the book stays open/i)).toBeVisible()
  await expect(page.getByText(/still yours/i)).toBeVisible()
  // The crisis line survives onto the highest-risk screen in the app.
  await expect(page.getByRole('link', { name: /call 988/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /text 988/i })).toBeVisible()
  expect((await readStreak(page)).resets || []).toHaveLength(1)

  // Back to the deck — which now runs the day-0 composition (lifetime first).
  await page.getByRole('button', { name: /back to the deck/i }).click()
  await expect(page.getByText('Lifetime', { exact: true })).toBeVisible()
})

test('staying is one tap once armed: the WIN logs and grows the pile', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'accumulation', theme: 'terminal' } })

  await startRide(page)
  // The exit is DISABLED until STAY_ARM_SECONDS (3s in DEV) — a drive-by tap
  // can't inflate the pile. The stable unarmed name proves the gate…
  await expect(
    page.getByRole('button', { name: /i stayed — unlocks after the first minute/i })
  ).toBeDisabled()
  // …and the click waits out the arm before it can land.
  await page.getByRole('button', { name: /i stayed/i }).click({ timeout: 10_000 })

  await expect(page.getByText(/position held/i)).toBeVisible()
  await expect(page.getByText('Urges outlasted', { exact: true })).toBeVisible()
  expect(((await readStreak(page)).urgesSurvived || []).length).toBe(1)

  await page.getByRole('button', { name: /back to the deck/i }).click()
  await expect(page.getByText('Open the night page')).toBeVisible()
})

test('protocol steps unlock strictly in order', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'engagement', theme: 'terminal' } })

  await startRide(page)

  // The crisis line rides the ACTIVE screen too, not just the slipped close.
  await expect(page.getByRole('link', { name: /call 988/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /text 988/i })).toBeVisible()

  const steps = page.locator('ol button')
  await expect(steps.nth(0)).toBeEnabled()
  await expect(steps.nth(1)).toBeDisabled()

  await steps.nth(0).click()
  await expect(steps.nth(1)).toBeEnabled()
})

test('the quiet ✕ escape logs nothing — an accidental open forces no verdict', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'engagement', theme: 'terminal' } })

  // Even from a STARTED ride, ✕ writes nothing to the streak and leaves no
  // resumable ride behind.
  await startRide(page)
  await page.getByRole('button', { name: 'Close' }).click()

  await expect(page.getByText('Open the night page')).toBeVisible()
  const streak = await readStreak(page)
  expect(streak.resets || []).toHaveLength(0)
  expect(streak.urgesSurvived || []).toHaveLength(0)
  const ride = await page.evaluate(() => window.localStorage.getItem('lockedin:__urge'))
  expect(ride).toBeNull()
})

test('a killed ride RESUMES: reload mid-protocol reopens the night page with progress intact', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'engagement', theme: 'terminal' } })

  await startRide(page)
  const steps = page.locator('ol button')
  await steps.nth(0).click() // step 1 done
  // Simulate a process death mid-ride.
  await page.reload()
  // The shell reopens the ride on boot — no HELP tap needed — with the clock
  // continuing (wall-anchored) and step 1 still marked.
  await expect(page.getByText(/outlast it/i).first()).toBeVisible()
  await expect(page.locator('ol button').nth(1)).toBeEnabled()
})

test('the landing frame starts nothing: opening HELP and leaving logs no invocation', async ({ page }) => {
  await openDeck(page, { settings: { streakModel: 'engagement', theme: 'terminal' } })

  await page.getByRole('button', { name: /help now/i }).click()
  await expect(page.getByText(/that was the hard part/i)).toBeVisible()
  // Crisis line is reachable WITHOUT starting a protocol.
  await expect(page.getByRole('link', { name: /call 988/i })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('Open the night page')).toBeVisible()
  const inv = await page.evaluate(() => {
    const g = JSON.parse(window.localStorage.getItem('lockedin:__guardian') || '{}')
    return (g.invocations || []).length
  })
  expect(inv).toBe(0)
})
