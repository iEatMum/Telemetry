// LegalSheet.jsx — the fine print, readable INSIDE the app (App Review 3.1.2:
// an auto-renewable subscription must offer a functional privacy policy and
// Terms of Use in the binary, not just in store metadata).
//
// The documents are the canonical legal/ drafts, bundled at build time via
// Vite ?raw — no hosting dependency, works offline, and the in-app text can
// never drift from the files Ian hosts for the store listing.
//
// Overlay idiom matches the urge/paywall sheets: any surface (including the
// paywall itself, which is z-50) opens it by window event; App.jsx owns the
// overlay so it renders above everything at z-[60].

import { useEffect, useRef, useState } from 'react'
import { useModalDismiss } from '../lib/useModalDismiss.js'
import PRIVACY_MD from '../../legal/PRIVACY.md?raw'
import TERMS_MD from '../../legal/TERMS.md?raw'

export const LEGAL_DOCS = {
  privacy: { title: 'Privacy policy', body: PRIVACY_MD },
  terms: { title: 'Terms of use', body: TERMS_MD },
}

export function openLegal(doc) {
  window.dispatchEvent(new CustomEvent('telemetry:open-legal', { detail: { doc } }))
}

/** App.jsx mounts this once; it manages its own open/closed state. */
export function LegalOverlay() {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    const open = (e) => setDoc(LEGAL_DOCS[e.detail?.doc] ? e.detail.doc : 'privacy')
    window.addEventListener('telemetry:open-legal', open)
    return () => window.removeEventListener('telemetry:open-legal', open)
  }, [])
  if (!doc) return null
  return <LegalSheet doc={doc} onClose={() => setDoc(null)} />
}

export default function LegalSheet({ doc = 'privacy', onClose }) {
  const { title, body } = LEGAL_DOCS[doc] || LEGAL_DOCS.privacy
  // Dialog manners: focus lands on Close when the sheet opens, aria-modal hides
  // the background, and Escape dismisses ONLY the top dialog (so closing the fine
  // print stacked over Settings leaves Settings open). See useModalDismiss.
  const closeRef = useRef(null)
  useModalDismiss(onClose, closeRef)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`The fine print · ${title}`}
      className="fixed inset-0 z-[60] overflow-y-auto bg-bg text-ink pt-safe"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-app flex-col px-5 pb-10">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted pt-safe"
        >
          ✕
        </button>
        <div className="pt-10">
          <div className="border-b border-line pb-2 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
            The fine print · {title}
          </div>
        </div>
        <Markdown text={body} />
      </div>
    </div>
  )
}

// The smallest renderer the legal drafts need: headings, bullets, quotes,
// paragraphs. Inline markers are flattened to plain text — this page is for
// reading, not navigating (links print as their visible text).
function Markdown({ text }) {
  const blocks = []
  let bullets = null
  const flush = () => {
    if (bullets) blocks.push({ kind: 'ul', items: bullets })
    bullets = null
  }
  for (const raw of String(text).split('\n')) {
    const line = raw.trimEnd()
    if (/^\s*-\s+/.test(line)) {
      bullets = bullets || []
      bullets.push(inline(line.replace(/^\s*-\s+/, '')))
      continue
    }
    flush()
    if (!line.trim()) continue
    if (line.startsWith('### ')) blocks.push({ kind: 'h3', text: inline(line.slice(4)) })
    else if (line.startsWith('## ')) blocks.push({ kind: 'h2', text: inline(line.slice(3)) })
    else if (line.startsWith('# ')) blocks.push({ kind: 'h1', text: inline(line.slice(2)) })
    else if (line.startsWith('> ')) blocks.push({ kind: 'quote', text: inline(line.slice(2)) })
    else blocks.push({ kind: 'p', text: inline(line) })
  }
  flush()
  return (
    <div className="mt-4">
      {blocks.map((b, i) => {
        if (b.kind === 'h1')
          return (
            <h1 key={i} className="mt-6 text-[1.25rem] font-semibold leading-tight">
              {b.text}
            </h1>
          )
        if (b.kind === 'h2')
          return (
            <h2 key={i} className="mt-6 border-b border-line pb-1.5 font-clock text-[0.6875rem] uppercase tracking-widest2 text-muted">
              {b.text}
            </h2>
          )
        if (b.kind === 'h3')
          return (
            <h3 key={i} className="mt-4 text-[0.875rem] font-medium text-ink">
              {b.text}
            </h3>
          )
        if (b.kind === 'quote')
          return (
            <p key={i} className="mt-3 border-l-2 border-line pl-3 font-serif text-[0.8125rem] italic leading-relaxed text-muted">
              {b.text}
            </p>
          )
        if (b.kind === 'ul')
          return (
            <ul key={i} className="mt-2 space-y-1.5 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink">
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )
        return (
          <p key={i} className="mt-3 text-[0.8125rem] leading-relaxed text-ink">
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

// Flatten inline markdown to plain text: **bold** / *em* / `code` markers drop,
// [label](url) keeps the label and, for bare readability, the url in parens
// when it isn't the label already.
function inline(s) {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => (label === url ? label : `${label} (${url})`))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}
