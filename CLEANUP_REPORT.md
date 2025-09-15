CSS Cleanup Report (Consolidated)

This document merges the latest automatic scan with curated notes. Goal: keep styles conflict-free by enforcing one-owner per selector and centralizing tokens.

Auto-scan highlights
- `#btnCalc` appears in: css/components/results.css, styles.css
- `#results .kv` appears in: css/components/results.css, styles.css
- `#results .metric` appears in: css/components/help.css, css/components/metric-bands.css
- `.actions` appears in: css/components/density.css, styles.css
- `.grid` appears in: css/components/forms.css, styles.css
- `.issues` appears in: css/components/density.css, styles.css
- `.post-actions` appears in: css/components/results.css, styles.css
- `.row` appears in: css/components/forms.css, styles.css
- `.site-footer` appears in: css/components/layout.css, styles.css
- `.slogan` appears in: css/components/density.css, css/components/header.css
- `:root` appears in: css/components/density.css, css/theme.css, styles.css
- `body` appears in: css/components/density.css, styles.css

Actionable guidance
- Duplicate selector: `.post-actions`
  - Keep ownership in `css/components/density.css`. Remove/avoid the version in `results.css` to prevent competing layout rules.
- Tile styling spread across multiple variants
  - Files: `results-clean.css`, `metric-bands.css`, and `results-fun.css` (takeover under `#metricsGrid.metric-grid-scope`).
  - Choose one default tile system for production (suggest `results-clean.css`). If experimenting, keep alternates behind a class toggle or move to `css/_archive/`.
- Info button pinning defined in two places
  - Files: `help.css` (generic `#results .metric .info`) and `results-clean.css` (`#metricsGrid .metric .info`). Keep global behavior in `help.css`; keep grid-specific tweaks minimal.
- Spacing and type scale tokens live in a component
  - `css/components/density.css` defines `--space-*` and `--font-*`. Move these to `css/theme.css` so all components share them consistently.

Beginner steps (spacing tokens)
1) In `css/theme.css` `:root {}`, ensure:
   - `--space-1: 6px;`
   - `--space-2: 10px;`
   - `--space-3: 12px;`
   - `--space-4: 16px;`
2) Remove those same `--space-*` from `css/components/density.css` (keep usages with `var(--space-*)`).

Verification checklist
- DevTools Console: no CSS errors.
- Resize 360–768–1024px: `.actions` and `.post-actions` layout stays consistent.
- If using fun grid, tiles shouldn’t double-style.

Notes
- Save docs as UTF‑8 to avoid odd characters.
- Archive candidates: `css/components/metric-bands.css`, `css/components/results-fun.css` if not used.

