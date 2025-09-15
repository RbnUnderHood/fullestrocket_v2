# PROJECT.md — FCR Web Calculator (USA)

> Single‑page, mobile‑first calculator for poultry producers to understand Feed Conversion Ratio (FCR) and related costs with zero backend.

---

## 1) Goals

- **Clarity:** Explain FCR and related metrics in plain language, building user confidence.
- **Speed:** Instant load, offline‑friendly, works well on low bandwidth and older phones.
- **Stability:** “No surprises” UI; same result for same inputs; zero console errors.
- **Maintainability:** Clean file ownership, tokens in one place, beginner‑friendly structure.

## 2) Non‑goals

- No server, database, or login.
- No heavy frameworks or build tools.
- No analytics/telemetry in MVP.
- No complex theming UI (we will theme via tokens first).

## 3) MVP scope

**Included:**

- Core calculations (FCR, costs, feed intake, weight gain as implemented).
- Units switch, input forms, “More details” tiles.
- “i” help popovers, CSV/text export, print‑only view for results.
- Mobile ad placeholder (no ad scripts).

**Excluded (backlog):**

- Multi‑language UI, scenario A/B compare, theme editor panel, analytics/consent.

## 4) Target users & key workflows

**Users:** Small/medium poultry producers and farm managers, primarily on mobile.
**Workflows:**

1. Enter flock params → pick units → optional alt feed inputs → **Calculate**.
2. Review **tiles** and **KV summary**; tap “i” for clarifications.
3. Expand **More details** as needed; **Export/Print** results.
4. Return later and repeat (local‑only; no accounts).

## 5) Tech stack, directories, & naming conventions

**Stack:** HTML, CSS, vanilla JS (no frameworks). Offline by default.
**Layout:**

```
index.html
styles.css                # reset + page shell only
/css
  theme.css               # ALL tokens (colors/spacing/type/radii/shadows) in :root
  /components
    layout.css            # container widths/padding
    header.css            # site header, slogan, badge
    forms.css             # inputs, .row/.field grids
    density.css           # compact scale + .actions / .post-actions
    units.css             # units switch control
    help.css              # info button + popover
    feed-prices.css       # subform
    alt-feed.css          # nested form variant
    results.css           # KV summary helpers (no tiles)
    results-clean.css     # tiles grid + tile internals
    ads.css               # ad placeholders
/js
  compute.js              # pure calc & conversions
  performance.js          # timing/perf helpers
  ui.js                   # event handlers, DOM updates
/dist
  app.css                 # built bundle (optional for prod)
```

**CSS conventions:**

- One selector owned by one file (see `docs/SELECTOR_MAP.md`).
- BEM‑ish names: `.component__element--modifier`; state classes `.is-open`, `.is-disabled`.
- Keep specificity low; prefer classes; use `:where()` to scope without raising specificity.
- Tokens live only in `css/theme.css`.

**Git & commits:**

- Format: `feat|fix|chore: short summary (#section)`.
- Example: `fix: scope .post-actions to results only (#css)`.

## 6) Milestones, success metrics, & open questions

**Milestones (rolling):**

- M1 — Hygiene: Docs pass + selector map + headers (done).
- M2 — Tokens: Finalize brand palette + spacing scale in `theme.css`.
- M3 — UI polish: Consolidate `.post-actions` ownership; trim duplicates; light a11y fixes.
- M4 — First theme: Apply token changes only; no component overrides.
- M5 — Nice‑to‑have: Scenario compare or simple theme switcher.

**Success metrics (for MVP):**

- P95 first load < 1s on mid‑range phone (local/testing).
- One complete calc in < 30s without guidance.
- Lighthouse quick pass green for a11y and best practices.
- Zero console errors; print and export work.

**Open questions:**

- Final palette choice (Farm Fresh vs Field Green variant?).
- Copy tone for labels (more friendly vs technical names)?
- Export formats: CSV only, or also JSON and printable text?
- Desktop ad slot (sidebar) in addition to mobile placeholder?

## 7) Decision log & assumptions

**Decisions (locked unless we agree to change):**

- Plain HTML/CSS/JS, no frameworks; no backend.
- Dev uses multi‑file CSS; optional prod bundle via `build_css.bat` → `dist/app.css`.
- Optional auto‑switch in `<head>`: local=multi‑file; hosted=`dist/app.css`.
- File ownership: see `docs/SELECTOR_MAP.md`.

**Assumptions:**

- Mobile‑first; many users on spotty networks; offline helpful.
- Users prefer “explain it like I’m smart but busy”: short labels + tooltips.

## 8) Testing approach & release plan

**Testing (manual smoke):**

- Resize 360–1280px; tiles wrap; tap targets ≥44px.
- “i” popovers appear, not cut off; ESC/click‑away dismiss works.
- Buttons: Calculate, Export/Print behave; no layout shift.
- Keyboard: tab order sensible; focus visible.
- Console: clean.

**Release plan:**

1) Ensure tokens & ownership respected; run quick smoke tests.
2) Build CSS: double‑click `build_css.bat` → confirm `dist/app.css`.
3) Update `docs/RELEASE_NOTES.md`: changes + test checklist results.
4) Package ZIP of the whole project and ship/upload.

---

## 9) Collaboration (Codex ↔ ChatGPT)

- Codex (VS Code): implement small tickets that touch 1–2 files; keep to owner file(s).
- ChatGPT (here): scope/theme decisions, cross‑file refactors, docs, UX guidance, release notes.
- You can hand me ZIPs; I’ll return clean diffs/ZIPs with docs.
