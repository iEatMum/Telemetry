// sweep.spec.js — the second review panel's contracts (CONSTITUTION Amendment A1).
//
// Pins the sweep behaviors the rest of the suite doesn't reach:
//   • the milestone share card asks exactly once (sidecar-persisted dismissal)
//     and the hero Share hides on an empty book;
//   • a lapsed subscriber gets the winback paywall, never a false trial promise;
//   • the in-app legal documents actually open (App Review 3.1.2 depends on
//     these links being functional, from Settings AND over the paywall).

import { test } from '@playwright/test'
import { expect, stubSupabaseOffline, seedSupabaseSession, seedLocalStore } from './helpers.js'

async function openDeck(page, slices) {
  await seedSupabaseSession(page)
  await stubSupabaseOffline(page)
  await seedLocalStore(page, slices)
  await page.goto('/?demo=live')
  await expect(page.getByText('Open the night page')).toBeVisible()
}

// A 7-day book: today and the six days before it.
function sevenCleanDays() {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

test('day-7 milestone card asks exactly once; the hero Share exists on a real book', async ({ page }) => {
  await openDeck(page, {
    streak: {
      startedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      cleanDates: sevenCleanDays(),
      resets: [],
      urgesSurvived: [],
    },
  })

  // The moment: day 7 on the book, offered once.
  await expect(page.getByText('Day 7 on the book')).toBeVisible()
  await expect(page.getByText('A page worth showing.')).toBeVisible()
  // The hero Share affordance exists on a non-empty book.
  await expect(page.getByRole('button', { name: /share the book page/i })).toBeVisible()

  // Dismissing settles the milestone in the sidecar…
  await page.getByRole('button', { name: /not now/i }).click()
  await expect(page.getByText('Day 7 on the book')).toHaveCount(0)
  const sidecar = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('lockedin:__share_milestones') || '{}')
  )
  expect(sidecar['7']).toBe(true)

  // …and it stays settled across a reload — asks exactly once, never nags.
  await page.reload()
  await expect(page.getByText('Open the night page')).toBeVisible()
  await expect(page.getByText('Day 7 on the book')).toHaveCount(0)
})

test('an empty book offers no Share and no milestone card', async ({ page }) => {
  await openDeck(page, {})
  await expect(page.getByRole('button', { name: /share the book page/i })).toHaveCount(0)
  await expect(page.getByText('A page worth showing.')).toHaveCount(0)
})

test('a lapsed subscriber sees the winback page, not a false trial promise', async ({ page }) => {
  await openDeck(page, {
    __coach: { status: 'expired', productId: 'telemetry.coach.yearly', source: 'dev-mock' },
  })

  await page.getByRole('button', { name: 'Trends' }).click()
  await page
    .getByRole('button', { name: /open the coach/i })
    .first()
    .click()

  await expect(page.getByText('The contract lapsed.')).toBeVisible()
  await expect(page.getByText('The book never closed.')).toBeVisible()
  await expect(page.getByRole('button', { name: /re-hire the coach/i })).toBeVisible()
  await expect(page.getByText(/charged now/i)).toBeVisible()
  // The winback page never dangles the trial it can't promise.
  await expect(page.getByRole('button', { name: /start 7 days free/i })).toHaveCount(0)
})

test('the fine print opens from Settings and from the paywall (3.1.2 functional links)', async ({ page }) => {
  await openDeck(page, {})

  // Settings → Privacy policy.
  await page.getByRole('button', { name: 'Command', exact: true }).click()
  await page.getByRole('button', { name: /settings — profile/i }).click()
  await page.getByRole('button', { name: 'Privacy policy' }).click()
  const dialog = page.getByRole('dialog', { name: /privacy policy/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/your book stays on your device/i)).toBeVisible()
  // Escape closes ONLY the top dialog (the fine print), leaving Settings — which
  // is itself now a dialog — open beneath it (useModalDismiss LIFO stack).
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /privacy policy/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Done' }).click()

  // Paywall → Terms of use, rendered OVER the open paywall. (Back to the deck
  // first — the Trends tab lives on the deck surface, not Command.)
  await page.getByRole('button', { name: 'Deck', exact: true }).click()
  await page.getByRole('button', { name: 'Trends' }).click()
  await page
    .getByRole('button', { name: /open the coach/i })
    .first()
    .click()
  await page.getByRole('button', { name: 'Terms of use' }).click()
  const terms = page.getByRole('dialog', { name: /terms of use/i })
  await expect(terms).toBeVisible()
  await expect(terms.getByText(/not medical care/i)).toBeVisible()
})
