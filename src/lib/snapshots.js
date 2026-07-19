// snapshots.js — the book's crash barrier (MASTERPLAN Phase 1 · "the book survives").
//
// localStorage inside a WKWebView is EVICTABLE: iOS can purge website data under
// storage pressure, and with no accounts and no server in v1, that purge would be
// the whole book — months of a user's record, gone. This module keeps a rolling
// snapshot of the entire lockedin: keyspace in the app sandbox (Directory.Data),
// which iOS treats as real app data: never purged like web storage, included in
// device backups.
//
// Design choices that matter:
//   · The snapshot is a RAW IMAGE — every `lockedin:` key's exact string value —
//     not exportAll(). A restore reproduces the store byte-for-byte: sidecars
//     (__survey, __guardian, __engagement…) and private handover drafts included.
//     That's correct here because the sandbox file has the same owner, device,
//     and protection class as localStorage itself — unlike the PORTABLE export,
//     which strips drafts because it's built to leave the device.
//   · One file per app-day, keep the last 3. A same-day rewrite overwrites in
//     place, so a bad afternoon can't push out last night's good copy.
//   · An EMPTY store never writes a snapshot — the backstop must not let a
//     post-eviction blank boot overwrite the very copy it exists to restore.
//   · wipeAll's "fresh start leaves nothing behind" promise extends to disk:
//     deleteAllSnapshots() rides along with every wipe (store.jsx).
//
// Fail-soft everywhere; every call is a no-op on web.

import { Capacitor } from '@capacitor/core'
import { appDayKey } from './dates.js'

const PREFIX = 'lockedin:'
const DIR = 'snapshots'
const KEEP = 3

const native = () => Capacitor.isNativePlatform()

// Dynamic import keeps the plugin out of web bundles' hot path (same idiom as
// guardianEngine's LocalNotifications import).
async function fs() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  return { Filesystem, Directory, Encoding }
}

// The raw image of everything under lockedin:. Exported for tests.
export function snapshotImage() {
  const keys = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys[k] = localStorage.getItem(k)
    }
  } catch {
    /* enumeration unavailable — snapshot stays empty and writeSnapshot refuses */
  }
  return { at: new Date().toISOString(), day: appDayKey(), keys }
}

export async function writeSnapshot() {
  if (!native()) return { ok: false, reason: 'web' }
  const image = snapshotImage()
  if (!Object.keys(image.keys).length) return { ok: false, reason: 'empty-store' }
  // No interview → no book. Right after a wipe the store re-seeds defaults
  // (settings/streak/tasks) within milliseconds; snapshotting that would make
  // a deliberately-erased book "recoverable" at the next boot.
  if (!image.keys['lockedin:__survey']) return { ok: false, reason: 'no-book' }
  try {
    const { Filesystem, Directory, Encoding } = await fs()
    await Filesystem.writeFile({
      path: `${DIR}/book-${image.day}.json`,
      data: JSON.stringify(image),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    await prune(Filesystem, Directory)
    return { ok: true, day: image.day }
  } catch (error) {
    return { ok: false, reason: 'fs-error', error }
  }
}

// Snapshot filenames sort chronologically (book-YYYY-MM-DD.json), oldest first.
async function listNames(Filesystem, Directory) {
  const { files } = await Filesystem.readdir({ path: DIR, directory: Directory.Data })
  return files
    .map((f) => (typeof f === 'string' ? f : f.name))
    .filter((n) => /^book-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort()
}

async function prune(Filesystem, Directory) {
  try {
    const names = await listNames(Filesystem, Directory)
    for (const n of names.slice(0, Math.max(0, names.length - KEEP))) {
      await Filesystem.deleteFile({ path: `${DIR}/${n}`, directory: Directory.Data })
    }
  } catch {
    /* prune is best-effort; an extra file is not a failure */
  }
}

// Newest readable snapshot, or null. Walks backward so one corrupt file doesn't
// hide an older good one.
export async function latestSnapshot() {
  if (!native()) return null
  try {
    const { Filesystem, Directory, Encoding } = await fs()
    const names = await listNames(Filesystem, Directory)
    for (const n of names.reverse()) {
      try {
        const { data } = await Filesystem.readFile({ path: `${DIR}/${n}`, directory: Directory.Data, encoding: Encoding.UTF8 })
        const snap = JSON.parse(typeof data === 'string' ? data : '')
        // Only a snapshot carrying an interview counts as a restorable book.
        if (snap && snap.keys && snap.keys['lockedin:__survey']) return snap
      } catch {
        /* damaged file — try the next-oldest */
      }
    }
    return null
  } catch {
    return null
  }
}

// Write a snapshot's raw image back into localStorage. The caller reloads the
// app afterward so every module-level cache re-reads the restored store.
export function restoreSnapshot(snap) {
  if (!snap || !snap.keys) return false
  let wrote = 0
  for (const [k, v] of Object.entries(snap.keys)) {
    if (!k.startsWith(PREFIX) || typeof v !== 'string') continue
    try {
      localStorage.setItem(k, v)
      wrote++
    } catch {
      /* quota — restore as much as fits; the model keys are written first-come */
    }
  }
  return wrote > 0
}

export async function deleteAllSnapshots() {
  if (!native()) return
  try {
    const { Filesystem, Directory } = await fs()
    await Filesystem.rmdir({ path: DIR, directory: Directory.Data, recursive: true })
  } catch {
    /* nothing there — a wipe on a fresh install */
  }
}
