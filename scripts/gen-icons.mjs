// Generates the PWA / home-screen icons into public/icons/ from one SVG.
// The mark: a gold flame (the streak) on near-black. Re-run: npm run icons
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/icons')
await mkdir(outDir, { recursive: true })

const BG = '#0A0B0D'
const A = '#F5A623' // accent gold
const D = '#B5730A' // deeper gold

// A flame, drawn centered in a 512 box. Outer flame in a gold gradient, with a
// smaller inner flame punched in the background color for depth.
const flame = `
  <g>
    <path fill="url(#grad)" d="
      M256 70
      C 250 138 312 160 312 244
      C 348 232 360 196 352 168
      C 392 206 404 270 380 326
      C 356 384 308 414 256 414
      C 204 414 150 384 132 326
      C 116 274 132 224 168 192
      C 162 224 176 250 200 258
      C 196 186 236 150 256 70 Z" />
    <path fill="${BG}" d="
      M256 214
      C 252 252 286 266 286 308
      C 286 338 274 360 256 360
      C 238 360 226 338 226 308
      C 226 280 240 262 256 214 Z" />
  </g>`

function master({ bleed }) {
  // bleed = true → full-bleed background (for maskable + apple-touch, the OS
  // rounds/masks). bleed = false → rounded square for the standard icon.
  const bg = bleed
    ? `<rect width="512" height="512" fill="${BG}"/>`
    : `<rect width="512" height="512" rx="112" ry="112" fill="${BG}"/>`
  // Maskable needs the mark inside the ~80% safe zone, so scale it down a touch.
  const scale = bleed ? 0.78 : 0.92
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${A}"/>
        <stop offset="1" stop-color="${D}"/>
      </linearGradient>
    </defs>
    ${bg}
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${flame}</g>
  </svg>`
}

const regular = Buffer.from(master({ bleed: false }))
const maskable = Buffer.from(master({ bleed: true }))

async function png(svg, size, name) {
  await sharp(svg).resize(size, size).png().toFile(resolve(outDir, name))
  console.log('wrote', `public/icons/${name}`)
}

await png(regular, 192, 'pwa-192.png')
await png(regular, 512, 'pwa-512.png')
await png(maskable, 512, 'pwa-maskable-512.png')
await png(maskable, 180, 'apple-touch-icon-180.png')
await png(regular, 32, 'favicon-32.png')

// An SVG favicon too (crisp at any size in modern browsers).
await writeFile(resolve(root, 'public/favicon.svg'), master({ bleed: false }))
console.log('wrote public/favicon.svg')
