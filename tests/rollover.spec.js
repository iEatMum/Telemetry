// rollover.spec.js — time travel across the 3am boundary (P1).
//
// The functionality tournament's sharpest finding was a whole class of bugs
// that only fire when the date changes: refactorPending never expiring (the
// day-2 killer), posted rows leaking across days. No spec ever advanced the
// clock — this one does, with Playwright's fixed-time fake (real timers keep
// running, so the 1.2s ceremony holds still work).

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

test('seal tonight → tomorrow the page turns: rule-off re-arms and the heat sheet is fresh', async ({ page }) => {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, {
    settings: {
      streakModel: 'avoidance',
      theme: 'terminal',
      dayBlocks: [{ id: 'd1', time: '09:00', block: 'Chem — study block', impact: 'high' }],
    },
  })
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()

  // Post a schedule row, then seal the day (real clock).
  await page.getByRole('button', { name: /chem — study block.*post/i }).click()
  await expect(page.getByRole('button', { name: /chem — study block.*undo/i })).toBeVisible()

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

  // ── Time travel: tomorrow, 12:00 — past the 3am rollover. ──────────────────
  const tomorrowNoon = new Date(Date.now() + 24 * 3600 * 1000)
  tomorrowNoon.setHours(12, 0, 0, 0)
  await page.clock.setFixedTime(tomorrowNoon)
  await page.reload()
  await expect(page.getByText('Open the night page')).toBeVisible()

  // The day-2 killer stays dead: yesterday's seal does NOT pin the button.
  const finish2 = page.getByRole('button', { name: /rule off the day/i })
  await finish2.scrollIntoViewIfNeeded()
  await expect(finish2).toBeEnabled()

  // And the posted row belongs to YESTERDAY's record — today's page is fresh.
  await expect(page.getByRole('button', { name: /chem — study block.*post\b/i })).toBeVisible()
})
