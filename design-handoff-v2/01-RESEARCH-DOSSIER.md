# 01 · RESEARCH DOSSIER — the 2026 evidence base
### Telemetry design handoff kit v2 · compiled 2026-07-14

*Method mirrors PSYCHOLOGY.md: find → cite → confidence-rate → translate to* this *app.
Confidence: **high** = well-sourced / Apple-official / multi-source agreement; **medium**
= real but single-source or contested; **low** = directional, treat as a hypothesis to
test. Every "→ Telemetry" line is the design instruction that survives into 03-HANDOFF-v2.*

The through-line: **the champion (Split Ledger) is still right. The platform under it
changed.** This dossier is mostly about the platform, the store, and the craft bar —
because that is where the 2025 handoff went quiet.

---

## A · The platform moved: iOS 26 & Liquid Glass (the biggest new fact)

### A1 · What happened
Apple announced **Liquid Glass** at WWDC on **June 9 2025** and shipped it across iOS 26,
iPadOS 26, macOS Tahoe, watchOS 26, tvOS 26 and visionOS 26. It is the first system-wide
visual language change since iOS 7 (2013). Controls now **float above content on a glass
material that refracts and reflects the background**; hierarchy is expressed through
**depth, translucency and refraction** rather than only color and size. `high`

Crucial nuance for us: **Liquid Glass is reserved for the *navigation* layer** — nav bars,
tab bars, toolbars, floating buttons, sheets — **not the content layer.** Apple's own
guidance: *"Liquid Glass is best reserved for the navigation layer that floats above the
content of your app."* Lists, tables, media, and full-screen backgrounds stay as they
were. You are told **not to stack glass on glass** and **not to use it as a full-screen
background.** `high`

> Sources: [Apple Developer — Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) ·
> [Create with Swift — Hierarchy, Harmony, Consistency](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/) ·
> [Donny Wals — Designing custom UI with Liquid Glass](https://www.donnywals.com/designing-custom-ui-with-liquid-glass-on-ios-26/) · [Wikipedia — Liquid Glass](https://en.wikipedia.org/wiki/Liquid_Glass)

### A2 · The hard deadline that is already behind us
**As of April 28 2026, every app uploaded to App Store Connect must be built with the
iOS 26 SDK / Xcode 26 or later.** This governs the *SDK you build with*, not the iOS
version your users run (deployment target can stay iOS 16/17). **Today is July 14 2026 —
this is not a "coming soon," it is a gate Telemetry is already behind.** `high`

The consequence that matters: **an app built with the iOS 26 SDK applies Liquid Glass to
native UI components by default** unless the developer explicitly opts out with
`UIDesignRequiresCompatibility = YES` in Info.plist. That opt-out **works only in Xcode 26,
is removed in Xcode 27, is reported to be buggy/partial in some webview + framework cases,
and Liquid Glass becomes fully mandatory in iOS 27.** Opting out is a stay of execution,
not a strategy. `high`

> Sources: [Apple Developer — Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/?id=02032026a) ·
> [DEV — iOS 26 SDK Is Now Mandatory](https://dev.to/arshtechpro/ios-26-sdk-is-now-mandatory-here-is-what-actually-changes-for-your-app-39m4) ·
> [Donny Wals — Opting out of Liquid Glass](https://www.donnywals.com/opting-your-app-out-of-the-liquid-glass-redesign-with-xcode-26/) ·
> [Swift with Vincent — How to disable Liquid Glass](https://www.swiftwithvincent.com/blog/how-to-disable-liquid-glass)

### A3 · What this means for a Capacitor WebView app that wants to be paper
Telemetry renders its whole UI inside a **WKWebView** (Capacitor). That is a gift and a
trap:

- **The gift:** web content is the *content layer*. Apple never wanted glass there anyway.
  Telemetry's manila-paper world is therefore **not fighting** Liquid Glass inside its own
  canvas — a matte paper ledger is a legitimate, Apple-sanctioned content treatment. The
  paper aesthetic reads as *intentional counter-programming* on a shelf that just went
  100% glass. This is a positioning win, not a liability (see D).
- **The trap:** the surfaces Telemetry *doesn't* draw itself now belong to the glass world
  and will look foreign if ignored — **the StoreKit paywall sheet, the iOS share sheet,
  system permission dialogs, the local notification, the Home-Screen widget, the app icon,
  and the status-bar / home-indicator gutters.** If the web content is warm manila and the
  system sheet that slides over it is cold structural glass with default tint, the seam is
  jarring and reads as "cheap hybrid app." `high`
  → **Telemetry:** design the *boundary*, not just the pages. 03 §Native Boundary and 05
  specify the reconciliation: theme the status-bar style per skin, tint native sheets to
  the active skin's ink/accent where the API allows, give the widget and icon first-class
  paper-and-seal treatments, and make a **deliberate decision** on `UIDesignRequiresCompatibility`
  (recommendation in 02, Critic 3).

### A4 · App icons are now layered objects
iOS 26 icons are built in Apple's free **Icon Composer** from separate
**foreground / mid-ground / background layers**, exported as a single **`.icon` file**, and
the system adds depth, translucency and specular highlights. Icons now ship **multiple
states** — default, dark, layered-glass, tinted (monochrome), and a "clear" variant. A flat
1024² PNG is no longer the whole story. `high`
→ **Telemetry:** the "lane-red seal ring on manila" icon concept is *ideal* for this —
it's already a layered idea (paper ground, ink ring, red seal). Design it as **3 Icon
Composer layers** and specify the **dark and tinted/monochrome variants** (a seal ring
holds up beautifully in monochrome; a neon gradient does not — another shelf win).

> Sources: [MobileAction — Apple Liquid Glass app icon](https://www.mobileaction.co/blog/apple-liquid-glass-design/) ·
> [IconikAI — Liquid Glass App Icons / Icon Composer](https://www.iconikai.com/blog/liquid-glass-app-icon-icon-composer-2026)

---

## B · App Store conversion mechanics (2026)

### B1 · You have about seven seconds, and half of it is one screenshot
The App Store product page is decided in **~7 seconds**, and **roughly half of visitors
only ever look at the first one or two screenshots.** Put the core value proposition
**top-left of the first shot**, where the eye lands first. `high`
→ **Telemetry:** screenshot 1 must carry the entire pitch in one glance — **manila page +
carbon numerals + one lane-red seal + a five-word caption ("Every pro keeps a book").**
The paper is the differentiator; lead with it, not with a feature list.

### B2 · Screenshots and video move the needle more than almost anything
A strong screenshot set lifts install conversion **~20–35%**; an App Store **video preview
adds another ~16–35%**; adding **social proof to the first screenshot can lift conversion up
to ~90%.** Median US product-page→install conversion sits **~25%**; **>30% is strong,
<15% is a problem.** `high` (video/social-proof upper bounds `medium` — vendor data)
→ **Telemetry:** design the **6-shot set as a designed system, not screen grabs** (03 has
the shot spec). Build the **app-preview video around the seal ceremony and the
stopwatch-cut-to-manila** — a 15–20s loop. Add one honest social-proof band to shot 1 the
moment there's a real number to show (rating, "N days posted" aggregate) — never fabricated
(the constitution already killed a fake "8,423 on the list" count; keep that discipline).

### B3 · Screenshot captions are now keyword-ranked (new since June 2025)
Apple now runs **OCR over screenshot caption text and indexes it for search ranking** —
every word in a caption contributes to discoverability, not just the metadata fields.
Captions must be **high-contrast and OCR-legible.** `high`
→ **Telemetry:** captions do double duty (pitch + ASO). Bake the keyword set from
`marketing/ASO.md` (discipline, habit, streak, lock in, focus, deep work, routine) into the
caption copy **naturally**, in **high-contrast carbon-on-manila type at a legible size** —
which the Split Ledger palette already nails. Do not set captions in faint or low-contrast
ink for "taste"; it costs ranking now.

> Sources: [Apple Developer — Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/) ·
> [Screenhance — State of App Store Screenshots 2026](https://screenhance.com/blog/state-of-app-store-screenshots-2026) ·
> [ScreenFast — Conversion Benchmarks 2026](https://screenfast.app/blog/app-store-conversion-rate-benchmarks-2026) ·
> [AppLaunchFlow — ASO Guide 2026](https://www.applaunchflow.com/blog/aso-2026-guide)

---

## C · Subscription, onboarding & retention

### C1 · Onboarding → personalized paywall is the winning shape
The top-converting configuration across subscription apps is **a structured onboarding flow
that feeds a free-trial paywall.** **~82% of trial starts happen on Day 0**, so the
first-run flow *is* the conversion event. **Micro-commitments before the paywall** (goal
picks, sliders, short quizzes) **build investment and reduce drop-off**, and **surfacing the
user's captured goals on the paywall outperforms most layout experiments.** `high`
→ **Telemetry:** the 15-node "opening your book" onboarding is already the right instrument.
Two design instructions fall out: (1) make each onboarding node feel like a **micro-commitment
posted in ink** (the detent-fill radios, the rule-draw progress) — the *ceremony is the
investment*; (2) the **paywall must reflect back what he just told the book** — his focus
goal, his danger window, his witness's name — in the ledger's own voice, not a generic
feature grid. 03 specifies a "your book, personalized" paywall header.

### C2 · Trial length: 7 days is leaving money on the table (flag to Ian, not Claude Design)
Trials of **17–32 days convert at ~45.7% vs ~26.8% for the common 3–7 day trial**, and
structured trials can lift first-renewal by up to ~60%. `medium` (vendor benchmark, varies
by category)
→ **This is a business-model lever, not a design task** — noted here so it's on record. The
constitution ratified a **7-day** trial. Worth an A/B test post-launch (14-day). Claude
Design should build the paywall so the **trial-length number is a single token/string**, not
baked into art, so this can be tested without a redraw.

### C3 · Retention is driven by *progress made visible* — and the streak is a loaded gun
The strongest **long-term** retention driver is **visible accumulated progress**, and
**self-monitoring is itself the intervention** (people who track are far likelier to
maintain — this echoes Harkin 2016 in PSYCHOLOGY.md). The dominant industry mechanic is
**loss-aversion / the endowment effect** — a streak feels like a possession, and the app
weaponizes the *threat of losing it*. **Most streaks break because users forget, not
because they failed.** `high`
→ **Telemetry:** this is the single most important place the champion's psychology and the
industry's playbook **diverge on purpose.** Telemetry deliberately **refuses the loss-gun**
(no red streak-break, lifetime piles dominant so day-0 is never the only number — the AVE
firewall). So the design must win retention the *other* way the evidence allows: **make
accumulated progress beautiful and dominant.** The lifetime piles, the ledger that only
accrues, the WeekGrid of posted seals — *that* is the retention engine, and it must be the
most gorgeous, most-photographed thing in the app. Retention-by-accumulation, never
retention-by-threat. And because "misses come from forgetting," the **one daily
notification** (already spec'd, one per app-day, action-cued) is a retention feature — its
copy and timing matter, but volume never escalates.

> Sources: [Airbridge — App onboarding before the paywall](https://www.airbridge.io/en/blog/5-steps-app-onboarding-before-the-paywall) ·
> [RevenueCat — Guide to mobile paywalls](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/) ·
> [Adapty — High-performing paywall 2026](https://adapty.io/blog/high-performing-paywall-2026/) ·
> [Bootcamp — Streaks & daily rewards as habit-forming systems](https://medium.com/design-bootcamp/streaks-and-daily-rewards-as-habit-forming-systems-dab7f5a34539) ·
> [ProductGrowth — Health app retention loops 2026](https://productgrowth.in/insights/healthtech/health-app-retention-guide/)

---

## D · The competitive shelf — and Telemetry's whitespace

The "lock in / discipline / focus" niche in 2026 splits into two visual clichés, and
**both just became more glass, not less:**

| Cluster | Examples | Look & mechanic | The tell |
|---|---|---|---|
| **Gamified dopamine-pressure** | (Not Boring) Habits, Monk Mode (0–100 score), DAWG | XP, momentum stats, countdowns that *add pressure near a streak break*, neon/high-saturation | Exactly the loss-gun + variable-reward playbook PSYCHOLOGY.md bans |
| **Minimalist checklist** | Streaks (Apple Design Award, tap-and-hold), ManHabit, Disciplined | Clean grid of toggles, big buttons, restrained color | Tasteful but generic; nothing *ownable*; no point of view |
| **Screen-time blockers** (adjacent) | Opal, one sec, Brick, ScreenZen | Beautiful but abstinence/friction-framed; "block yourself" | Different job (restriction, not a record) |

`high` (existence & positioning of these apps; individual mechanics `medium`)

**The whitespace is real and now literally visual.** Every serious competitor is black
glass or neon, and **iOS 26 just made the entire OS glass.** A **matte manila paper ledger
with one red seal** is the only warm, analog, physical-feeling object on the shelf — and the
only one whose **core metaphor does the anti-shame psychological work by itself** (why it won
the tournament). The differentiation strategy in `CONSTITUTION.md` ("we are the analog object
in a scroll of black-glass dashboards") went from clever to *structural* the day Liquid Glass
shipped. `high`
→ **Telemetry:** lean *harder* into paper, not softer. In screenshots and the icon, the
contrast against a glass OS is the entire pitch. One caution from the tournament's own
critique (Podcaster/CEO on Zen Ledger): **paper must not read as a soft "Hobonichi for a
meditator" to a 19-year-old sprinter.** The answer is already in the champion — **the
stopwatch inversion**: hero moments (DeepWork cockpit, urge night page) invert to ink-dark,
carbon, stopwatch-grade. Keep that nerve; it's what gives the paper *gravity*.

> Sources: [MenTools — Best personal development apps for men 2026](https://www.mentools.co/apps/best-personal-development-apps-for-men-2026/) ·
> [Mindful Suite — Best habit trackers 2026](https://www.mindfulsuite.com/reviews/best-habit-tracker-apps) ·
> [Blok — 9 best focus apps 2026](https://www.blok.so/resources/the-9-best-focus-apps-in-2026-and-which-ones-you-can-actually-stick-with) ·
> [PerDomi — Opal alternatives / dopamine balance](https://www.perdomi.com/articles/opal-alternatives)

---

## E · Craft inputs — haptics, motion, type, native feel

### E1 · Haptics: an earned grammar, exactly like the accent
Use **`UIImpactFeedbackGenerator` / `UINotificationFeedbackGenerator` for simple cues** and
**Core Haptics for rich custom patterns.** The universal rules: **purposeful and sparing —
significant actions only, never decoration, never on scroll/continuous gestures**; call
**`.prepare()`** ahead to kill first-tap latency; **respect the user's system haptic
setting.** The most common failure is *firing haptics on everything*, which makes the phone
feel buzzy and gets the feature turned off. `high`
→ **Telemetry:** this is a perfect structural rhyme with the champion's central rule.
**Lane-red is the earned color; a single haptic is the earned touch.** Define a **haptic
grammar** that mirrors the accent grammar:
  - **The seal / commit** (post an entry, INITIALIZE, "I stayed", hold-to-log complete) →
    **one deliberate `notification-success`-class tap** at the moment of stamp. This *is*
    the ceremony's physical half.
  - **Selection** (detent radios, tab change, chip toggle) → the lightest **selection tick**,
    if any.
  - **A miss, a reset, a slip** → **no haptic.** Silence is the point — the same reason a
    miss is never red. A buzz on a slip would be a bodily verdict.
  - Capacitor exposes this via its **Haptics plugin**; 05 lists the hooks.
Haptics are available and native-cheap in a WebView; use them to make the paper *feel*
physical — the one sense the screenshot can't fake.

> Sources: [Cracking Swift — How & when to use haptic feedback](https://medium.com/cracking-swift/how-and-when-to-use-haptic-feedback-for-a-better-ios-app-9bcfcc97393a) ·
> [Saropa — 2025 guide to haptics](https://saropa.com/articles/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback/) ·
> [Capacitor Haptics plugin](https://capacitorjs.com/)

### E2 · Motion: the champion's four verbs are correct — add restraint, not more motion
Liquid Glass leans on **fluid, responsive motion**, but the app's own doctrine (calm, no
celebration) rightly resists that. The champion's **four motion verbs** (ink-settle · breath
· rule-draw · seal-press) are the right vocabulary and should be **the only motion in the
app**, all collapsing under `prefers-reduced-motion`. `high`
→ **Telemetry:** don't chase Liquid Glass animation. The *one* place to spend richer motion
is the **seal ceremony** (rest → press-sweep → stamp → posted), because it's the hero and
the haptic and the TikTok moment at once. Everywhere else, less.

### E3 · Dynamic Type & accessibility: a real rejection risk the old handoff ignored
iOS has **12 text-size steps including 5 accessibility sizes (AX1–AX5)**. Apple expects text
to scale; **custom fonts that don't scale can be grounds for App Store rejection** and
exclude low-vision users. Minimum legible size **~11pt**; interactive targets **44×44pt**;
layouts must **reflow (stack) as text grows.** `high`
→ **Telemetry:** the champion uses **fixed 11px caps labels and large fixed mono numerals**.
That's beautiful and, as written, **not Dynamic-Type-safe.** This is a genuine gap. The
design must specify: (a) body/label type in **relative units that honor the user's text
size**; (b) the **hero mono readouts scale too** (a bigger clock is fine — it's still the
hero); (c) **reflow rules** for the heat sheet and trial-balance strips at AX sizes (columns
stack, rules stay); (d) never smaller than 11px at default. This protects both review
approval and the actual low-vision user. 03 §Accessibility and 04 make it a scored line.

### E4 · Native feel inside Capacitor
Beyond haptics: **respect safe areas exactly** (notch, Dynamic Island, home indicator —
`env(safe-area-inset-*)`), give scroll **native momentum/bounce**, and **use native surfaces
for native jobs** (share sheet, StoreKit paywall, permission prompts, notifications). The
difference between "web page in a shell" and "native app" is mostly these seams. `high`
→ **Telemetry:** already partly handled (`pt-safe`/`pb-safe`, the in-flow sync bar). 03/05
add: momentum-scroll on the deck, a **native-tinted StoreKit sheet**, and the status-bar
style bound to the active skin (dark content on manila; light content on Carbon/Lamplight).

> Sources: [Median.co — Apple typography guidelines](https://median.co/blog/apples-ui-dos-and-donts-typography) ·
> [Medium — Product designer's guide to Dynamic Type](https://medium.com/design-bootcamp/a-product-designers-guide-to-dynamic-type-in-ios-a105dda39a95) ·
> [Median/Design+Code — Dynamic Type](https://designcode.io/ios-design-handbook-typography-and-dynamic-type/) ·
> [Oflight — Capacitor porting guide 2026](https://www.oflight.co.jp/en/columns/capacitor-web-to-ios-android-porting-guide-2026)

---

## F · The five findings that most change the design (the executive read)

1. **Liquid Glass changed the shelf and the submission rules; the old handoff is silent on
   it.** Design the paper↔glass *boundary*; the paper content itself is safe and now
   maximally differentiated. `high`
2. **Screenshot 1 + the icon are ~50% of the conversion battle**, decided in seconds, and
   captions are now keyword-ranked. Treat App Store assets as first-class design, not export.
   `high`
3. **Retention must be won by making accumulation beautiful**, because the champion refuses
   the industry's loss-aversion streak-gun on principle. The piles and the ledger are the
   retention engine. `high`
4. **Haptics are the missing sense.** A single earned haptic on the seal makes paper feel
   physical — define a haptic grammar that mirrors the accent grammar. `high`
5. **Dynamic Type is an unsolved gap and a real rejection risk.** Fixed 11px/large-mono type
   must be given a scaling + reflow story. `high`

Proceed to **02-EXPERT-REDTEAM.md** for the code-grounded attack on the current design, then
build from **03-HANDOFF-v2.md**.
