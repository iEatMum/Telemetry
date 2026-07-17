// dynamicType.js — the Dynamic Type seam (design handoff G6 · D1).
//
// iOS exposes the user's chosen text size as a UIContentSizeCategory, but a
// WKWebView does NOT map it onto CSS. The bridge: native reads the category →
// dispatches it to JS → setTypeCategory() scales the root via the --type-scale
// token, and any type authored in relative units tracks it. At accessibility
// sizes it also sets [data-ax] on <html> so label|control rows can stack (.ax-row)
// instead of clipping. Until the native content-size hook is wired (a device
// step, like the StoreKit and haptic seams), this stays at 1 and pinch-zoom is
// the escape hatch. Dependency-free + fail-soft: a pure no-op on web.

// iOS UIContentSizeCategory → root multiplier (Apple's default scaling curve,
// clamped). AX3 (accessibilityMedium) is the reflow trigger the handoff calls out.
const CATEGORY_SCALE = {
  extraSmall: 0.85,
  small: 0.9,
  medium: 0.95,
  large: 1, // system default
  extraLarge: 1.1,
  extraExtraLarge: 1.2,
  extraExtraExtraLarge: 1.35,
  accessibilityMedium: 1.45,
  accessibilityLarge: 1.6,
  accessibilityExtraLarge: 1.75,
  accessibilityExtraExtraLarge: 1.9,
  accessibilityExtraExtraExtraLarge: 2.1,
}

const AX_REFLOW_AT = 1.45 // ≥ accessibilityMedium → stack rows, grow the seal
const MIN = 0.85
const MAX = 2.1

/** Clamp + apply a raw scale factor to the root; flag [data-ax] at AX sizes. */
export function setTypeScale(factor) {
  const n = Math.min(MAX, Math.max(MIN, Number(factor) || 1))
  try {
    const root = document.documentElement
    root.style.setProperty('--type-scale', String(n))
    if (n >= AX_REFLOW_AT) root.setAttribute('data-ax', 'true')
    else root.removeAttribute('data-ax')
  } catch {
    /* no DOM (test/SSR) — no-op */
  }
  return n
}

/** Apply from an iOS UIContentSizeCategory string (what the native hook sends). */
export function setTypeCategory(category) {
  return setTypeScale(CATEGORY_SCALE[category] ?? 1)
}

/**
 * Listen for the native content-size hook. No standard Capacitor plugin exposes
 * the category yet, so we listen for a `telemetry:content-size` window event the
 * native side (or a future plugin) dispatches with { detail: { category } } or
 * { detail: { scale } }. On web it simply never fires. Returns a teardown fn.
 */
export function initDynamicType() {
  if (typeof window === 'undefined') return () => {}
  const onSize = (e) => {
    const d = e && e.detail
    if (d && typeof d.category === 'string') setTypeCategory(d.category)
    else if (d && typeof d.scale === 'number') setTypeScale(d.scale)
  }
  window.addEventListener('telemetry:content-size', onSize)
  return () => window.removeEventListener('telemetry:content-size', onSize)
}
