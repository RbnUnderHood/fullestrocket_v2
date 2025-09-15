

---
## 2025-09-15_1507 — Design Batch 0 (Colors, tokens only)
- Restored CSS folder layout under `css/` and `css/components/` to match build/index paths.
- Centralized page-level color tokens in `css/theme.css` (`--bg`, `--card`, `--ink`, `--muted`, `--brand`, `--brand-ink`, `--border`, `--warn`, `--ok`).
- Applied **warm farm** palette (AA-friendly) to those tokens; components untouched.
- Removed duplicate `:root` token block from `styles.css` (it now reads tokens from `theme.css`).
- Rebuilt `dist/app.css`.
