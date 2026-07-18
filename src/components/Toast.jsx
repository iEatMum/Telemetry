// Toast.jsx — the render half of lib/toast.js. Mounted ONCE in App.jsx.
// Bottom-center, above the nav bar, pointer-transparent: it informs, it never
// interrupts, and it leaves on its own.

import { useEffect, useState } from 'react'
import { subscribe, getToast } from '../lib/toast.js'

export default function Toast() {
  const [toast, setToast] = useState(getToast)
  useEffect(() => subscribe(setToast), [])
  if (!toast) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      role="status"
    >
      <div className="rounded-md border border-line bg-surface px-4 py-2.5 text-[0.8125rem] text-ink shadow-glow-sm">
        {toast.text}
      </div>
    </div>
  )
}
