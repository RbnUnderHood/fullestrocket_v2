# RELEASE_NOTES.md — FCR Web Calculator (USA)

Release date: 2025-09-15  
Version tag: v0.3.4

1) Summary
Cleanup-only batch: normalized docs to clean UTF-8 (no odd glyphs), consolidated docs under `docs/`, fixed stray character in `<head>`, centralized font tokens in `theme.css`, archived alternate tile CSS. No intentional visual changes.

2) Changes
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

3) Files touched (owner map)
- css/theme.css — tokens in `:root` (owns spacing tokens now).
- css/components/density.css — owns `.actions` and `.post-actions`; references centralized spacing tokens.
- css/components/results.css — removed duplicate `.post-actions` rules (owner is density.css).
- docs/THEME_TOKENS.md — token source of truth and “Try Me (SAFE)”.
- docs/SELECTOR_MAP.md — selector ownership guide.
- docs/CLEANUP_REPORT.md — duplicates and next steps.
- docs/SEND_TEMPLATE.md — message template for ZIP handoffs.
- scripts/make_zip.ps1 — clean ZIP generator.

4) Visual changes
- [x] None (cleanup only)
- [ ] Yes (describe): n/a

5) Tests performed (smoke)
- [ ] No console errors in Chrome/Firefox/Safari.
- [ ] Mobile 360–414px: inputs readable; buttons ≥44px; tiles wrap.
- [ ] Help (i) opens/closes; ESC & click-away work.
- [ ] Export/Print row behaves; no layout shift.
- [ ] Keyboard focus visible; tab order sensible.
Notes: Manual verification pending; expected no change.

6) Known issues / TODO
- Decide on default tile system (suggest `css/components/results-clean.css` for production) and archive alternates.
- Finalize brand palette tokens; align tile band colors with chosen palette.

7) Rollback plan
- Revert to previous ZIP or tag. Confirm no console errors.

8) Artifacts
- Built CSS bundle: `dist/app.css` — [x] yes  [ ] no
- Project ZIP: `releases/fcr-web-calculator-20250915-1052-clean.zip`

9) Handoff → Codex (in VS Code)
- Change request: Move `--font-*` tokens to `css/theme.css` (no visual change).
  - Files to touch: `css/theme.css`, `css/components/density.css`.
  - Constraints: tokens only; no component overrides.
  - Acceptance: app renders identically; DevTools shows font tokens only in `:root`.
  - Test notes: refresh; compare headings/labels/metric values.

10) Handoff → ChatGPT (project chat)
- Decisions needed:
  - Final palette (Farm Fresh vs Field Green) and token values.
  - Export formats (CSV only vs CSV+JSON+pretty text).
  - Whether to ship a desktop sidebar ad container in MVP.


## 2025-09-15 21:12:17 — Batch A: Component Colorization (rebuild)
- Scope: css/components/results-clean.css, css/components/forms.css
- Replaced hex colors with theme tokens; fixed prior stray suffix issue.
- Rebuilt dist/app.css.
