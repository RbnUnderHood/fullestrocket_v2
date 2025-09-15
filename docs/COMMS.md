

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
