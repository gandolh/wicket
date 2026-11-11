# Wicket

One small door to an LLM for every app in the estate: a Fastify API that queues
the apps' calls to Ollama Cloud and runs one at a time, and a React page that
shows the queue. Read [corpus/index.md](corpus/index.md) first.

## Commands

- `npm run dev`: the API on 127.0.0.1:8808 and the page on localhost:5179/wicket/.
- `npm run check`: typecheck, lint, format check, conventions, tests. Run it
  before every hand-back.
- `npm run check:fast`: the typecheck, then ESLint on the changed files. The
  Stop hook runs it.
- `npx vitest run <file>`: one test file.
- `npm run format`: Prettier writes every file it covers (Markdown stays out).
- `npm run seed -w @wicket/server`: a local account.
- `npm run docs`: the docs site.

## Places that mislead

- Two dev ports: 8808 is the API, 5179 the page. Vite forwards `/wicket-api`
  to the API.
- `.env` sits at the repo root, not in `server/`.
- The typecheck is two runs: `tsc -b` (shared, server), then
  `tsc -p web --noEmit`.
- `docs-site/` is a separate package with its own lockfile, outside every
  check here.
- The `/wicket-api` prefix is stripped twice: by Caddy in production and by
  the server itself. Routes are written without it.
- `vendor/house-style/`, `server/vendor/` and `web/vendor/` are generated
  copies. Never edit them; `npm run house-style:sync` refreshes the first.

## Hard rules

- **No secrets.** Never write a password, token or key into the corpus or the
  repo. Name a secret by its variable, never by its value.
- **No prompt or answer text at rest.** Records hold counts and timings only
  ([corpus/wiki/decisions.md](corpus/wiki/decisions.md)). A test proves it;
  keep it passing.
- **No CI.** Don't add GitHub Actions, runners or other GitHub-specific
  automation.
- **No pushes.** Commit locally. The owner pushes.
- **Deploys, Ward registration and git hooks are owner steps.** Write the exact
  commands down in `docs/owner-setup.md` and hand them over.
- **Don't pull models or run benchmarks** on a shared machine without the
  owner saying so. Tests use a stub server; the one live test is opt-in.

## brief-board

Brief progress goes on brief-board. Run `brief-board guide` before you
start or resume a brief, and follow it.
