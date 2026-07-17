// widgets.js — bridge the live deck's DAILY BRIEFING stats into the native
// WidgetKit shared store so the iOS/Android home-screen widgets render the same
// numbers as the app. Mirrors notifications.js/health.js: fail-soft, native-only
// (no-ops cleanly on web / when the plugin isn't present).

import { Capacitor } from '@capacitor/core'
import { CapgoWidgetKit } from '@capgo/capacitor-widget-kit'

// Stable id for the single daily-briefing session shared with the widget extension.
const WIDGET_ID = 'daily-briefing'

// Push the current day's stats to the native layer. The widget reads this shared
// JSON state. `merge` keeps any other keys the widget extension may own.
export async function syncDailyBriefingWidget(impactScore, engagedPercent, cardsCompleted, daysOnBook) {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'web' }

  const state = {
    // daysOnBook is the widget's hero (the manila "DAYS ON THE BOOK n"); the
    // rest ride along for the medium family's secondary row.
    daysOnBook: Number(daysOnBook) || 0,
    impactScore: Number(impactScore) || 0,
    engagedPercent: Number(engagedPercent) || 0,
    cardsCompleted: Number(cardsCompleted) || 0,
    updatedAt: Date.now(),
  }

  try {
    // The session may not exist yet (first run / reinstall) — try to update the
    // shared state, and fall back to starting the session if there's none.
    try {
      await CapgoWidgetKit.updateWidgetSession({ widgetId: WIDGET_ID, state, merge: true })
    } catch {
      await CapgoWidgetKit.startWidgetSession({ widgetId: WIDGET_ID, kind: 'daily-briefing', state })
    }
    // Ask the home-screen widgets to redraw with the new numbers.
    await CapgoWidgetKit.reloadWidgets()
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}
