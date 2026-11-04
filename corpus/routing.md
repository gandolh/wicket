# Routing profile: Wicket

Read by the `orchestrate` skill at the start of a work request.

## Skill choices

| Purpose | Skill |
|---|---|
| Implement | `plan-split-dispatch` (most briefs here are small enough to build inline) |
| Capture | `corpus-flow` |
| Query knowledge | `corpus-flow` §5 |
| Design / UI | `impeccable`, with familiar, conventional navigation |
| Review | inline (no project reviewer yet) |
| Pre-PR | none (single-user repo) |

## Intent table

| The user says | Route to |
|---|---|
| "add a todo", "note this for later" | `corpus-flow` §1 |
| "let's build brief NN", "implement this" | `corpus-flow` §3, then build |
| "what does the wiki say about X" | `corpus-flow` §5 |
| "grill me", "stress-test this design" | `grill-me` |
| "make the queue page look better" | `impeccable` |

## READ / SKIP / SKILLS

| Always READ | Always SKIP | Load SKILL |
|---|---|---|
| [index.md](index.md) | `node_modules/`, `dist/` | `corpus-flow` for any capture or completion |
| [wiki/status.md](wiki/status.md) | lockfiles, the SQLite database file | `plan-split-dispatch` for 3 or more independent chunks |
| [wiki/glossary.md](wiki/glossary.md) | `briefs/` wholesale, `*/vendor/ward/` (generated) | `impeccable` for visual or UX work |
| [CLAUDE.md](CLAUDE.md) hard rules | `docs-site/docs/wiki/`, `docs-site/docs/guides/`, `docs-site/static/reference/` (rendered on every docs build) | `grill-me` before a new subsystem |
| | | `readme-docs` for the README and `docs/`; `corpus-docs-site` for `docs-site/` |

## Knowledge routing

| Question shape | Layer | Why |
|---|---|---|
| "Why is it built this way?" | `wiki/` | The corpus is the why. |
| "What does a caller send and get back?" | [wiki/api.md](wiki/api.md) | Owns the contract. |
| "Where does feature Y live?" | `grep` | Structural. Never ask the wiki. |
| "Did I get every usage?" | `grep -rnw` | Completeness needs exhaustive search. |
| "Does the queue keep its rules?" | the tests | Behavior is verified, not remembered. |

**Code graph:** not installed. The app is small and `grep` is cheaper than an
index.
