# COMMS.md — How Codex and ChatGPT hand off work

## Who does what
- Codex (VS Code): Implements small tickets that touch 1–2 files, quick refactors, bug fixes. Stays within the owner file(s) (see `SELECTOR_MAP.md`).
- ChatGPT (project chat): Product goals/scope, design tokens and theming, larger refactors across files, docs, release planning, and reviews.

## Handoff ChatGPT → Codex
Every delivery from ChatGPT includes:
1) A ZIP of the repo (or diffs) with no visual changes unless specified.
2) A short list of Codex tickets (use the ticket template in `RELEASE_NOTES.md` §9).
3) Exact files to touch and constraints (e.g., “Tiles only”, “No token changes”).

Codex should:
- Implement tickets in the specified owner file(s) only.
- Keep visual changes within scope.
- Reply with: Diff summary, files touched, and any open questions.
- Update `RELEASE_NOTES.md` and attach/commit the new ZIP/branch.

## Handoff Codex → ChatGPT
Codex should send:
- A quick diff summary and what changed where.
- Any decisions needed (tokens, UX, architecture).
- If ownership felt wrong or selectors were duplicated, flag it.

ChatGPT will:
- Resolve decisions, adjust scope, or provide a new plan.
- Return a fresh ZIP with updated docs and/or structure if needed.

## Ownership rules (CSS)
- One selector = one owner file. Don’t redefine a selector elsewhere.
- Tokens only in `css/theme.css`. Components reference tokens; don’t define new ones.
- Tiles → `css/components/results-clean.css`; Actions/Export row → `css/components/density.css`; Forms → `css/components/forms.css`; Help → `css/components/help.css`.

## Tickets template (copy/paste)
- Change request: …  
- Files to touch: …  
- Constraints: …  
- Acceptance criteria: …  
- Test notes: …

## Commit message format
`feat|fix|chore: short summary (#section)`

## Running scripts (PowerShell)
- Default format (already in a PowerShell window):
  - `./scripts/make_zip.ps1 -Version vX.Y.Z`
- If execution policy blocks it, run once in that window:
  - `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
  - then re-run the script command above.
- From other shells (fallback):
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make_zip.ps1 -Version vX.Y.Z`

Preference (Niels)
- Always present the “already in PowerShell” command first in instructions.

