# GPT Working Reference — FCR Web Calculator

Purpose
Keep the key contracts, checks, and quick tests we use with GPT in one place.

Event pipeline (must never drift)
- Speaker: js/ui.js → after compute, reveal #results and:
  window.dispatchEvent(new CustomEvent("metrics:updated", { detail: { /* payload below */ }}));
- Listener: js/analytics.js → IIFE with one window.addEventListener("metrics:updated", handler)
  • Fill IDs, set CSS vars: --thermo, --pct, --score, --lay
  • End file at the closing IIFE. Nothing after.

Payload keys (short list)
{ units, eggs, avgEggWeightG, bagWeightKg, bagPrice,
  fcr, feedPerEggG, layRate, feedPerBird_g, cpe, cpd,
  alt: { costPerEggAlt?, savingsTotal?, altSharePct? } | null }

Design tokens only (no raw hex in component CSS)
--bg, --card, --ink, --muted, --brand, --brand-ink, --border, --warn, --ok

Layout rules
- Module cap & centering: container width clamp(320px, 100%, 430px); margin-inline:auto
- Analytics cards: three siblings .resultCard inside #farmAnalytics
- .substats grid: at ~360–430px → 3×2 (two rows of three); <~340px → 2 cols
- Equal chip heights; text never overlaps ledger strip; .chip--visual has no strip

Visuals driven by CSS vars
- .a-thermo → --thermo: "0%–100%"
- .egg.pieChart → --pct: 0–1 (donut via conic-gradient + mask)
- .a-coins → --score: "0%–100%"
- .lay-meter → --lay: "0%–100%" (wide red→green bar under LAYING header)

Settings panel (footer cog toggles a card)
- Includes: Units, Language, Currency Symbol, Font Size, High Contrast
- Persist to localStorage; apply live without reload
- Autoscroll panel fully into view when opening

Daily counter + export/print
- Keyed by calcCount::YYYY-MM-DD (increment on successful Calculate)
- Show message in two places: under the “Cluckulation Evaluation” heading and below cards
- Export CSV (latest calculation or append mode); Print only #printable (via @media print)

Acceptance checklist (run after each change)
1) Hard refresh → no console errors
2) First view: Calculate visible; Feed Prices collapsed
3) Click Calculate → results unhide; exactly one metrics:updated heard; values + visuals update
4) Layout 360/430/desktop → .substats is 3×2, equal heights; <340px → 2 cols; no overlaps
5) Settings → live-update & persist; unit labels and currency symbols flip everywhere
6) Daily counter visible in both places; resets per day
7) Export CSV and Print behave as specified
8) Privacy note in footer; no inline UI logic beyond the tiny EOF scroll helper
9) No “zombie tails”: no code after </html>, none after the closing IIFE in analytics.js

90-second console triage (paste in DevTools if cards are empty)
- Tap the event:
  window.__tap=0;
  window.addEventListener('metrics:updated', e => { console.log('[tap] metrics', e.detail); window.__tap++; });

- Manual fire (fake data):
  window.dispatchEvent(new CustomEvent('metrics:updated',{ detail:{
    units:'metric', eggs:21, avgEggWeightG:57, bagWeightKg:20, bagPrice:30,
    fcr:2.18, feedPerEggG:148, layRate:88, feedPerBird_g:129, cpe:0.123, cpd:1.48,
    alt:{savingsTotal:0, altSharePct:0}
  }}));

Interpretation:
- UI fills → analytics.js OK; ui.js dispatch missing/broken
- UI doesn’t fill → analytics.js not loaded or errored

Jargon glossary
- “Zombie tail”: any stray code/text after </html> (HTML) or after the closing IIFE (JS) that breaks parsing.
- “Heartbeat”: a tiny timestamp (e.g., window.__lastMetricsUpdated = Date.now()) set by the analytics listener so ui.js can warn if no event was heard within ~300ms.

Copilot prompts (defaults)
- Unless I say otherwise, GPT should return **a single Copilot prompt** for multi-file edits, scoped, minimal diffs, with acceptance checks listed.

Safety rails you can paste into any prompt (short)
“Read/write only the named files; produce minimal diffs; no whole-file rewrites. After the change, run the acceptance checks. Stop if there’s any console error, duplicate event dispatch/listener, or code after </html>/after the closing IIFE.”

