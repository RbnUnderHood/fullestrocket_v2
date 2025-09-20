# FCR Calculator – Comprehensive Project Overview (Updated)

## Identity & Vision
The Cluckulator is a **free, offline-first poultry feed conversion calculator app** designed for backyard chicken keepers. It is both a **useful tool** and a **playful art piece**, developed under the *UnderHood* identity. The app balances humor, stickers, and mascot overlays with serious, reliable calculations.

## Audience Focus
- **Primary:** Western backyard chicken keepers (U.S. → U.K. → Australia).
- **Future (NGO/Global South expansion):** Documented separately in `/docs/FUTURE_EXPANSION.md`.

## Core Goals
1. **Instant value**: a user can perform their first calculation within seconds of landing.
2. **Dual-use clarity**: the calculator works both as a daily **flock logger** and as a **planning tool** for “what-if” scenarios.
3. **Offline-first**: works without network access.
4. **Artist-centric UX**: playful overlays, mascots, and stickers, but with the option to turn them off for a more serious mode.
5. **No backend required (Phase 1)**: all data stored in localStorage/sessionStorage until a login system is introduced later.

## Modes of Use
### Log Mode
- Enter a flock name, press **Cluckulate** and then **Save**.
- One log per flock per day (enforced by LoggerCore).
- Logs appear in **Export Today’s Log(s)** CSV.
- Counter message after save:
  *“You have logged and saved #N flocks today, the last one was (FlockName). Don’t forget to export!”*

### Plan Mode
- Leave the flock name blank.
- Pure sandbox: users can adjust feed/price/egg parameters to see what results they would get.
- Nothing is saved or exported until a flock name + Save is used.

**Inline tip (UI copy):**  
*“To log your flocks, add a flock name, Cluckulate and press Save.  
Or just leave the flock name blank to fiddle with numbers and see what you could save.”*

## Stage A – Event Pipeline
- **Single pipeline:** one `metrics:updated` dispatch (ui.js), one listener (analytics.js).
- No MutationObserver; no stray code outside IIFEs.
- Confirmed via `__tap` tests.

## Stage B – Math Core
- Centralized in `MathCore.derive`.
- Exposed via `window.__math.MathCore` (with helpers `kgFromLb`, `lbFromKg`).
- UI bindings now source **only from derived object** → single source of truth.
- Console debug includes `{version, derived, checks}`.

## Stage C – Poultry Logger
- **Save button** (`#loggerSaveBtn`) added next to Export.
- LocalStorage bucket per day (`YYYY-MM-DD`) per flock.
- Rules:
  - Require non-empty flock name.
  - One log per flock per day.
  - Duplicate save → yellow warning banner.
  - Missing flock → yellow warning banner.
  - Success → green banner + counter update.
- Session message replaced with:  
  *“You have logged and saved #N flocks today, the last one was (FlockName). Don’t forget to export!”*
- Export button label changed to **Export Today’s Log(s)**.

## Stage D – CSV Export
- Source: today’s LoggerCore bucket (not raw Calculate runs).
- Format:
  - BOM `\uFEFF` + CRLF line endings.
  - Header row locked.
  - Formula-escape for cells starting with `=`, `+`, `-`, `@`, or tab.
- Fields: include `flock`, `fcr`, `cpe`, `layRate`, `eggs`, `feedPerEggG`, `alt_feed_name`.
- Secure: no flockless rows exported.

## More Details – Educational Links
- The MVP **will include contextual educational links**.
- Small links are surfaced inline or via warning popups:
  - Example: when a poor FCR result comes in, a small link can take the user to an article about improving feed efficiency.
  - Example: in the **Alternative feed** section, a link can guide the user to a primer on testing feed mixes.
- On desktop, these educational sections scale left, right, and below the calculator, keeping the main calculator always visible.
- On mobile, links open modals or expand inline for quick reading.
- Articles will be authored to explain core poultry-keeping economics and feed strategies.

## Art Overlay
- Stickers and mascot overlays add humor and friendliness.
- **Toggleable:** small button or settings option lets users disable overlays for a clean, serious interface.
- Implementation: body class `art-on` / `art-off`, persisted in localStorage.
- Pure CSS; no math or logger impact.

## Alternative Feed – Custom Mix (Planned)
- **Alt feed name** moves to top of section, becomes a dropdown.
- Button: **Make your own mix** → opens modal.
- Modal fields (up to 6–8 ingredients):
  - Ingredient name
  - Price per unit (kg/lb)
  - Share %
- Σ% meter with clamp/remainder warnings.
- Mix saved with name, normalized weighted price per kg.
- Stored in localStorage under `cluckulator.mixes`.
- After save, populates `alt_feed_name` field and updates metrics.
- Export includes `alt_feed_name` column.
- Status: design/theory only, not yet implemented.

## UX Priorities
- **Landing simplicity**: first calculation in seconds.
- **Dual-use clarity**: bubble/info text explains Log vs. Plan without extra switches.
- **Contextual education**: situational links to help users understand poor results, feed mix theory, or efficiency tips.
- **Minimal cognitive load**: advanced features (mixes, art toggle, articles) are opt-in.

## Future Expansion
- User logins and cloud sync (later phase).
- Global South adaptation (cheaper feeds, different currencies, offline charity focus).
- Possible Auto-log toggle for users who prefer Calculate to also Save.

---

This updated spec now fully integrates:
- Clear Log vs. Plan dual-use messaging.
- Save-only logging, no flockless CSV rows.
- Export button renamed and tied to today’s logs.
- Art overlay toggle documented.
- Custom feed mix modal defined (theory only).
- Educational “More Details” links as part of MVP for context and learning.

It preserves the guiding principle: **fast, fun, and functional.**


