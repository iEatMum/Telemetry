// faith-card.spec.js — R3: spiritual content is OPT-IN, un-scored, and closes
//
// the TRENDS page (M2 folded MIND into TRENDS). Off by default: no faith card.
// Turning the module on — through the real door (COMMAND → Settings → Modules) —
// composes exactly one FaithCard: a verse, a position, a cue. "Offered, not performed."

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

test('FaithCard appears on TRENDS only after the faith module is switched on', async ({ page }) => {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, {
    settings: { streakModel: 'avoidance', theme: 'terminal', modules: { faith: false, recovery: false, monk: false } },
  })
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()

  // OFF: TRENDS has no faith surface.
  await page.getByRole('tab', { name: 'Trends', exact: true }).click()
  await expect(page.getByText('Offered', { exact: true })).toHaveCount(0)

  // Opt in through Settings (COMMAND surface → Settings → Modules → Faith).
  await page.getByRole('button', { name: 'Command', exact: true }).click()
  await page.getByRole('button', { name: /settings — profile/i }).click()
  await page.getByRole('switch', { name: /faith/i }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()

  // ON: exactly one un-scored card — header, verse position, the cue line.
  await page.getByRole('button', { name: 'Deck', exact: true }).click()
  await page.getByRole('tab', { name: 'Trends', exact: true }).click()
  await expect(page.getByText('Offered', { exact: true })).toBeVisible()
  await expect(page.getByText(/offered, not performed/i)).toBeVisible()
})
