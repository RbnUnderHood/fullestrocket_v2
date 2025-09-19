---
## Usage quick guide (what spends what)

- **Chat (Cody in VS Code):** normal chat usage; does **not** consume Agent quota.
- **Agent mode (autonomous runs):** limited monthly messages; only replies that *advance* the run are counted.
- **Deep Research:** separate research quota with its own counter in-product.

*Default:* keep confirmations on; for longer safe sequences, use “Approve this session” once.

---
## Packaging flow (source of truth)

1) **Cody** produces a **clean zip** (or **full package** if requested).
2) **You** pass that zip + updated **RELEASE_NOTES.md** here.
3) **ChatGPT** reviews and returns an **answer package** (docs/plan and optional zip).

Always one source of truth per cycle: Cody’s zip → review → answer.

---
## Roles & Handoff (source: CONTRIBUTING)

- **Codex (VS Code):** small/medium code edits touching 1–2 files; quick refactors; bug fixes.
- **ChatGPT (this chat):** scope/theme decisions, cross-file refactors, docs, UX guidance, release notes.
- **Protocol:** If a change spans multiple areas or alters tokens/UX, propose it here first.  
  For simple code edits, keep to owner file(s) (see `docs/SELECTOR_MAP.md`).

### Ticket template (short)
- Change request: …
- Files to touch: …
- Constraints: …
- Acceptance criteria: …
- Test notes: …
