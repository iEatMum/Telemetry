// haptics.js — the haptic grammar (design handoff §10 · D1).
//
// The rule mirrors the accent: ONE haptic on commitment, silence everywhere
// else. A single SUCCESS tap on the seal/stamp frame (post a row, DeepWork
// "Posted", "I stayed", INITIALIZE, "Rule off the day"); an optional lightest
// tick on a selection detent (onboarding choice, nav/tab); and NOTHING on a
// miss / reset / slip / low-readiness / scroll — the body is never buzzed for a
// shortfall. Lazy-imported and native-only (like browser.js hapticTick), so web
// and web-prod just fall silent; a user with system haptics off gets silence
// too (the plugin no-ops — we never fake a fallback buzz). Verified against
// @capacitor/haptics: NotificationType.Success, selectionChanged(), etc.

import { Capacitor } from '@capacitor/core'

async function plugin() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    return await import('@capacitor/haptics')
  } catch {
    return null
  }
}

/**
 * The one sanctioned haptic: a single SUCCESS notification on a commit's stamp
 * frame. Call it exactly once, on the frame the seal stamps — never on a miss.
 */
export async function sealCommit() {
  const mod = await plugin()
  if (!mod) return
  try {
    await mod.Haptics.notification({ type: mod.NotificationType.Success })
  } catch {
    /* system haptics off / unsupported — silence is correct */
  }
}

/**
 * Optional lightest tick for a selection detent (an onboarding choice landing,
 * a nav/tab change). Distinct from a commit — this is "you moved," not "you
 * committed." Never fires on a miss.
 */
export async function selectionTick() {
  const mod = await plugin()
  if (!mod) return
  try {
    await mod.Haptics.selectionChanged()
  } catch {
    /* silence */
  }
}

/**
 * Warm the native bridge on pointer-down so the success tap has zero first-call
 * latency. The real cost is the dynamic import + bridge spin-up, so we simply
 * pre-load the module — no generator method is called, so it can never buzz.
 */
export async function warmSeal() {
  await plugin()
}
