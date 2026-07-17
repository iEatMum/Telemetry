// day0.spec.js — the day-0 override + profile-adaptive composition (spec §5/R4).
//
// After a reset, zero must never be the dominant numeral: for ALL profiles the
// forge promotes the lifetime StatRow to slot 1 of TODAY for 48h. On a clean
// streak the order follows the motivational profile instead — avoidance leads
// with the briefing/chain, accumulation always leads with the piles.

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

async function openDeck(page, slices) {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, slices)
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()
}

const cleanStreak = (daysAgo = 5) => ({
  startedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  cleanDates: ['2026-06-01', '2026-06-02'],
  resets: [],
  urgesSurvived: [{ at: '2026-06-02T21:00:00.000Z' }],
  bestSeconds: 12 * 86_400,
})

test('day-0: a reset within 48h promotes the lifetime piles to slot 1 (all profiles)', async ({ page }) => {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  await openDeck(page, {
    settings: { streakModel: 'avoidance', theme: 'terminal' },
    streak: { ...cleanStreak(), startedAt: hourAgo, resets: [{ at: hourAgo }] },
  })

  const lifetime = page.getByText('Lifetime', { exact: true })
  await expect(lifetime).toBeVisible()
  const lifetimeBox = await lifetime.boundingBox()
  const briefingBox = await page.getByText('Daily Briefing').boundingBox()
  expect(lifetimeBox.y).toBeLessThan(briefingBox.y)
})

test('clean avoidance deck: briefing leads, no lifetime row on TODAY', async ({ page }) => {
  await openDeck(page, {
    settings: { streakModel: 'avoidance', theme: 'terminal' },
    streak: cleanStreak(),
  })

  await expect(page.getByText('Daily Briefing')).toBeVisible()
  await expect(page.getByText('Lifetime', { exact: true })).toHaveCount(0)
})

test('accumulation leads with the lifetime piles even on a clean streak', async ({ page }) => {
  await openDeck(page, {
    settings: { streakModel: 'accumulation', theme: 'terminal' },
    streak: cleanStreak(),
  })

  const lifetime = page.getByText('Lifetime', { exact: true })
  await expect(lifetime).toBeVisible()
  const lifetimeBox = await lifetime.boundingBox()
  const briefingBox = await page.getByText('Daily Briefing').boundingBox()
  expect(lifetimeBox.y).toBeLessThan(briefingBox.y)
})
