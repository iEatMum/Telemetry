#!/usr/bin/env python3
# design-sync/build.py — generate the Split Ledger design-system bundle pushed
# to Ian's claude.ai Design project (MASTERPLAN Phase 2 step 0).
#
# The cards are SELF-CONTAINED HTML (inline tokens, no external assets) so the
# Design System pane renders them anywhere. Token values are copied from the
# shipped src/index.css — if the app's tokens change, re-run this and re-push.
# Every card's first line is the @dsCard marker the pane indexes.

import os, pathlib

OUT = pathlib.Path(__file__).parent

# ── Token truth (mirrors src/index.css, 2026-07-18 · commit fb8a410) ─────────
SKINS = {
    "split": dict(bg="#ede4ce", surface="#f6efdd", surface2="#e2d7bc", line="#c9bc9c",
                  linebright="#ac9f7d", ink="#1f1b12", muted="#625843", faint="#6c6451",
                  accent="#c93f22", accenttext="#a83318", accentdeep="#a93318", accentink="#f9f3e2",
                  pos="#3f6e4e", neg="#8e3b44", warn="#8c671a", scheme="light",
                  label="Split Book — manila paper, carbon ink, lane-red seal. Daylight."),
    "lamplight": dict(bg="#14100a", surface="#1b160e", surface2="#241d12", line="#3a3222",
                  linebright="#4e4430", ink="#e7dcc4", muted="#9a8d72", faint="#877c68",
                  accent="#b25b41", accenttext="#c47254", accentdeep="#8f462f", accentink="#201409",
                  pos="#7fa98b", neg="#b07680", warn="#c0985a", scheme="dark",
                  label="Lamplight — amber-washed ink-dark paper for the vulnerable evening."),
    "carbon": dict(bg="#101214", surface="#16191c", surface2="#1d2125", line="#2a2f34",
                  linebright="#3b4249", ink="#e8e6e1", muted="#8d9298", faint="#7a7f83",
                  accent="#c4553b", accenttext="#d0755a", accentdeep="#9e4029", accentink="#f5efe6",
                  pos="#79b48d", neg="#c97a83", warn="#cfa25c", scheme="dark",
                  label="Carbon — graphite page, bone ink, brick seal. All-day dark."),
    "invert": dict(bg="#17130b", surface="#1e1910", surface2="#262013", line="#3a3222",
                  linebright="#4e4430", ink="#e7dcc4", muted="#9a8d72", faint="#897e6a",
                  accent="#c6502f", accenttext="#cf7250", accentdeep="#9d3f22", accentink="#f5ead6",
                  pos="#7fa98b", neg="#b07680", warn="#c0985a", scheme="dark",
                  label="The night page (data-invert) — the stopwatch inversion every skin resolves to."),
}

CLOCK = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"

def skin_vars(s):
    v = SKINS[s]
    return (f"--bg:{v['bg']};--surface:{v['surface']};--surface2:{v['surface2']};"
            f"--line:{v['line']};--linebright:{v['linebright']};--ink:{v['ink']};"
            f"--muted:{v['muted']};--faint:{v['faint']};--accent:{v['accent']};"
            f"--accent-text:{v['accenttext']};--accent-deep:{v['accentdeep']};"
            f"--accent-ink:{v['accentink']};--pos:{v['pos']};--neg:{v['neg']};--warn:{v['warn']};"
            f"color-scheme:{v['scheme']};")

BASE_CSS = f"""
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:{SANS}; background:var(--bg); color:var(--ink); padding:20px;
         -webkit-font-smoothing:antialiased; }}
  .skin-split {{ {skin_vars('split')} }}
  .skin-lamplight {{ {skin_vars('lamplight')} }}
  .skin-carbon {{ {skin_vars('carbon')} }}
  .skin-invert {{ {skin_vars('invert')} }}
  .clock {{ font-family:{CLOCK}; }}
  .tnum {{ font-variant-numeric:tabular-nums; }}
  .micro {{ font-family:{CLOCK}; font-size:11px; text-transform:uppercase;
           letter-spacing:.18em; color:var(--muted); }}
  .panel {{ background:var(--bg); color:var(--ink); border:1px solid var(--line);
           padding:18px; border-radius:0; }}
  .hairline {{ border-top:1px solid var(--line); }}
  .note {{ font-size:12px; line-height:1.55; color:var(--muted); max-width:64ch; }}
  h1.card-title {{ font-family:{CLOCK}; font-size:13px; text-transform:uppercase;
                  letter-spacing:.2em; margin-bottom:4px; }}
  .sub {{ font-size:12px; color:var(--muted); margin-bottom:16px; }}
"""

def page(group, title, subtitle, body, skin="split", extra_css=""):
    return f"""<!-- @dsCard group="{group}" -->
<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>{BASE_CSS}{extra_css}</style></head>
<body class="skin-{skin}">
<h1 class="card-title">{title}</h1>
<p class="sub">{subtitle}</p>
{body}
</body></html>"""

FILES = {}

# ── Colors ───────────────────────────────────────────────────────────────────
def swatch_row(s):
    v = SKINS[s]
    cells = "".join(
        f"<div class='sw'><div class='chip' style='background:{v[k]}'></div>"
        f"<div class='swl'>{name}</div><div class='swv'>{v[k]}</div></div>"
        for k, name in [("bg","bg"),("surface","surface"),("surface2","surface-2"),("line","line"),
                        ("ink","ink"),("muted","muted"),("faint","faint"),("accent","accent · seal"),
                        ("accenttext","accent-text · AA"),("accentdeep","accent-deep"),
                        ("pos","pos"),("neg","neg"),("warn","warn")])
    return (f"<div class='skinblock skin-{s}'><div class='micro' style='margin-bottom:10px'>{s}</div>"
            f"<p class='note' style='margin-bottom:12px'>{v['label']}</p>"
            f"<div class='swgrid'>{cells}</div></div>")

FILES["guidelines/colors.card.html"] = page(
    "Colors", "Split Ledger — palettes",
    "Three complete skins + the night-page inversion. ONE lane-red, grammatically reserved for commitment.",
    "".join(swatch_row(s) for s in ["split","lamplight","carbon","invert"]) +
    """<div class='panel' style='margin-top:16px'>
    <div class='micro' style='margin-bottom:8px'>The lane-red grammar</div>
    <p class='note'>Lane-red marks COMMITMENT only: Start, the seal, the ◆ high-impact marker,
    the active HELP state. It can never mark a miss — a miss is withheld ink (muted, dashed),
    never a stain. <b>accent-text</b> is the AA-passing variant every piece of red TEXT wears
    (≥4.5:1 on surface-2); surfaces and seals keep the true accent. pos/neg/warn are reserved
    for EXTERNAL data (biometrics, conditions) — never a person's behavior.</p></div>""",
    extra_css="""
    .skinblock { padding:16px; border:1px solid var(--line); background:var(--bg);
                 color:var(--ink); margin-bottom:12px; }
    .swgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:10px; }
    .sw { font-size:10px; }
    .chip { height:34px; border:1px solid var(--line); margin-bottom:4px; }
    .swl { color:var(--ink); } .swv { font-family:%s; color:var(--muted); }
    """ % CLOCK)

# ── Type ─────────────────────────────────────────────────────────────────────
FILES["guidelines/type.card.html"] = page(
    "Type", "Split Ledger — type",
    "Two voices: the stopwatch face (IBM Plex Mono 400/500) and the human voice (SF Pro). Authored in rem — Dynamic Type scales the root.",
    """<div class='panel'>
      <div class='micro'>Days on the book</div>
      <div class='clock tnum' style='font-size:4rem;line-height:1'>212</div>
      <div class='clock tnum' style='font-size:3.5rem;line-height:1;margin-top:8px'>00:24</div>
      <div class='micro' style='margin-top:6px'>the hero numerals — mono, tabular, never glowing</div>
    </div>
    <div class='panel' style='margin-top:12px'>
      <div style='font-size:1.5rem;font-weight:600;letter-spacing:-0.01em'>You made it here. That was the hard part.</div>
      <p style='font-size:0.9375rem;color:var(--muted);line-height:1.6;margin-top:8px;max-width:44ch'>
        The human voice: body copy, supportive lines. System sans, calm weight, generous leading.</p>
      <div class='micro' style='margin-top:14px'>Micro-caps · 11px floor · 0.18em tracking</div>
      <p class='note' style='margin-top:8px'>The scale (rem): 0.6875 micro · 0.75 label · 0.8125 body-s ·
      0.875 body · 0.9375 body-l · 1.5 display-s · 1.625 display · 3.5 clock · 4 hero.
      Nothing below the 11px floor anywhere; nothing below it EVER on the night page.</p>
    </div>""")

# ── Motion ───────────────────────────────────────────────────────────────────
FILES["guidelines/motion.card.html"] = page(
    "Motion", "Split Ledger — motion",
    "One ease — cubic-bezier(.4,0,.2,1). Four verbs. Print does not glow; nothing animates outside these.",
    """<div class='panel'>
      <table style='width:100%;border-collapse:collapse;font-size:12px'>
        <tr class='hairline'><td class='clock' style='padding:8px 0;width:120px'>ink-settle</td><td style='color:var(--muted)'>140ms · content arriving (data-stream entry)</td></tr>
        <tr class='hairline'><td class='clock' style='padding:8px 0'>breath</td><td style='color:var(--muted)'>1800ms · the one live pulse (running clock, LED)</td></tr>
        <tr class='hairline'><td class='clock' style='padding:8px 0'>rule-draw</td><td style='color:var(--muted)'>280ms · a hairline drawing in (tab underline)</td></tr>
        <tr class='hairline'><td class='clock' style='padding:8px 0'>seal-press</td><td style='color:var(--muted)'>1200ms hold sweep → 520ms stamp settle · the ceremony</td></tr>
      </table>
      <div style='margin-top:16px' class='micro'>seal-press, live:</div>
      <div style='margin-top:8px;position:relative;height:48px;border:1px solid var(--accent-deep)'>
        <div class='sweep'></div>
        <div class='clock' style='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;letter-spacing:.18em;text-transform:uppercase'>Hold to seal</div>
      </div>
      <p class='note' style='margin-top:12px'>Haptic grammar: sealCommit (one success beat) fires ONLY on
      commitment — posting a row, "I stayed", INITIALIZE, the seal. A slip is SILENT. selectionTick for
      pickers. Reduced-motion: every animation collapses to its end state.</p>
    </div>""",
    extra_css="""
    .sweep { position:absolute; inset:0; width:0; background:var(--accent);
             animation:sweep 2.4s cubic-bezier(.4,0,.2,1) infinite; opacity:.85; }
    @keyframes sweep { 0%{width:0} 50%{width:100%} 62%{width:100%} 100%{width:0} }
    """)

# ── Voice ────────────────────────────────────────────────────────────────────
FILES["guidelines/voice.card.html"] = page(
    "Voice", "Split Ledger — the book's language",
    "One dialect. The trading floor, the ops terminal, and engineer-speak are all retired.",
    """<div class='panel'>
      <table style='width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.5'>
        <tr><th style='text-align:left;padding:6px 0' class='micro'>Say</th><th style='text-align:left' class='micro'>Never</th></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>dictate the day · the book takes dictation</td><td style='color:var(--muted)'>configure your schedule</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>post a line · 3/4 posted</td><td style='color:var(--muted)'>EXEC · executed count</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>rule off the day · the page seals</td><td style='color:var(--muted)'>Sync &amp; Refactor</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>the night page · outlast it · ride it out</td><td style='color:var(--muted)'>urge protocol UI-speak, panic framing</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>logged · the book stays open</td><td style='color:var(--muted)'>failure, streak lost, red anything</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>days on the book · the record</td><td style='color:var(--muted)'>score, performance index</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>the coach is hired · the book is free</td><td style='color:var(--muted)'>premium unlock, PRO</td></tr>
        <tr class='hairline'><td style='padding:7px 8px 7px 0'>the HEALTH page · on your iPhone</td><td style='color:var(--muted)'>surface, build, native-only, HealthKit</td></tr>
      </table>
      <p class='note' style='margin-top:12px'>Register: a calm senior coach writing in a paper ledger.
      Data, not verdicts. A miss is logged, never punished. The reader may be in recovery — the book
      never shames, never celebrates a slip's absence with confetti, and keeps 988 one tap away on
      every night-page phase.</p>
    </div>""")

# ── Components ───────────────────────────────────────────────────────────────
FILES["components/heat-sheet.card.html"] = page(
    "Components", "Heat sheet (ScheduleMatrix)",
    "The hero. The day as a ruled table — mono time, label, state glyph. ◆ confined to the left margin.",
    """<div class='panel' style='max-width:420px'>
      <div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px'>
        <span class='micro'>Today</span><span class='clock tnum micro'>1/4 posted</span>
      </div>
      <div class='hairline'></div>
      <div class='row'><span class='dia'>◆</span><span class='t'>05:30</span><span class='b done'>Wake — feet on floor</span><span class='g'>✓</span></div>
      <div class='row now'><span class='dia'>◆</span><span class='t'>09:00</span><span class='b'>Chem — study block</span><span class='g clock' style='color:var(--accent-text);font-size:10px;letter-spacing:.18em'>◆ NOW</span></div>
      <div class='row'><span class='t'>12:30</span><span class='b'>Train — tempo</span><span class='g open'></span></div>
      <div class='row'><span class='t'>22:15</span><span class='b missed'>Phone out of the room</span><span class='g'><span class='circ'></span></span></div>
      <p class='note' style='margin-top:12px'>Tap posts (sealCommit haptic); tap again un-posts — refused once
      the day is ruled off. Done = ink ✓. Missed = open graphite circle + muted dashed label — ink withheld,
      never red. The current block: surface-2 + accent-deep left rule.</p>
    </div>""",
    extra_css=f"""
    .row {{ display:flex; align-items:center; gap:12px; min-height:44px; border-bottom:1px solid var(--line);
           padding:6px 4px 6px 16px; position:relative; font-size:0.8125rem; }}
    .row.now {{ background:var(--surface2); border-left:2px solid var(--accent-deep); }}
    .dia {{ position:absolute; left:2px; color:var(--accent); font-size:9px; }}
    .t {{ font-family:{CLOCK}; font-variant-numeric:tabular-nums; font-size:0.75rem; color:var(--muted); width:44px; flex:none; }}
    .b {{ flex:1; }} .b.missed {{ color:var(--faint); text-decoration:line-through dashed; }}
    .b.done {{ color:var(--muted); }}
    .g {{ width:20px; text-align:center; }}
    .circ {{ display:inline-block; width:12px; height:12px; border-radius:50%; border:1px solid var(--muted); }}
    """)

FILES["components/masthead.card.html"] = page(
    "Components", "Masthead + deck tabs",
    "One focal point per page: DAYS ON THE BOOK owns the deck. Tabs are a payload-driven strip with a rule-draw underline.",
    """<div class='panel' style='max-width:420px'>
      <div style='display:flex;justify-content:space-between'>
        <div><div class='micro'>Days on the book</div>
        <div class='clock tnum' style='font-size:4rem;line-height:.95;margin-top:6px'>37</div></div>
        <div style='text-align:right'><div class='clock micro'>Sat · Jul 18</div>
        <div class='clock micro' style='margin-top:4px;color:var(--faint)'>run 8 · wk 2</div>
        <div class='clock micro' style='margin-top:4px;text-decoration:underline'>SHARE</div></div>
      </div>
      <div style='display:flex;gap:4px;margin-top:18px;border-bottom:1px solid var(--line)'>
        <div class='tab on clock'>TODAY</div><div class='tab clock'>TRENDS</div>
      </div>
      <p class='note' style='margin-top:12px'>Day-0 wears an invitation instead of a stark zero:
      “The book opens · Day one.” The masthead's numbers print ONCE — no tile below repeats them.</p>
    </div>""",
    extra_css="""
    .tab { font-size:12px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted);
           padding:12px 12px; border-bottom:2px solid transparent; margin-bottom:-1px; }
    .tab.on { color:var(--ink); border-bottom-color:var(--accent); }
    """)

FILES["components/deepwork.card.html"] = page(
    "Components", "Deep-work timer (the anchor)",
    "The deck's ONE lane-red element. The anchor row and this timer share a single impact record.",
    """<div class='panel' style='max-width:420px;background:var(--surface)'>
      <div style='display:flex;justify-content:space-between;align-items:center'>
        <span class='micro' style='color:var(--ink)'>Deep work — first block</span>
        <span class='clock' style='font-size:10px;letter-spacing:.18em;color:var(--accent-text);border:1px solid var(--accent-deep);padding:3px 7px'>◆ HIGH IMPACT</span>
      </div>
      <div class='clock tnum' style='font-size:3.5rem;margin:14px 0 12px'>50:00</div>
      <div style='height:4px;background:var(--surface2);margin-bottom:14px'><div style='height:4px;width:0%;background:var(--accent)'></div></div>
      <div style='background:var(--accent);color:var(--accent-ink);text-align:center;padding:15px' class='clock'>
        <span style='font-size:13px;letter-spacing:.18em;font-weight:600'>▶ &nbsp;START</span></div>
      <p class='note' style='margin-top:12px'>Running: the clock takes the screen (cockpit). Finishing posts
      the shared anchor record, fires sealCommit, and banks a rep into the weekly deep-work target.</p>
    </div>""")

FILES["components/night-page.card.html"] = page(
    "Components", "The night page (landing + ride)",
    "Always the data-invert skin, whatever the app wears. Landing starts NOTHING; the ride counts UP.",
    """<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px'>
      <div class='panel skin-invert' style='background:var(--bg);text-align:center;padding:26px 18px'>
        <div class='micro'><span style='color:var(--accent-text)'>●</span> THE NIGHT PAGE</div>
        <div style='font-size:1.35rem;font-weight:600;line-height:1.25;margin:14px auto;max-width:24ch'>You made it here. That was the hard part.</div>
        <p class='note' style='margin:0 auto 16px'>Nothing starts, and nothing is written, until you say so.</p>
        <div class='clock' style='background:var(--accent);color:var(--accent-ink);padding:13px;font-size:12px;letter-spacing:.18em;font-weight:600'>START THE RIDE</div>
        <p class='note' style='margin-top:12px;font-size:11px'>In crisis? <u>Call 988</u> or <u>text 988</u> — every phase.</p>
      </div>
      <div class='panel skin-invert' style='background:var(--bg);text-align:center;padding:26px 18px'>
        <div class='micro'>OUTLASTED — LIFETIME</div>
        <div class='clock tnum' style='font-size:3rem;line-height:1;margin:8px 0'>12</div>
        <div class='clock tnum' style='font-size:1.6rem'>07:41</div>
        <div class='micro' style='color:var(--faint);margin-top:2px'>this ride</div>
        <div style='text-align:left;margin-top:14px'>
          <div style='border:1px solid var(--line);padding:9px 10px;font-size:12px;color:var(--muted)'>— &nbsp;A hard 2-minute effort <span style='float:right;font-size:10px'>set aside</span></div>
          <div style='border:1px solid var(--accent-deep);background:var(--surface2);padding:9px 10px;font-size:12px;margin-top:6px'>2 &nbsp;Breathe 4-7-8, five rounds <span class='clock' style='float:right;font-size:10px;color:var(--accent-text);letter-spacing:.15em'>NOW</span></div>
        </div>
        <p class='note' style='margin-top:12px;font-size:11px'>“I stayed” arms at 60s · the slip costs a
        1.2s hold and is logged in ONE compassionate voice — never red. The ride survives an app kill.</p>
      </div>
    </div>""",
    skin="invert")

FILES["components/seal.card.html"] = page(
    "Components", "The seal ceremony (rule off the day)",
    "The hero interaction. Tap opens the confirm page; a 1.2s hold sweeps lane-red and stamps the day.",
    """<div class='panel' style='max-width:420px'>
      <div class='clock micro' style='margin-bottom:10px'>At the deck's foot · in the scroll flow</div>
      <div style='border:1px solid var(--line);padding:14px;text-align:center' class='clock'>
        <span style='font-size:12px;letter-spacing:.18em;text-transform:uppercase'>Rule off the day</span></div>
      <div style='margin:16px 0 8px' class='micro'>The confirm page</div>
      <div style='border-top:1px solid var(--line);padding-top:12px'>
        <div style='font-size:1.15rem;font-weight:600'>Seal the day</div>
        <p class='note' style='margin-top:6px'>3 of 4 posted · one line withheld. The page seals as written —
        the book does the remembering.</p>
        <div style='position:relative;height:50px;border:1px solid var(--accent-deep);margin-top:12px;overflow:hidden'>
          <div style='position:absolute;inset:0;width:62%;background:var(--accent)'></div>
          <div class='clock' style='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;letter-spacing:.18em;text-transform:uppercase;mix-blend-mode:difference;color:#fff'>Hold to seal</div>
        </div>
        <div class='micro' style='margin-top:10px;text-align:center'>after: “Ruled off — tomorrow's page is set.”</div>
      </div>
      <p class='note' style='margin-top:12px'>COMMISSION (round 2): the 216px ◆ wax-seal ceremony ring —
      press-sweep → stamp → settle — replaces the plain bar here. sealCommit haptic on the stamp frame.</p>
    </div>""")

FILES["components/nav.card.html"] = page(
    "Components", "Bottom nav + HELP",
    "Five surfaces + HELP docked as the sixth slot. HELP wears its OWN life-ring glyph — ink at rest, accent only while the night page is open.",
    """<div class='panel' style='max-width:460px;padding:0'>
      <div style='display:flex;border-top:1px solid var(--line)'>
        <div class='slot on'><svg viewBox='0 0 24 24'><rect x='4' y='10' width='16' height='10' rx='1.5'/><path d='M6 7h12M8 4h8'/></svg><span>DECK</span></div>
        <div class='slot'><svg viewBox='0 0 24 24'><circle cx='12' cy='14' r='7'/><path d='M12 11v3.5l2.5 1.5M10 2h4M12 2v3'/></svg><span>SPRINTS</span></div>
        <div class='slot'><svg viewBox='0 0 24 24'><path d='M3 12h4l2-6 4 12 2-6h6'/></svg><span>HEALTH</span></div>
        <div class='slot'><svg viewBox='0 0 24 24'><path d='M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z'/></svg><span>GUARDIAN</span></div>
        <div class='slot'><svg viewBox='0 0 24 24'><path d='M4 7h10M18 7h2M4 17h4M12 17h8'/><circle cx='16' cy='7' r='2'/><circle cx='10' cy='17' r='2'/></svg><span>COMMAND</span></div>
        <div class='slot help'><svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='3.8'/><path d='M5.7 5.7l3.6 3.6M14.7 14.7l3.6 3.6M18.3 5.7l-3.6 3.6M9.3 14.7l-3.6 3.6'/></svg><span>HELP</span></div>
      </div>
    </div>
    <p class='note' style='margin-top:12px'>Active surface = accent icon + label; everything else muted.
    HELP: ink + semibold at rest (findable, never falsely “active”), accent while open. A docked slot can
    never float over content.</p>""",
    extra_css="""
    .slot { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 0 14px;
            color:var(--muted); font-family:%s; font-size:10px; letter-spacing:.18em; }
    .slot svg { width:24px; height:24px; fill:none; stroke:currentColor; stroke-width:1.7;
                stroke-linecap:round; stroke-linejoin:round; }
    .slot.on { color:var(--accent-text); } .slot.help { color:var(--ink); font-weight:600; }
    """ % CLOCK)

FILES["components/paywall.card.html"] = page(
    "Components", "CoachGate + paywall",
    "The coach is a closed ledger page, not a lock. The book itself is free forever — the paywall must keep saying so.",
    """<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px'>
      <div class='panel' style='background:var(--surface)'>
        <div style='text-align:center;padding:10px 0 4px'>
          <div style='font-size:26px;color:var(--accent)'>◆</div>
          <div class='micro' style='margin-top:8px'>The coach's page is sealed</div>
          <p class='note' style='margin:10px auto 14px;max-width:30ch'>Drift review, weekly reads, counsel —
          written for your book, when you hire the coach.</p>
          <div class='clock' style='border:1px solid var(--accent-deep);color:var(--accent-text);padding:11px;font-size:11px;letter-spacing:.18em'>OPEN THE COACH'S PAGE · 7-DAY FREE</div>
        </div>
      </div>
      <div class='panel' style='background:var(--surface)'>
        <div class='micro' style='margin-bottom:10px'>Free forever / the coach</div>
        <table style='width:100%;font-size:11.5px;border-collapse:collapse;color:var(--muted)'>
          <tr class='hairline'><td style='padding:6px 0;color:var(--ink)'>The whole book</td><td style='text-align:right'>free</td></tr>
          <tr class='hairline'><td style='padding:6px 0;color:var(--ink)'>Night page + 988</td><td style='text-align:right'>free</td></tr>
          <tr class='hairline'><td style='padding:6px 0;color:var(--ink)'>Guardian drift review</td><td style='text-align:right'>coach</td></tr>
          <tr class='hairline'><td style='padding:6px 0;color:var(--ink)'>Weekly read + counsel</td><td style='text-align:right'>coach</td></tr>
        </table>
        <div class='clock' style='margin-top:12px;background:var(--accent);color:var(--accent-ink);text-align:center;padding:12px;font-size:12px;letter-spacing:.18em;font-weight:600'>HIRE THE COACH</div>
        <div class='micro' style='margin-top:8px;text-align:center'>$6.99/mo · $39.99/yr · StoreKit-localized</div>
      </div>
    </div>
    <p class='note' style='margin-top:12px'>ONE gate per screen (the second gate on a locked page collapses
    to a quiet sealed row). Lapsed subscribers get the winback page — “the book kept every page.”</p>""")

FILES["components/sheet.card.html"] = page(
    "Components", "Bottom sheet",
    "“A page pulled from the book”: 10px top lip, hairline sections, no boxes-in-boxes. Escape + Tab stay contained.",
    """<div class='panel' style='max-width:420px;padding:0;background:transparent;border:none'>
      <div style='background:var(--surface);border-top:1px solid var(--line);border-radius:10px 10px 0 0;padding:20px'>
        <div style='width:40px;height:4px;background:var(--line);border-radius:99px;margin:0 auto 14px'></div>
        <div style='font-size:1.1rem;font-weight:600;margin-bottom:14px'>Settings</div>
        <div class='hairline' style='padding:12px 0'>
          <div class='micro'>Your day, dictated</div>
          <div style='font-size:13px;margin-top:8px;background:var(--surface2);border:1px solid var(--line);border-radius:6px;padding:10px;text-align:center'>Edit the day's blocks (3)</div>
        </div>
        <div class='hairline' style='padding:12px 0'>
          <div class='micro'>The coach</div>
          <div style='display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:13px'>
            <span>On trial. Managed through the App Store.</span>
            <span style='background:var(--surface2);border:1px solid var(--line);border-radius:6px;padding:8px 14px'>Manage</span>
          </div>
        </div>
      </div>
    </div>
    <p class='note' style='margin-top:12px'>Radius grammar: cards are square (0), controls 6px, the sheet's
    one 10px top lip. Sheets pad by --keyboard-inset so inputs stay above the iOS keyboard. COMMISSION
    (round 2): the entrance/exit motion — a page pulled from and returned to the book.</p>""")

# ── The round-2 brief ────────────────────────────────────────────────────────
FILES["brief/round-2-mandate.card.html"] = page(
    "Brief", "Round 2 mandate (ratified 2026-07-17)",
    "Design tournament mean 82.1. The champion holds; round 2 = SIMPLIFY + REAL ART + SANCTIONED MOTION.",
    """<div class='panel'>
      <div class='micro' style='margin-bottom:8px'>1 · Simplify</div>
      <p class='note'>One label primitive (the 3-way label fork dies). Every number prints ONCE per page
      (hero vs Pulse vs Guardian currently triple-print streak/clean). One focal point per screen.
      Progressive disclosure day-0 → day-7 everywhere the brand-new deck already pioneered.</p>
      <div class='micro' style='margin:14px 0 8px'>2 · Real graphic art (commissions)</div>
      <p class='note'>· Layered iOS-26 app icon — manila ground, carbon ring, lane-red ◆ seal (dark + tinted variants)<br>
      · The 216px ◆ wax-seal ceremony ring: press-sweep → stamp → settle<br>
      · Six tour illustrations (pages are text-only “tell” today)<br>
      · Day-0 empty-book illustration · milestone share-card art<br>
      · App Store: 6-shot designed frame system + 15–20s seal-ceremony preview</p>
      <div class='micro' style='margin:14px 0 8px'>3 · Motion (reduced-motion fallbacks everywhere)</div>
      <p class='note'>Seal ceremony (commit-hold ≠ slip-hold visually) · sheet entrance/exit “a page pulled
      from the book” · rule-draw tab underline · page-turn between TODAY/TRENDS · pressed states on all
      primary targets · wire haptic-beat + selectionTick to their moments.</p>
      <div class='micro' style='margin:14px 0 8px'>Hard rules (unchanged)</div>
      <p class='note'>Lane-red = commitment only, never a miss · no glow, print does not glow · 11px floor ·
      AA everywhere (accent-text for red type) · the night page is always the inversion · a miss is withheld
      ink · 988 never leaves the night page · the book is free forever and the funnel must look like the app.</p>
    </div>""")

# ── Tokens as raw CSS files ──────────────────────────────────────────────────
FILES["tokens/colors.css"] = "/* Split Ledger palettes — mirror of src/index.css (fb8a410) */\n" + \
    "\n".join(f":root[data-theme='{k}'] {{ {skin_vars(k)} }}" for k in ["split","lamplight","carbon"]) + \
    f"\n[data-invert] {{ {skin_vars('invert')} }}\n"
FILES["tokens/typography.css"] = f"""/* Split Ledger type — authored in rem; --type-scale multiplies the root */
:root {{ --font-clock: {CLOCK}; --font-sans: {SANS}; --type-scale: 1; }}
html {{ font-size: calc(100% * var(--type-scale)); }}
/* scale: .6875 micro · .75 label · .8125 body-s · .875 body · .9375 body-l ·
   1.5 display-s · 1.625 display · 3.5 clock · 4 hero — 11px floor everywhere */
"""
FILES["tokens/motion.css"] = """/* One ease, four verbs. Nothing animates outside these. */
:root { --ease: cubic-bezier(0.4,0,0.2,1); --dur-quick: 140ms; --dur-calm: 280ms;
        --dur-pulse: 1800ms; --dur-seal: 1200ms; --dur-stamp: 520ms; }
@media (prefers-reduced-motion: reduce) { * { animation-duration:.001ms !important; } }
"""
FILES["tokens/spacing.css"] = """/* The ledger is square. */
:root { --radius-card: 0px; --radius-control: 6px; --radius-sheet: 10px;
        --pad-card: 16px; --gap-widget: 14px; --gap-stat: 12px; --keyboard-inset: 0px; }
"""

FILES["readme.md"] = """# Telemetry — Split Ledger design system
The SHIPPED truth as of 2026-07-18 (repo commit fb8a410). The old "LOCKED IN"
terminal/gold era is gone — the brand pivoted to **Telemetry** (manila paper,
carbon ink, one lane-red seal) and this project now mirrors the app.

- `tokens/` — the CSS contract (copied from src/index.css; the repo is canonical).
- `guidelines/` — colors, type, motion, voice.
- `components/` — canonical previews of the shipped surfaces.
- `brief/` — the round-2 mandate: simplify, commission real art, sanctioned motion.

Regenerate from the repo with `python3 design-sync/build.py` and re-push via
DesignSync. Never edit tokens here first — the app's src/index.css leads.
"""

for path, content in FILES.items():
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
print(f"wrote {len(FILES)} files under {OUT}")
