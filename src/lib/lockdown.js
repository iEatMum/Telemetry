// lockdown.js — the web seam for the ScreenGuard native module (Phase 3c).
//
// The shield is FREE-tier: it's a device capability, not an AI cost, and it's
// the reason a distracted 1am user downloads this app instead of scrolling.
// The coach (paid) is the AI read layered on top.
//
// Fail-soft contract like every native seam: on web/simulator, every call
// resolves to an honest { available:false } / { ok:false } — never throws.
// The plugin itself lives in ios/App/App/ScreenGuardPlugin.swift; the
// danger-window schedule additionally needs the TelemetryGuard extension
// target (ios/App/TelemetryGuard/README.md).

import { Capacitor, registerPlugin } from '@capacitor/core'

const ScreenGuard = registerPlugin('ScreenGuard')
const native = () => Capacitor.isNativePlatform()

/** { available, authorization:'approved'|'denied'|'notDetermined', selectionCount, shieldActive, scheduled } */
export async function guardStatus() {
  if (!native()) return { available: false }
  try {
    return await ScreenGuard.status()
  } catch {
    return { available: false } // plugin not registered in this binary
  }
}

/** Fires the system Screen Time consent sheet. { authorization, error? } */
export async function requestGuardAuth() {
  if (!native()) return { authorization: 'unavailable' }
  try {
    return await ScreenGuard.requestAuthorization()
  } catch (error) {
    return { authorization: 'denied', error }
  }
}

/** Opens Apple's FamilyActivityPicker. Resolves { saved, selectionCount } —
 *  the selection itself is opaque tokens we never see. */
export async function pickShieldedApps() {
  if (!native()) return { saved: false, selectionCount: 0 }
  try {
    return await ScreenGuard.presentPicker()
  } catch {
    return { saved: false, selectionCount: 0 }
  }
}

export async function shieldNow() {
  if (!native()) return { ok: false, reason: 'web' }
  try {
    return await ScreenGuard.shieldNow()
  } catch {
    return { ok: false, reason: 'plugin' }
  }
}

export async function liftShield() {
  if (!native()) return { ok: false, reason: 'web' }
  try {
    return await ScreenGuard.liftShield()
  } catch {
    return { ok: false, reason: 'plugin' }
  }
}

export async function armWindow({ startHour, startMinute = 0, endHour, endMinute = 0 }) {
  if (!native()) return { ok: false, reason: 'web' }
  try {
    return await ScreenGuard.scheduleWindow({ startHour, startMinute, endHour, endMinute })
  } catch {
    return { ok: false, reason: 'plugin' }
  }
}

export async function disarmWindow() {
  if (!native()) return { ok: false, reason: 'web' }
  try {
    return await ScreenGuard.cancelSchedule()
  } catch {
    return { ok: false, reason: 'plugin' }
  }
}

// The survey's danger window → a concrete default schedule ("HH:MM"–"HH:MM").
// Just a STARTING point the user edits — the book never invents a life.
export function windowDefaults(dangerWindow, wakeTime = '06:45') {
  const wakeH = parseInt(String(wakeTime).split(':')[0], 10) || 6
  switch (dangerWindow) {
    case 'post-wake':
      return { start: `${String(wakeH).padStart(2, '0')}:00`, end: `${String((wakeH + 2) % 24).padStart(2, '0')}:00` }
    case 'midday-slump':
      return { start: '13:00', end: '16:00' }
    case 'evening':
      return { start: '19:00', end: '22:00' }
    case 'late-night':
    default:
      return { start: '22:00', end: '02:00' }
  }
}
