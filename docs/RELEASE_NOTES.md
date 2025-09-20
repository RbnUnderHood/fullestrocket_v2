<!-- markdownlint-disable MD029 -->

# RELEASE_NOTES.md — FCR Web Calculator (USA)

Release date: 2025-09-20  
Version tag: v0.3.5

1. Summary
   Cleanup-only batch: normalized docs to clean UTF-8 (no odd glyphs), consolidated docs under `docs/`, fixed stray character in `<head>`, centralized font tokens in `theme.css`, archived alternate tile CSS. No intentional visual changes.

2. Changes

- Features:
  - Packaging script already present; reused for this release.
- Fixes:
  - Removed stray `>` in `<head>` of `index.html`.
- Chores/Docs:
  - Normalized punctuation/encoding across docs to clean UTF‑8.
  - Consolidated docs into `docs/` (removed root duplicates): PROJECT, CONTRIBUTING, COMMS, RELEASE_NOTES, SELECTOR_MAP, THEME_TOKENS, CLEANUP_REPORT, SEND_TEMPLATE.
- Refactors (no visual change):
  - Centralized `--font-*` in `css/theme.css`; removed local font tokens from `css/components/density.css`.
  - Archived `css/components/results-fun.css` and `css/components/metric-bands.css` to `css/_archive/`.

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

- [x] None (cleanup only)
- [ ] Yes (describe): n/a

5. Tests performed (smoke)

- [ ] No console errors in Chrome/Firefox/Safari.
- [ ] Mobile 360–414px: inputs readable; buttons ≥44px; tiles wrap.
- [ ] Help (i) opens/closes; ESC & click-away work.
- [ ] Export/Print row behaves; no layout shift.
- [ ] Keyboard focus visible; tab order sensible.
      Notes: Manual verification pending; expected no change.

6. Known issues / TODO

- Decide on default tile system (suggest `css/components/results-clean.css` for production) and archive alternates.
- Finalize brand palette tokens; align tile band colors with chosen palette.

7. Rollback plan

- Revert to previous ZIP or tag. Confirm no console errors.

8. Artifacts

- Built CSS bundle: `dist/app.css` — [x] yes [ ] no
- Project ZIP: `releases/fcr-web-calculator-20250920-2018-clean.zip`

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
