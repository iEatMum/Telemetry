// shareCard.js — the book page as an image (CONSTITUTION M4).
//
// The "DAYS ON THE BOOK" hero is the app's shareable object — the frame people
// post. This draws it as a 1080×1920 story card on a canvas (no dependencies,
// no network): the same manila page, the same mono numerals, colors read live
// from the ACTIVE skin's CSS variables so a Carbon user shares a carbon page.
// A second variant renders the Sunday week's balance.
//
// Sharing uses the native sheet when the platform offers one (Web Share API
// with files — WKWebView and mobile Safari both do) and falls back to a plain
// PNG download on desktop. Nothing leaves the device except by the user's own
// share action. Counts ride the private tally (analytics.js).

import { track } from './analytics.js'

const W = 1080
const H = 1920
const MARGIN = 96

// Read the live token values off :root so the card matches the active skin.
function tokens() {
  const s = getComputedStyle(document.documentElement)
  const v = (name, fallback) => (s.getPropertyValue(name) || '').trim() || fallback
  return {
    bg: v('--bg', '#ede4ce'),
    surface2: v('--surface-2', '#e2d7bc'),
    line: v('--line', '#c9bc9c'),
    ink: v('--text', '#1f1b12'),
    muted: v('--muted', '#6b6150'),
    faint: v('--faint', '#9a8f76'),
    accent: v('--accent', '#c93f22'),
    pos: v('--pos', '#3f6e4e'),
  }
}

const MONO = '"IBM Plex Mono", ui-monospace, monospace'

function setType(ctx, { size, weight = 400, color, tracking = 0 }) {
  ctx.font = `${weight} ${size}px ${MONO}`
  ctx.fillStyle = color
  try {
    ctx.letterSpacing = `${tracking}px`
  } catch {
    /* older engines — tracking is a nicety */
  }
}

function rule(ctx, y, color) {
  ctx.fillStyle = color
  ctx.fillRect(MARGIN, y, W - MARGIN * 2, 2)
}

// The shared page chrome: wordmark + date up top, imprint down bottom.
function chrome(ctx, t, dateLine) {
  rule(ctx, 150, t.line)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  setType(ctx, { size: 34, weight: 500, color: t.ink, tracking: 8 })
  ctx.fillText('TELEMETRY', MARGIN, 130)
  ctx.textAlign = 'right'
  setType(ctx, { size: 28, color: t.muted, tracking: 4 })
  ctx.fillText(dateLine, W - MARGIN, 128)

  // The imprint doubles as the acquisition line — a shared card that can't be
  // acted on is wallpaper, not a funnel. Name the app AND where to get it, so a
  // cold viewer has a path back. Honest text over an invented URL (the old
  // lockedin.app link 404'd); swap in a short domain here once one is live.
  rule(ctx, H - 150, t.line)
  ctx.textAlign = 'left'
  setType(ctx, { size: 30, weight: 500, color: t.ink, tracking: 2 })
  ctx.fillText('TELEMETRY · The Discipline Ledger', MARGIN, H - 98)
  setType(ctx, { size: 26, color: t.muted, tracking: 3 })
  ctx.fillText('On the App Store', MARGIN, H - 58)
  ctx.textAlign = 'right'
  setType(ctx, { size: 30, color: t.accent })
  ctx.fillText('◆', W - MARGIN, H - 80)
}

function dateLine(now = new Date()) {
  const wd = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const md = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  return `${wd} · ${md}`
}

async function makeCanvas() {
  // Make sure the bundled Plex Mono is usable on the canvas before drawing.
  try {
    await document.fonts.ready
  } catch {
    /* draw with the fallback stack */
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  return canvas
}

async function shareCanvas(canvas, filename, eventName) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return { ok: false, reason: 'render-failed' }
  track(eventName)
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return { ok: true, method: 'share' }
    } catch (e) {
      // User closed the sheet — that's a completed interaction, not an error.
      if (e && e.name === 'AbortError') return { ok: true, method: 'dismissed' }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true, method: 'download' }
}

/** The book page: lifetime total dominant, run/week beneath — the hero frame. */
export async function shareBookCard({ total = 0, run = 0, wk = 1 } = {}) {
  const t = tokens()
  const canvas = await makeCanvas()
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, W, H)
  chrome(ctx, t, dateLine())

  ctx.textAlign = 'center'
  setType(ctx, { size: 32, color: t.muted, tracking: 10 })
  ctx.fillText('DAYS ON THE BOOK', W / 2, 780)

  // The number scales down past three digits so 1000+ days still sits inside
  // the margins — the book should get MORE imposing with age, not clipped.
  const numeral = String(total)
  const size = numeral.length <= 3 ? 430 : numeral.length === 4 ? 320 : 250
  setType(ctx, { size, weight: 500, color: t.ink })
  ctx.fillText(numeral, W / 2, 780 + size * 0.78 + 60)

  setType(ctx, { size: 34, color: t.faint, tracking: 4 })
  ctx.fillText(`run ${run} · wk ${wk}`, W / 2, 780 + size * 0.78 + 150)

  return shareCanvas(canvas, `telemetry-days-${total}.png`, 'share_book_card')
}

/** The Sunday page: the week's balance as seven inked columns. */
export async function shareWeekCard({ days = [], title = "THE WEEK'S BALANCE" } = {}) {
  const t = tokens()
  const canvas = await makeCanvas()
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, W, H)
  chrome(ctx, t, dateLine())

  ctx.textAlign = 'center'
  setType(ctx, { size: 32, color: t.muted, tracking: 10 })
  ctx.fillText(title, W / 2, 640)

  const cols = days.length || 7
  const track_ = (W - MARGIN * 2) / cols
  const barMaxH = 520
  const baseY = 1420

  days.forEach((day, i) => {
    const cx = MARGIN + track_ * i + track_ / 2
    const pct = Math.max(0, Math.min(100, Number(day.pct) || 0))

    // The column: a quiet full-height track with the executed share inked in.
    const bw = Math.min(64, track_ - 28)
    ctx.fillStyle = t.surface2
    ctx.fillRect(cx - bw / 2, baseY - barMaxH, bw, barMaxH)
    const h = Math.round((pct / 100) * barMaxH)
    ctx.fillStyle = t.pos
    if (h > 0) ctx.fillRect(cx - bw / 2, baseY - h, bw, h)

    ctx.textAlign = 'center'
    setType(ctx, { size: 40, weight: 500, color: pct >= 40 ? t.ink : t.muted })
    ctx.fillText(String(pct), cx, baseY - barMaxH - 36)
    setType(ctx, { size: 26, color: t.muted, tracking: 3 })
    ctx.fillText(String(day.d || '').toUpperCase(), cx, baseY + 56)
    setType(ctx, { size: 26, color: day.sealed ? t.accent : t.muted })
    ctx.fillText(day.sealed ? '✓' : '–', cx, baseY + 110)
  })

  rule(ctx, baseY + 150, t.line)

  return shareCanvas(canvas, 'telemetry-week.png', 'share_week_card')
}
