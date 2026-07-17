// browser.js — thin wrappers around device/browser APIs.
//
// Kept in one place so the screens read cleanly and so the "why" of each
// platform quirk is documented once. Everything here degrades gracefully:
// if an API is missing, the function no-ops instead of throwing.

export function isIOS() {
  return (
    /iP(hone|ad|od)/.test(navigator.platform || '') ||
    (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1) ||
    /iPhone|iPad|iPod/.test(navigator.userAgent || '')
  )
}

// Build an SMS deep link with a prefilled body. iOS and Android disagree on the
// separator before `body`, so we branch. `&` works on iOS, `?` on Android.
export function smsLink(phone, body) {
  const num = (phone || '').replace(/[^\d+]/g, '')
  const sep = isIOS() ? '&' : '?'
  return `sms:${num}${sep}body=${encodeURIComponent(body || '')}`
}

// ---- Notifications ---------------------------------------------------------
export function notificationsSupported() {
  return typeof Notification !== 'undefined'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function notify(title, body) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icons/pwa-192.png', badge: '/icons/pwa-192.png' })
  } catch {
    /* some browsers require notifications via the SW only — ignore */
  }
}

// ---- Sprint-end sound ------------------------------------------------------
// Browsers block audio that doesn't originate from a user gesture. So we
// "unlock" the element on the Start tap, then it's free to play when the timer
// finishes minutes later. A Web Audio beep is the fallback if the file fails.
let audioEl = null
let audioCtx = null

export function prepareSound() {
  if (!audioEl) {
    audioEl = new Audio('/sounds/sprint-end.wav')
    audioEl.preload = 'auto'
  }
  // Also unlock a shared AudioContext NOW, inside the tap gesture, so the beep
  // fallback can actually sound minutes later. A fresh iOS AudioContext created
  // at finish time starts 'suspended' and stays silent.
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx && !audioCtx) audioCtx = new Ctx()
    audioCtx?.resume?.()
  } catch {
    /* ignore */
  }
  // Play-then-pause within the gesture to satisfy autoplay policies.
  const p = audioEl.play()
  if (p && typeof p.then === 'function') {
    p.then(() => {
      audioEl.pause()
      audioEl.currentTime = 0
    }).catch(() => {})
  }
}

export function playSound() {
  if (audioEl) {
    audioEl.currentTime = 0
    const p = audioEl.play()
    if (p && typeof p.catch === 'function') p.catch(() => beep())
  } else {
    beep()
  }
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = audioCtx || (Ctx ? new Ctx() : null)
    if (!ctx) return
    ctx.resume?.() // safe even if already running
    const tones = [880, 1320]
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.3, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.18)
    })
  } catch {
    /* nothing else we can do */
  }
}

// ---- Screen wake lock (keep the screen on during a sprint) -----------------
let wakeLock = null

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      // The OS drops the lock when the tab is hidden; re-acquire on return.
      wakeLock.addEventListener?.('release', () => {})
    }
  } catch {
    wakeLock = null
  }
}

export async function reacquireWakeLockIfNeeded() {
  if (document.visibilityState === 'visible' && wakeLock && wakeLock.released) {
    await requestWakeLock()
  }
}

export function releaseWakeLock() {
  try {
    wakeLock?.release?.()
  } catch {
    /* ignore */
  }
  wakeLock = null
}

// ---- iOS Focus trigger -----------------------------------------------------
// A web app can't silence the phone itself. But it CAN ask the Shortcuts app to
// run a shortcut named e.g. "Sprint" that turns on a Focus. One-time setup by
// the user; this fires it. Leaves the PWA briefly — that's iOS, not us.
export function triggerFocusShortcut(name) {
  const shortcut = encodeURIComponent(name || 'Sprint')
  // Use a transient anchor instead of window.location.href so the app's OWN
  // document never tries to navigate to the custom scheme — that can cold-reload
  // the installed PWA (and discard an in-progress sprint) on return.
  const a = document.createElement('a')
  a.href = `shortcuts://run-shortcut?name=${shortcut}`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * One soft haptic tick — fired ONLY when a hold completes (seal or surrender).
 * Never celebratory patterns (R8). Native-only; everything is lazy + fail-soft
 * so the web bundle never touches the plugin and a missing install is a no-op.
 */
export async function hapticTick() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* no haptics on this platform — silence is fine */
  }
}
