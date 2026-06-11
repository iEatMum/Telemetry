// Generates public/sounds/sprint-end.wav — a short, clean two-tone "ding".
//
// Why WAV and not MP3: this machine has no MP3 encoder (ffmpeg/lame), and a tiny
// WAV is a real bundled audio file that plays everywhere offline with zero deps.
// To swap in your own MP3 later: drop it in public/sounds/ and point
// src/lib/browser.js at it. Re-run with: npm run sound
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SAMPLE_RATE = 44100

// Two short notes (a rising fifth) with smooth fades so there are no clicks.
const notes = [
  { freq: 880, start: 0.0, dur: 0.18 }, // A5
  { freq: 1318.5, start: 0.16, dur: 0.34 }, // E6
]
const totalDur = 0.54
const n = Math.floor(SAMPLE_RATE * totalDur)
const samples = new Float32Array(n)

for (const note of notes) {
  const s0 = Math.floor(note.start * SAMPLE_RATE)
  const len = Math.floor(note.dur * SAMPLE_RATE)
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE
    // Quick attack, exponential-ish decay envelope.
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 7)
    const v = Math.sin(2 * Math.PI * note.freq * t) * env * 0.4
    const idx = s0 + i
    if (idx < n) samples[idx] += v
  }
}

// Encode 16-bit PCM mono WAV.
const bytesPerSample = 2
const dataSize = n * bytesPerSample
const buf = Buffer.alloc(44 + dataSize)
buf.write('RIFF', 0)
buf.writeUInt32LE(36 + dataSize, 4)
buf.write('WAVE', 8)
buf.write('fmt ', 12)
buf.writeUInt32LE(16, 16) // PCM chunk size
buf.writeUInt16LE(1, 20) // PCM format
buf.writeUInt16LE(1, 22) // mono
buf.writeUInt32LE(SAMPLE_RATE, 24)
buf.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28) // byte rate
buf.writeUInt16LE(bytesPerSample, 32) // block align
buf.writeUInt16LE(16, 34) // bits per sample
buf.write('data', 36)
buf.writeUInt32LE(dataSize, 40)
for (let i = 0; i < n; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]))
  buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample)
}

const outDir = resolve(root, 'public/sounds')
await mkdir(outDir, { recursive: true })
await writeFile(resolve(outDir, 'sprint-end.wav'), buf)
console.log(`wrote public/sounds/sprint-end.wav (${(buf.length / 1024).toFixed(1)} KB)`)
