# App Store listing — Telemetry (M0.3 / M4)

DRAFT v0.1 · 2026-07-11. Everything here follows the ratified identity:
**Telemetry — The Discipline Ledger**, marketed purely as a discipline/execution
app (recovery + faith stay quiet opt-ins — never in this listing).

## Name & subtitle

| Field | Value | Limit |
|---|---|---|
| Name | `Telemetry — Discipline Ledger` | 30 chars (28 ✓; the em-dash form "The Discipline Ledger" is 33 — use this shortened name field, full phrase in the subtitle) |
| Subtitle | `Keep the book. Lock in daily.` | 30 chars (29 ✓) |

## Keyword field (100 chars, no spaces after commas, don't repeat name words)

```
discipline,habit,streak,lock in,focus,deep work,routine,self control,daily planner,dopamine,monk
```
(97 chars — recheck after localization.)

## Category & rating

- Primary: **Productivity**. Secondary: Lifestyle.
- Age rating: complete honestly around the urge/recovery module → likely 12+
  ("Infrequent/Mild Mature/Suggestive Themes" = none; select none of the drug
  categories — the app references urges generically, not substances).
- Review notes: see legal/APP-PRIVACY-LABELS.md (local-first, crisis links,
  named-AI consent).

## Description — opening paragraphs (the only part most people read)

> Every pro keeps a book.
>
> Telemetry is a paper ledger for your discipline: a manila page, carbon ink,
> and one red seal. Post your blocks. Keep the streak. Outlast the urge. The
> book never shouts, never shames, and never turns your misses red — it just
> keeps the record, and the record compounds.
>
> The book is free forever — your schedule, streaks, sprints, and the night
> page. The coach is hired: a daily read of your tape, a Guardian that catches
> drift inside YOUR danger window, the Sunday review, and an urge protocol
> that re-deals itself from what actually holds. 7 days free, then $6.99/mo
> or $39.99/yr.
>
> Your book stays on your device. No account. No feed. No tracking.

## Screenshot shot-list (6.9" 1320×2868 + 6.5" 1284×2778, portrait)

Capture from the Simulator in **Split Book** (manila is the differentiator —
every competitor is black glass). One dark shot (Carbon) late in the set.

1. **The book hero** — deck TODAY with a real "DAYS ON THE BOOK 412" state.
   Caption: *Every pro keeps a book.*
2. **The heat sheet** — schedule with ◆ margin diamonds, ✓/○ glyphs mixed.
   Caption: *Post the day. Misses are ink withheld — never red.*
3. **The night page** (Carbon/inverted, count-up bezel).
   Caption: *Urges crest and pass. Outlast them.*
4. **The Guardian** — drift sentinel with named vectors.
   Caption: *Drift caught upstream, in your danger window.*
5. **Trends / the week's balance** grid.
   Caption: *The week reconciled. One change named.*
6. **Onboarding** — "Opening your book" question card.
   Caption: *Answer honestly. The protocol adapts.*

Seed state for shots: run the app once, then set localStorage
`lockedin:streak` cleanDates to ~412 entries / startedAt 47 days back (or use a
seeding snippet) so the hero number is aspirational-but-plausible. Never
fabricate a screenshot the product can't produce.

## Store-adjacent

- Promo text (170 chars, editable anytime):
  `The discipline ledger: post your blocks, keep the streak, outlast the urge. Paper calm, zero shame. The book is free forever — the coach is hired.`
- Support URL: (Vercel site) · Marketing URL: the waitlist page
- Privacy policy URL: host legal/PRIVACY.md (required before submission)
