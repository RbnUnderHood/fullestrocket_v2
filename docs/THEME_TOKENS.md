Theme Tokens

Purpose: Single source of truth for colors, spacing, radii, shadows, and type scale. Edit tokens here first; avoid hard-coded values inside components.

Where
- File: `css/theme.css`
- Scope: variables under `:root { ... }`

Core tokens (current)
- `--rooster-red: #c41e3a`
- `--hen-brown: #8b4513`
- `--chick-yellow: #ffd700`
- `--feather-black: #2f1b14`
- `--egg-cream: #f5f5dc`
- `--copper-orange: #cd7f32`
- `--barn-red: #b22222`
- `--weathered-wood: #8b7355`
- `--hay-gold: #daa520`
- `--field-green: #556b2f`
- `--sky-blue: #87ceeb`
- `--milk-white: #fffdd0`
- `--earth-brown: #964b00`
- `--sunset-orange: #ff8c69`
- `--corn-yellow: #ffde00`

Neutral/UI tokens
- `--tile-bg: #ffffff`
- `--tile-border: #e5e7eb`
- `--tile-shadow: 0 1px 0 rgba(0, 0, 0, 0.06), 0 6px 16px rgba(15, 23, 42, 0.06)`

Centralized tokens (in theme.css)
- Spacing: `--space-1: 6px`, `--space-2: 10px`, `--space-3: 12px`, `--space-4: 16px`.
- Type scale: `--font-base: 14px`, `--font-label: 13px`, `--font-metric: 18px`.

Beginner-safe “Try Me”
1) Open `css/theme.css`.
2) Change a token value only, for example: `--field-green: #2e7d32;`
3) Save and refresh `index.html` in your browser.
4) If something looks wrong, undo the change and refresh.

Guidelines
- Prefer `var(--token)` in components instead of hard-coded colors/sizes.
- Keep selectors simple; tokens carry the look, components carry structure.
- When adding tokens, group by purpose and add a brief comment.

TRY-ME (SAFE)
```css
/* Paste into css/theme.css to re-skin, values mirror today */
:root {
  --rooster-red: #c41e3a;
  --hen-brown: #8b4513;
  --chick-yellow: #ffd700;
  --feather-black: #2f1b14;
  --egg-cream: #f5f5dc;
  --copper-orange: #cd7f32;
  --barn-red: #b22222;
  --weathered-wood: #8b7355;
  --hay-gold: #daa520;
  --field-green: #556b2f;
  --sky-blue: #87ceeb;
  --milk-white: #fffdd0;
  --earth-brown: #964b00;
  --sunset-orange: #ff8c69;
  --corn-yellow: #ffde00;
  --tile-bg: #ffffff;
  --tile-border: #e5e7eb;
  --tile-shadow: 0 1px 0 rgba(0, 0, 0, 0.06), 0 6px 16px rgba(15, 23, 42, 0.06);
}
```

