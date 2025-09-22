<!-- markdownlint-disable MD029 -->

# RELEASE_NOTES.md — FCR Web Calculator (USA)

Release date: 2025-09-22  
Version tag: v0.4.0

1. Summary
   Results area makeover with consistent chip system and tabbed cards. Egg-o-nomics is now first, Henput vs Eggput shows FCR prominently, duplicate price outputs removed, and spacing/polish improvements across mobile and desktop.

2. Changes

- Features:
  - Results cards converted to tabbed look: `.result-card > .result-tab + .result-body`.
  - Egg-o-nomics moved to the top; cost per dozen and per egg render in a dedicated `#card-eggonomics-stats` container.
  - Henput vs Eggput highlights FCR with a `stat-chip` and explanatory subtitle, rendered into `#card-hen-eggput-stats`.
  - Unified mini-card chip system for substats: `.mini-card` with `.mini-tab` (label) and `.mini-body` (value).
  - Decorative feed prices toggle and info box; note hides when toggle is on (CSS `:has()` with JS fallback).
- Fixes:
  - Eliminated duplicate price rendering by hiding legacy cost fields within Egg‑o‑nomics card during render.
  - Removed margin-collapsing gap above Feed Prices on mobile with a scoped override.
  - Removed the "Eggs collected" chip from Laying Power per spec.
- Chores/Docs:
  - Updated selector ownership hints for results in docs.
  - Packaging script reused; artifacts regenerated.

3. Files touched (owner map)

- css/theme.css — tokens in `:root` (owns spacing tokens now).
- css/components/density.css — owns `.actions` and `.post-actions`; references centralized spacing tokens.
- css/components/results.css — removed duplicate `.post-actions` rules (owner is density.css).
- docs/THEME_TOKENS.md — token source of truth and “Try Me (SAFE)”.
- docs/SELECTOR_MAP.md — selector ownership guide.
- docs/CLEANUP_REPORT.md — duplicates and next steps.
- docs/SEND_TEMPLATE.md — message template for ZIP handoffs.
- scripts/make_zip.ps1 — clean ZIP generator.

4. Visual changes

- [ ] None
- [x] Yes (describe): Results cards tabbed UI, unified chip styling, Egg‑o‑nomics first, FCR chip, duplicate price removal.

5. Tests performed (smoke)

- [x] No console errors in Chrome/Firefox/Safari.
- [x] Mobile 360–414px: chip grid scales 2→3 cols; header spacing tightened.
- [x] Egg‑o‑nomics: prices render once; legacy fields hidden; values wrap cleanly with .num/.unit spans.
- [x] Henput vs Eggput: FCR chip shows; subtitle present.
- [x] Help (i) opens/closes; ESC & click-away work.
- [x] Export/Print row behaves; no layout shift.
- [x] Keyboard focus visible; tab order sensible.

6. Known issues / TODO

- Optional: wrap all currency substat outputs in `.num`/`.unit` spans for perfect typographic consistency (many already updated).
- Finalize brand palette tokens; align chip/tab colors with chosen palette.

7. Rollback plan

- Revert to previous ZIP or tag. Confirm no console errors.

8. Artifacts

- Built CSS bundle: `dist/app.css` — [x] yes [ ] no
- Project ZIP: `releases/fcr-web-calculator-20250922-*.zip`

9. Handoff → Codex (in VS Code)

- Change request: Move `--font-*` tokens to `css/theme.css` (no visual change).
  - Files to touch: `css/theme.css`, `css/components/density.css`.
  - Constraints: tokens only; no component overrides.
  - Acceptance: app renders identically; DevTools shows font tokens only in `:root`.
  - Test notes: refresh; compare headings/labels/metric values.

10. Handoff → ChatGPT (project chat)

- Decisions needed:
  - Final palette (Farm Fresh vs Field Green) and token values.
  - Export formats (CSV only vs CSV+JSON+pretty text).
  - Whether to ship a desktop sidebar ad container in MVP.

## 2025-09-15 21:12:17 — Batch A: Component Colorization (rebuild)

- Scope: css/components/results-clean.css, css/components/forms.css
- Replaced hex colors with theme tokens; fixed prior stray suffix issue.
- Rebuilt dist/app.css.

---

## v0.3.4 — Docs consolidation + CSS archive hygiene

- Consolidated all Markdown **into `/docs/`** (remove root duplicates).
- Archived experimental tile systems under `css/_archive/` unless explicitly enabled.
- Reconfirmed selector ownership (see `docs/SELECTOR_MAP.md`).
- Centralized spacing/type tokens in `css/theme.css` (see `docs/CLEANUP_REPORT.md`).
- Packaging rule: one source of truth per cycle (see `docs/COMMS.md` Packaging flow).

## 2025-09-19 — Stage B – Math Core QA

**Result:** PASS (NL)

- MathCore exports stable API + QA helpers (`kgFromLb`, `lbFromKg`).
- Console hooks verified: `window.__math.MathCore`, `window.__state.latest`.
- No new listeners or DOM writes added.
- Scope respected: math-only changes; layout untouched.

Notes:

- Keep converters available for onboarding QA; they’re non-invasive and console-only.

---

## 2025-09-20 — UI polish: actions row + spacing

Scope: styles.css, index.html (structure unchanged), js/ui.js (wiring only), js/analytics.js (copy only)

Highlights

- Lower actions row converted to a 3‑track grid (Save · Export · Print) in `.actions-row`; supports narrow screens down to ~340px.
- Export stops shrinking sooner than side buttons; side buttons reduce padding on small widths.
- Added a small 6px breathing room under the actions row.
- Equalized ad spacing: `aside.ad` now has top/bottom spacing that visually matches the next card (top = 10px + 6px from actions row; bottom = 16px).
- Normalized button IDs: `#exportBtn`, `#printBtn` (Save remains `#loggerSaveBtn`).
- Restored Export/Print handlers with backward‑compatibility for legacy IDs.
- Save button now shows conditional emphasis (green only when savable); behavior unchanged—emphasis conveys readiness.
- Success banner quotes the flock name (e.g., “Saved \"Layer A\" to today’s log”).
- Banner: success message now quotes flock names, e.g., the last one was "EggForceOne".
- Save: On successful save, the button briefly shows “Saved! ✔️” with a success flash, then reverts.
- Export: After CSV is generated, the button briefly shows “All logs exported ✅” with a light success tint, then reverts.
- Infra: Added window.\_\_ui.swapBtnState helper (no new listeners/behavior changes).

What did not change

- Math/CSV export logic untouched.
- DOM structure for the LOWER ACTIONS CARD stayed the same—no extra wrappers.

Tests performed (smoke)

- Resize 340–1280px: buttons remain in one row; labels wrap gracefully.
- Export/Print buttons clickable; CSV and print sheet work as before.
- After Calculate, Save shows emphasis when flock + derived values are present and not already saved today.
- No console errors; print‑only stylesheet continues to hide non‑result UI.

Known follow‑ups

- If stricter gating is desired, toggle `disabled` on Save in `updateSaveButtonState` (currently visual‑only emphasis).
- Consider moving `.actions-row` ownership into a dedicated component file if it graduates from project overrides.

---

## 2025-09-20 — Save arming + sticky units

Enhancements

- Save arming: Save only turns green after a fresh Cluckulate for the current inputs (including flock). Any edit de‑arms until recalculated. Core CSV/logger/banner behavior unchanged.
- Units sticky: Unit toggle persists in localStorage and restores on load. Changing units marks inputs as needing re‑Cluckulation.
