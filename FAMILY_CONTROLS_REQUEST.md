# Family Controls entitlement — filing runbook (Ian, ~5 minutes)

File this the day the membership activates. It is the longest external lead time in the
whole plan (days to weeks, sometimes longer) and it gates the app-lockdown flagship
(MASTERPLAN Phase 3c). Everything else in Phase 3c can be built while we wait; nothing
can *ship* without this approval.

## What you're requesting

The **Family Controls distribution entitlement** (`com.apple.developer.family-controls`).
The development variant needs no approval — I can build and device-test lockdown without
it being granted. Distribution (TestFlight + App Store) requires Apple to approve the
request per bundle ID.

## Steps

1. Sign in at https://developer.apple.com/account as the **Account Holder** (your
   individual account — that's automatically you).
2. Note your **Team ID** (Account → Membership details) — the form asks for it.
3. Open the request form:
   **https://developer.apple.com/contact/request/family-controls-distribution**
4. Fill it in:
   - **App name:** Telemetry
   - **Bundle IDs** (list all three — extensions using the frameworks need the
     entitlement too, and re-filing later restarts the clock):
     - `com.ianpalsgaard.telemetry` (the app)
     - `com.ianpalsgaard.telemetry.monitor` (DeviceActivity monitor extension — planned)
     - `com.ianpalsgaard.telemetry.shieldconfig` (shield configuration extension — planned)
   - **Justification:** paste the text below.
5. Submit. Approval arrives by email; forward it to me / tell me and I flip Phase 3c
   from "build behind development entitlement" to "wire for distribution."

## Justification text (paste as-is, edit freely)

> Telemetry is a personal discipline and habit app. The user — an adult managing their
> own device, not a parent managing a child's — schedules focus blocks and identifies
> their own high-risk hours ("danger windows"). During those windows, the app shields
> the distracting apps the user has chosen themselves.
>
> We use FamilyActivityPicker so the user selects which apps to shield; the selection
> stays on-device as opaque tokens — our app never learns which apps were chosen, and
> no data about app usage leaves the device. ManagedSettings applies the shield during
> the user's self-authored schedule via DeviceActivity, and the user can always remove
> the shield from inside the app.
>
> This is the same self-restriction pattern as existing App Store apps in this category
> (screen-time/focus tools). Family Controls is the only supported API for shielding
> applications, which is why we are requesting the distribution entitlement for the app
> and its DeviceActivity/shield extensions.

## After approval (my side + yours)

- Apple enables the capability for those bundle IDs in the developer portal; you (or I,
  guided) toggle **Family Controls** on each App ID + regenerate profiles in Xcode.
- I build the Swift module (FamilyActivityPicker sheet, ManagedSettingsStore shield,
  DeviceActivitySchedule from the user's danger window) + the Capacitor bridge.
- Psychology spine per MASTERPLAN: shields are user-authored armor; the night page can
  always lift them; a bypass is data, never shame.
