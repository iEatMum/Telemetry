// toast.js — one transient confirmation at a time (shell-global).
//
// The seal needs an acknowledgment moment ("Sealed. Deck rebuilds overnight.")
// that doesn't demand a dismissal. Same tiny pub/sub idiom as engagement.js:
// module state + subscribe(fn) → unsubscribe. One toast at a time by design —
// a queue of toasts is a notification system, which this deliberately is not.

let listeners = new Set()
let current = null
let timer = null

function emit() {
  for (const fn of [...listeners]) {
    try {
      fn(current)
    } catch {
      /* a broken subscriber never blocks the rest */
    }
  }
}

/** Show a toast for `ms` (default 2600ms). Replaces any toast already up. */
export function showToast(text, ms = 2600) {
  current = { text }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    current = null
    emit()
  }, ms)
  emit()
}

export function getToast() {
  return current
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
