Selector Map (Owner Guide)

Purpose: one file “owns” a selector. Keep styles for a selector in its owner file unless explicitly coordinated.

Tokens
- `css/theme.css`: owns all `:root` CSS variables.

Layout & Shell
- `css/components/layout.css`: `.container`, `.wrap`, `.site-header`, `.site-footer` (spacing/widths only).
- `css/components/header.css`: `.site-header` internals, `.slogan`, `.badge`.

Forms & Grids
- `css/components/forms.css`: `.row` (form grid), `.field`, inputs/selects/areas, `.kv`, `.card` (overflow/box‑sizing), `.toggle-label`, `.row.row--compact`.
- `css/components/units.css`: `.card-title-bar`, `.units-switch`, `.units-switch .seg`, `.units-switch .seg input`, `.units-switch .seg span`.

Results Area
- `css/components/results.css`: `#results .kv` structure, `.k`, `.v`, `.post-actions` (temporary duplicate with density; see cleanup report).
- `css/components/results-clean.css`: `#metricsGrid`, `#moreMetrics`, `.metric`, `.metric__value`, `.metric__label`, `.info` (pinned), band classes: `.band-excellent`, `.band-good`, `.band-average`, `.band-poor`, and `.btn.linklike.small`.
- `css/components/results-fun.css`: alternate “fun grid” takeover under `#metricsGrid.metric-grid-scope` and `.fun-grid` (hover/tilt), same `.metric*` internals.
- `css/components/metric-bands.css`: alternative full‑tile tint for `#results .metric`, band classes `.band-good|avg|watch|poor`.

Help / Info
- `css/components/help.css`: `.info`, `.info--alert`, global toggles `[data-help="off"]`, popover `#helpPopover`, and pinning `.info` to top‑right within results tiles.

Density & Actions (compact scale)
- `css/components/density.css`: compact type/spacing tokens, `.row`/`.grid` tightening, `.metric` padding, headings, `.actions`, `.post-actions`, `.card-title`, `.issues`, `.printable`.

Feed Prices & Alt Feed
- `css/components/feed-prices.css`: `.feed-prices` + nested `.row`, `.field`, `.alt-box`, `.alt-feed` spacing.
- `css/components/alt-feed.css`: `.alt-feed` + nested `.row`, `.field`, `.alt-box`, and input width rules.

Ads
- `css/components/ads.css`: `.ad.ad--mobile`, `.ad__placeholder`.

Archive (not active by default)
- `css/_archive/*`: experimental/old variants kept for reference.

Notes for beginners
- If you want to change how a selector looks, first find its owner file here.
- If two files touch the same selector, prefer the owner listed above and remove/avoid the duplicate.
- For tiles, pick one system at a time: `results-clean.css` OR `metric-bands.css` OR the takeover in `results-fun.css`.

Appendix — auto-scan excerpt (from previous root copy)
- Duplicate selectors were detected across some files (e.g., `.post-actions` in results.css and density.css; `#results .kv` in results.css and styles.css). Use the owner rules above when consolidating.
