// aiConsent.js — the ONE consent check every AI client call walks through
// (P3a rail). The survey's consent.aiProcessing (set at onboarding, editable in
// Settings → "Connect Claude") is the user's word; no model call leaves the
// device without it. Deny-by-default: an unreadable sidecar means NO.
export function aiConsentGranted() {
  try {
    const s = JSON.parse(localStorage.getItem('lockedin:__survey') || 'null')
    return !!s?.consent?.aiProcessing
  } catch {
    return false
  }
}
