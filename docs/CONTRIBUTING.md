# CONTRIBUTING.md — FCR Web Calculator (USA)

Welcome! This guide keeps code clean and changes safe. If you’re using Codex in VS Code, follow the rules below. For broader design/architecture, coordinate in ChatGPT.

1) Roles & workflow
- Codex (in‑editor): small/medium code edits; 1–2 files; quick refactors; bug fixes.
- ChatGPT (this project chat): goals/scope, IA/UX, design tokens, large refactors, release notes, docs, plans.
- Protocol: If a change spans multiple areas or alters tokens/UX, propose it here first. For simple code edits, proceed in Codex and stick to the owner file(s).

2) Repo structure (owner files)
See `docs/SELECTOR_MAP.md` for the latest ownership. Build CSS with `build_css.bat` → `dist/app.css`.

3) Run & build
- Dev: open `index.html` or `py -m http.server 5500` then `http://localhost:5500/`.
- Build: `build_css.bat` (Windows) makes `dist/app.css`.

4) CSS rules of the road
- Tokens live only in `css/theme.css`; components reference them.
- Ownership: tiles → `css/components/results-clean.css`; KV → `css/components/results.css`; actions/compact scale → `css/components/density.css`; forms → `css/components/forms.css`; help/popovers → `css/components/help.css`.
- Naming: BEM‑ish; state classes `.is-open`, `.is-disabled`.
- Specificity: prefer classes; avoid IDs; `:where()` for scoping.
- Include a header comment block at the top of each CSS file describing FILE/ROLE/OWNS/NO‑GO.

5) HTML & JS style
- HTML: semantic; no inline styles; ARIA on interactive icons.
- JS: pure math in `compute.js`; UI wiring in `ui.js`; clear names over comments.

6) Commits & branches
- Format: `feat|fix|chore: short summary (#section)`.

7) Change request template
- Change request: …
- Files to touch: …
- Constraints: …
- Acceptance criteria: …
- Test notes: …

8) Review checklist
- No console errors; ownership respected; tokens referenced, not redefined.
- Mobile tap targets ≥44px; forms readable; tiles wrap; popover not obscured.
- Export/Print aligns; full‑width on small screens.
- Cleanups: visual diff unchanged.

9) Accessibility & UX minimums
- Contrast AA; keyboard focus visible; hits ≥44×44; respect reduced motion.

10) Releasing
- Build `dist/app.css`; smoke test; ZIP the project; update `docs/RELEASE_NOTES.md`.

11) Common pitfalls
- Don’t define tokens in components; don’t duplicate `.post-actions`.
- Don’t style tiles outside `results-clean.css` unless explicitly using alternates.

