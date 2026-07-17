// seal.spec.js — the evening seal (Sync & Refactor) is CEREMONIAL, not a tap.
//
// Friction inversion: FINISH DAY opens a ConfirmSheet (framed by the tone
// engine's commit line) and only a 1.2s press-and-hold attests. Sealing flips
// the bar to the queued state, answers with one quiet toast, and holds — one
// seal per day, and reopening the app shows the queued state, never a second ask.

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

test('confirm sheet + hold → queued state, toast, and no second ask after reload', async ({ page }) => {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, { settings: { streakModel: 'avoidance', theme: 'terminal' } })
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()

  // Open the ceremony.
  const finish = page.getByRole('button', { name: /rule off the day/i })
  await finish.scrollIntoViewIfNeeded()
  await finish.click()
  await expect(page.getByText('Seal the day')).toBeVisible()

  // A tap on the hold button is NOT enough — the sheet stays.
  const hold = page.getByRole('button', { name: /hold to seal/i })
  await hold.click()
  await expect(page.getByText('Seal the day')).toBeVisible()

  // The 1.2s hold attests.
  const box = await hold.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()

  // Queued state + the acknowledgment toast.
  await expect(page.getByRole('button', { name: /ruled off/i })).toBeVisible()
  await expect(page.getByText(/tomorrow.s page is set/i)).toBeVisible({ timeout: 4000 })

  // One seal per day: after a reload the bar still shows queued, disabled.
  await page.reload()
  await expect(page.getByText('Open the night page')).toBeVisible()
  const queued = page.getByRole('button', { name: /ruled off/i })
  await queued.scrollIntoViewIfNeeded()
  await expect(queued).toBeDisabled()
})
