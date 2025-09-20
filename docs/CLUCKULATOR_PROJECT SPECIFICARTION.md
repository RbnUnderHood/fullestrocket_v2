Cluckulator — Project Specification

Version: 2025 Draft (v1.0.3)

1. Vision

Backyard chicken keepers in the US, UK, and Australia face everyday questions:

Am I feeding my flock efficiently?

What’s my cost per egg?

Is it financially worth it to keep backyard chickens?

Cluckulator is a free, offline-first web app that makes these answers fast, simple, visual, and fun.
It’s both a calculator and a small art piece — built under the label UnderHood, blending playful design, humor, and utility.

2. Core Features

Feed Conversion Ratio (FCR) calculator.

Cost per egg/dozen with currency flexibility.

Lay rate with plausibility bands (soft warnings vs. hard blocks).

Alternative feed mix simulation (auto-scale, Σ clamps).

Free-range presets (5%, 10%, 20%).

CSV export & Print — hardened for real use.

Poultry Logger (free) — automatic log of calculations, exportable to CSV.

Offline-ready: works on phones and desktop without logins or network calls.

3. Why It Matters

Many people arrive via Google searching “is it financially worth it to have backyard chickens?”

Preloaded defaults mean they can hit Cluckulate Chickenfficiency instantly and see that their eggs could cost just a few cents each.

Even curious non-keepers can try it in seconds and feel the magic.

Logging, export, and print features make it more than a toy — it’s a free alternative to paid poultry tracking apps.

4. User Experience

Mobile-first: the calculator and “Cluckulate Chickenfficiency” button are fully visible on first open.

Preloaded defaults: realistic but flattering (average feed prices, flock size, lay rate). This ensures first-time visitors instantly see a low cost/egg.

Instant results: one click → results, export, and logging confirmation all visible within seconds.

Desktop layout: calculator centered, info/tips sections on side panels.

Mobile layout: contextual tips appear (e.g., if cost/egg is unusually high, link to “feed tricks”).

5. Artistic Vision (UnderHood)

Playful UI: stickers, badges, doodles layered onto the interface.

Gaming-style button: the “Cluckulate Chickenfficiency” button is bold, flashy, and inviting.

First-time guidance: bold, animated cues highlighting input fields and the button.

Chicken Lady character: illustrated guide who pops up with comments, tips, or humor.

Wordplay everywhere: “cluckulations,” “chickenfficiency,” etc., used as overlays and labels (never in place of SEO-critical terms).

Humor + daily delight: witty feedback and gamified feel encourage repeat visits.

6. Market Approach

Phase 1 — Western Keepers:
Launch free app, promote on Reddit and FB groups, and build organic SEO traffic.

Phase 2 — Monetization:
Use AdSense and tasteful industry ads; explore collaborations with feed suppliers and backyard chicken brands.

Phase 3 — Future Expansion:
Optional backend (logins, databases), Pro tier, and adaptation for small-scale farmers (see FUTURE_EXPANSION.md).

7. Identity

Developed under the creative label UnderHood — an artist turned backyard chicken developer.
Footer credit:
“Made with care by UnderHood — art + chickens + code.”

8. Development Workflow

Staged builds (A–G):
A: Event pipeline
B: Math
C: Costs & savings
D: CSV
E: Schema
F: Accessibility
G: History & polish

QA personas: Event Pipeline, Math, Units, CSV Security, Schema Diff, A11y/ARIA.

Workflow: vanilla HTML/CSS/JS, dev = prod parity. External fonts are allowed if needed for design.

9. Next Steps

Stage A locked (single dispatch/listener).

Stage B: math core QA.

Stage C: Poultry Logger polish and layout tuning (CSV export always visible on mobile).

Public MVP launch → gather community feedback.