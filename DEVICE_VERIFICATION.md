# Device verification — submit ledger step 3

The one step in `CONSTITUTION.md`'s submit ledger that only proves out on a real
phone. The JS + native-seam code is complete and API-verified against the
installed plugins (`@capgo/native-purchases@8.6.4`, `@capgo/capacitor-health`,
`@capgo/capacitor-widget-kit`, `@capacitor/local-notifications`); everything
below is about confirming it on device. Run it top to bottom on an iPhone.

## Preconditions

- **Step 1 done** — App Store Connect: subscription group **Coach** with
  `telemetry.coach.yearly` ($39.99) and `telemetry.coach.monthly` ($6.99), a
  **7-day free trial** on both. The product IDs must match `src/lib/purchases.js`
  `PLANS` exactly.
- **Step 2 done** — `npx cap sync ios`; in Xcode: add the **TelemetryWidget**
  extension target (it compiles the existing `ios/App/TelemetryWidget/*.swift`),
  enable **App Group `group.com.ianpalsgaard.telemetry` on BOTH** the App and
  Widget targets, keep the **HealthKit** capability on the App target, set your
  signing team, build to a **real device** (StoreKit purchases don't run in the
  Simulator).
- **Sandbox tester** — ASC → Users and Access → Sandbox Testers; sign in on the
  device (Settings → App Store → Sandbox Account) or when prompted at purchase.
- **Recommended** — a **StoreKit Configuration file** (`.storekit`) in the Xcode
  scheme so you can force trial / expiry / refund locally without waiting on
  sandbox. Cases A7/A8 below need it (or sandbox's accelerated renewals).

## A. StoreKit — purchase / restore / entitlement (the A2 rewrite, highest risk)

1. Fresh install, never purchased → open a coach surface (Guardian panel, Sunday
   review, or a counsel note). Expect the **CoachGate** ("Hire the coach — 7 days
   free"), not coach content.
2. Through the paywall → buy **yearly** → the system sheet reads "7 days free,
   then $39.99/year" → complete. Gates unlock live; sidecar status = **`trial`**.
   NOTE (P1 correction): the installed iOS plugin never emits `isTrialPeriod` /
   `isInIntroPricePeriod` — trial is now DERIVED in `txIsTrial`: first 7 days
   since `originalPurchaseDate` = the intro trial. So `trial` should appear on a
   fresh purchase regardless of those fields.
3. Force-quit → relaunch → **still unlocked** (`refreshEntitlement()` re-mirrors
   on launch).
4. "Restore purchases" on the **same** account → stays unlocked, no double charge.
5. **New / never-purchaser account taps "Restore purchases" → stays LOCKED**,
   "No prior purchase found." *(This is the 3.1.1 case reviewers test on a fresh
   Apple ID — the A2 fix that stopped restore from granting for free.)*
6. **Airplane mode, currently-entitled user taps "Restore" → stays UNLOCKED**,
   "try again" note. A paying subscriber is never revoked on a transient failure.
7. *(StoreKit config)* Expire the subscription → relaunch → coach **LOCKS** and
   the paywall shows the **winback** page ("The contract lapsed. The book never
   closed." / "Re-hire the coach"), not the first-time trial pitch.
8. *(StoreKit config)* **Refund** the transaction → relaunch → coach **LOCKS**
   (`revocationDate` / `subscriptionState` guard).
9. Switch the device/sandbox region (e.g. a Euro storefront) → paywall shows the
   storefront currency + a localized "/month" anchor (`getLocalizedPlans`).
10. Confirm the **auto-renew disclosure**, **Privacy/Terms** links, and
    **Restore** are all visible and comfortably tappable on the paywall (3.1.2).

## B. Danger-window notification

1. In onboarding pick a danger window a few minutes out; grant the notification
   permission prompt (fired by the plugin on first schedule).
2. At the window, **exactly one** calm pre-window notification fires — copy owns
   *the window you flagged* ("…the {window} stretch is the one you flagged…"),
   no red/shame (A2 nocebo fix). One per app-day, max.
3. Tapping it deep-links into the app.

## C. HealthKit

1. Health step (or Settings) → "Link health data" → the iOS HealthKit sheet
   appears (`NSHealthShareUsageDescription`).
2. Grant sleep/activity/heart-rate → Trends biometrics populate from real data.
   **Deny** → app degrades to the manual wellness fallback, no crash.
3. Fresh device with no Health data → no crash, empty-state readouts.

## D. Widget

1. Add the TelemetryWidget to the home screen.
2. Complete a high-impact block in the app → the widget's DAILY BRIEFING numbers
   update (App Group shared store → `CapgoWidgetKit.reloadWidgets`).
3. Renders in the manila skin; App Group id matches on both targets.

## Failure quick-reference

- **StoreKit "Cannot connect"** → sandbox account not signed in, ASC products not
  approved/"Ready to Submit", or bundle-id / product-id mismatch.
- **Trial shows `active` not `trial`** → check `originalPurchaseDate` on the
  transaction: the derived-trial rule is "within 7 days of first ownership". A
  StoreKit-config clock warp past 7 days correctly reads `active`. Gate behavior
  is identical either way.
- **Billing grace (new case):** in the .storekit config, simulate "Billing Grace
  Period" on a renewal — the coach must STAY unlocked (`subscriptionState:
  'inGracePeriod'` is accepted by `readOwnership` before the expiry-date math)
  and the winback page must NOT fire.
- **Store-build guard:** before archiving, `npm run ios:store` must be the build
  path — it throws if `VITE_TESTER` is set and strips Supabase keys + the PWA
  service worker from the bundle. Never archive from a plain `vite build`.
- **Notification never fires** → permission denied, or the window already passed
  today (one-per-day cap).
- **Widget blank** → App Group not enabled on **both** targets, or the extension
  target wasn't added in Xcode.

_Optional hardening (not required to ship):_ the plugin exposes a
`transactionUpdated` listener (StoreKit 2 `Transaction.updates`) that pushes
renewals/revocations without waiting for a launch/foreground refresh. The current
launch + `visibilitychange` refresh in `App.jsx` is sufficient for v1; the
listener is the more real-time upgrade if churn accuracy ever needs it.
