// gen-icons.mjs — the Telemetry app mark (Split Ledger, P2 art round).
// Generates ALL icon assets from vector masters: the iOS AppIcon set
// (light / dark / tinted 1024s) and the PWA/home-screen set. Re-run: npm run icons
//
// Three comps are drawn (A "The Seal", B "The Split Book", C "Ruled Off");
// PICK selects which ships. A is the ratified mandate mark — "manila ground,
// carbon ring, lane-red ◆ seal" — and stays legible at 60px. All comps render
// into marketing/icon-comps/ so the choice stays one variable away.
// (The old gold-flame-on-black mark was the terminal era; it died with it.)
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pwaDir = resolve(root, 'public/icons')
const iosDir = resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
const compDir = resolve(root, 'marketing/icon-comps')
await mkdir(pwaDir, { recursive: true })
await mkdir(compDir, { recursive: true })

// Split Ledger tokens (src/index.css is canonical).
const LIGHT = { bg: '#ede4ce', ink: '#1f1b12', line: '#c9bc9c', accent: '#c93f22' }
const DARK = { bg: '#101214', ink: '#e8e6e1', line: '#3b4249', accent: '#c4553b' }

// The ◆ seal as a path (diamond), centered at (cx,cy) with half-diagonal r.
const diamond = (cx, cy, r, fill) =>
  `<path fill="${fill}" d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z"/>`

// ── Comp A — THE SEAL. Manila ground · carbon ring · lane-red ◆. ────────────
function compA(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${t.bg}"/>
    <circle cx="512" cy="512" r="330" fill="none" stroke="${t.ink}" stroke-width="22"/>
    ${diamond(512, 512, 148, t.accent)}
  </svg>`
}

// ── Comp B — THE SPLIT BOOK. The ledger's rules; the seal posted on the line. ─
function compB(t) {
  const rows = [300, 448, 596, 744]
    .map((y) => `<line x1="128" y1="${y}" x2="896" y2="${y}" stroke="${t.line}" stroke-width="10"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${t.bg}"/>
    ${rows}
    <line x1="390" y1="152" x2="390" y2="872" stroke="${t.ink}" stroke-width="18"/>
    ${diamond(390, 300, 96, t.accent)}
  </svg>`
}

// ── Comp C — RULED OFF. Three rows; the middle one sealed. ───────────────────
function compC(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${t.bg}"/>
    <line x1="152" y1="332" x2="872" y2="332" stroke="${t.line}" stroke-width="12"/>
    <line x1="152" y1="512" x2="700" y2="512" stroke="${t.ink}" stroke-width="26"/>
    ${diamond(800, 512, 84, t.accent)}
    <line x1="152" y1="692" x2="872" y2="692" stroke="${t.line}" stroke-width="12"/>
  </svg>`
}

const COMPS = { A: compA, B: compB, C: compC }
const PICK = 'A'

// Tinted (iOS 18+): grayscale on transparent — the system supplies the tint.
function tintedFromComp(comp) {
  return comp(LIGHT)
    .replace(`<rect width="1024" height="1024" fill="${LIGHT.bg}"/>`, '')
    .replaceAll(LIGHT.ink, '#b0b0b0')
    .replaceAll(LIGHT.line, '#808080')
    .replaceAll(LIGHT.accent, '#ffffff')
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png()

// iOS AppIcon set — light, dark, tinted 1024s (Contents.json carries the
// luminosity appearances; Xcode 15+ single-size format).
const mark = COMPS[PICK]
await png(mark(LIGHT), 1024).toFile(resolve(iosDir, 'AppIcon-1024.png'))
await png(mark(DARK), 1024).toFile(resolve(iosDir, 'AppIcon-1024-dark.png'))
await png(tintedFromComp(mark), 1024).toFile(resolve(iosDir, 'AppIcon-1024-tinted.png'))

// PWA / web set (light mark; the browser chrome does its own masking).
await png(mark(LIGHT), 512).toFile(resolve(pwaDir, 'pwa-512.png'))
await png(mark(LIGHT), 192).toFile(resolve(pwaDir, 'pwa-192.png'))
await png(mark(LIGHT), 512).toFile(resolve(pwaDir, 'pwa-maskable-512.png'))
await png(mark(LIGHT), 180).toFile(resolve(pwaDir, 'apple-touch-icon-180.png'))
await png(mark(LIGHT), 32).toFile(resolve(pwaDir, 'favicon-32.png'))
await writeFile(resolve(root, 'public/favicon.svg'), mark(LIGHT))

// Comp sheet assets — every comp at review sizes, both appearances.
for (const [name, comp] of Object.entries(COMPS)) {
  for (const [label, t] of [['light', LIGHT], ['dark', DARK]]) {
    for (const size of [1024, 180, 60]) {
      await png(comp(t), size).toFile(resolve(compDir, `comp-${name}-${label}-${size}.png`))
    }
  }
}

console.log(`icons generated (shipping comp ${PICK}; alternates in marketing/icon-comps/)`)
