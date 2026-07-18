// notifications.js — native local-notification scheduler (Capacitor).
//
// Bridges the Generative-UI layout into the phone's notification engine: it reads
// the active layout, finds the time-anchored blocks (ScheduleMatrix rows +
// DeepWorkTimer), and schedules one native local notification at each block's
// start time. On every new/refactored layout it CLEARS the previous set and
// schedules the fresh one (scheduleDailyBlocks, wired in LiveDeck).
//
// Fail-soft: on web / simulator / without permission it no-ops, so the dev build
// and the live demo are never affected. The ids we schedule are tracked in a
// sidecar localStorage key so "clear yesterday's" survives reloads.
//
// Local notifications need NO iOS entitlement or Info.plist key — just the
// runtime permission (the native prompt fired by ensureNotificationPermission).

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import * as storage from './storage.js'

const IDS_KEY = 'lockedin:__notif_ids' // sidecar — the ids we currently own

const native = () => Capacitor.isNativePlatform()

function loadIds() {
  try {
    const raw = localStorage.getItem(IDS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* none */
  }
  return []
}
function saveIds(ids) {
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify(ids))
  } catch {
    /* quota / private mode */
  }
}

// Stable positive 31-bit int id from a string key (LocalNotifications needs ints).
function idFor(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return (Math.abs(h) % 2000000000) + 1
}

// Parse "HH:MM" → { hour, minute }, or null if malformed. No today/tomorrow math:
// we schedule with the native `on` calendar trigger + repeats, so iOS fires at the
// next matching time and every day after.
function parseHM(timeStr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim())
  if (!m) return null
  const hour = +m[1]
  const minute = +m[2]
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

/**
 * Pull schedulable items out of a layout: every ScheduleMatrix row with a clock
 * time, plus a DeepWorkTimer that was given an explicit start (`at`/`time` — its
 * `minutes` is a duration, not a start). Only blocks with a parseable time count.
 */
export function notificationsFromLayout(layout) {
  const out = []
  const seen = new Set()
  for (const tab of (layout && layout.tabs) || []) {
    for (const block of tab.blocks || []) {
      if (!block || !block.id) continue

      if (block.type === 'ScheduleMatrix') {
        const rows = (block.config && block.config.rows) || []
        rows.forEach((r, i) => {
          const t = parseHM(r && r.time)
          if (!t) return
          const id = idFor(`${block.id}:${i}`)
          if (seen.has(id)) return
          seen.add(id)
          out.push({ id, title: 'Telemetry', body: `${r.time} · ${r.block || 'Scheduled block'}`, hour: t.hour, minute: t.minute })
        })
      } else if (block.type === 'DeepWorkTimer') {
        const cfg = block.config || {}
        const t = parseHM(cfg.at || cfg.time)
        if (!t) continue
        const id = idFor(block.id)
        if (seen.has(id)) continue
        seen.add(id)
        out.push({
          id,
          title: 'Telemetry · Deep Work',
          body: `${cfg.label || 'Deep Work'}${cfg.minutes ? ` — ${cfg.minutes}m` : ''}`,
          hour: t.hour,
          minute: t.minute,
        })
      }
    }
  }
  return out
}

/**
 * A stable signature of what WOULD be scheduled. Use as a React effect dep so we
 * only reschedule when the times actually change — not on every render.
 */
export function layoutScheduleKey(layout) {
  return notificationsFromLayout(layout)
    .map((n) => `${n.id}@${n.hour}:${n.minute}`)
    .sort()
    .join('|')
}

/** Check — and if needed request — the OS notification permission (native prompt).
 *  Only the PRIMER calls this (P3b): the raw iOS ask fires exactly once, after
 *  the user has read why, never ambiently from a scheduling pass. */
export async function ensureNotificationPermission() {
  if (!native()) return { granted: false, reason: 'web' }
  try {
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    return { granted: perm.display === 'granted' }
  } catch (error) {
    return { granted: false, reason: 'error', error }
  }
}

/** Permission state WITHOUT prompting: 'web' | 'granted' | 'denied' | 'prompt'. */
export async function notifPermission() {
  if (!native()) return 'web'
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display === 'granted') return 'granted'
    if (perm.display === 'denied') return 'denied'
    return 'prompt'
  } catch {
    return 'web'
  }
}

// LOCK-SCREEN PRIVACY (P3b): with the recovery module on (or the explicit
// toggle), reminder bodies go generic — a visible lock screen must never print
// a user-authored block name ("Phone out of the bedroom" reads like a story to
// a roommate). Defaults ON for recovery users, controllable in Settings.
export function privateReminders() {
  const s = storage.get('settings')
  return s.notifPrivacy ?? !!s.modules?.recovery
}
function applyPrivacy(items) {
  if (!privateReminders()) return items
  return items.map((n) => {
    const time = /^(\d{1,2}:\d{2})/.exec(n.body || '')
    return { ...n, title: 'Telemetry', body: time ? `${time[1]} · Scheduled block` : 'Scheduled block' }
  })
}

/**
 * THE engine. Clears the previously-scheduled block notifications (the ids we
 * own) and schedules the current layout's set at each block's start time. Safe to
 * call on every layout change; no-ops on web. Returns { ok, reason?, scheduled }.
 */
let lastLayout = null // what the primer reschedules the moment permission lands

export async function scheduleDailyBlocks(layout) {
  if (!native()) return { ok: false, reason: 'web', scheduled: 0 }
  lastLayout = layout

  // 1) Clear yesterday's (only the ids we previously scheduled — never anyone else's).
  const prev = loadIds()
  try {
    if (prev.length) await LocalNotifications.cancel({ notifications: prev.map((id) => ({ id })) })
  } catch {
    /* they may already have fired/expired — fine */
  }

  // 2) Permission — CHECK ONLY (P3b). The raw iOS prompt never fires from an
  // ambient scheduling pass; the primer (Guardian surface) owns the ask.
  const state = await notifPermission()
  if (state !== 'granted') {
    saveIds([])
    return { ok: false, reason: state === 'denied' ? 'denied' : 'unprimed', scheduled: 0 }
  }

  // 3) Schedule the layout's blocks — daily-repeating at each HH:MM.
  const items = applyPrivacy(notificationsFromLayout(layout))
  if (!items.length) {
    saveIds([])
    return { ok: true, scheduled: 0 }
  }
  try {
    await LocalNotifications.schedule({
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        // Daily-repeating: fires at the next HH:MM match and every day after, so a
        // user who never reopens the app still gets tomorrow's reminders.
        schedule: { on: { hour: n.hour, minute: n.minute }, repeats: true, allowWhileIdle: true },
      })),
    })
    saveIds(items.map((n) => n.id))
    return { ok: true, scheduled: items.length }
  } catch (error) {
    saveIds([])
    return { ok: false, reason: 'schedule-error', error, scheduled: 0 }
  }
}

// The name the layout hook calls — same engine, reads better at the call site.
export const syncNotificationsFromLayout = scheduleDailyBlocks

/** The primer's action (P3b): fire the ONE real iOS prompt, then immediately
 *  schedule the deck's reminders if it landed. Returns the resulting state. */
export async function enableNotifications() {
  const perm = await ensureNotificationPermission()
  if (perm.granted && lastLayout) await scheduleDailyBlocks(lastLayout)
  return perm.granted ? 'granted' : await notifPermission()
}

// Wipe support (MASTERPLAN P1): a data wipe must also silence the phone — a
// "fresh start" that still fires yesterday's block reminders (possibly naming
// a user-authored block) isn't fresh. Cancels every id we own (the layout set
// from the sidecar + the Guardian's fixed warn id 1900000077, defined in
// guardianEngine.js) BEFORE the sidecar itself is deleted by wipeAll. The ids
// are read synchronously up front, so the caller can fire-and-forget this and
// wipe localStorage immediately after without a race.
const GUARDIAN_WARN_ID = 1900000077
export async function cancelAllOwnedNotifications() {
  const ids = [...loadIds(), GUARDIAN_WARN_ID]
  if (!native()) return { ok: false, reason: 'web' }
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
    saveIds([])
    return { ok: true, cancelled: ids.length }
  } catch (error) {
    return { ok: false, reason: 'cancel-error', error }
  }
}
