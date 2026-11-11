---
summary: How Wicket is put together, as built 2026-11-04 (briefs 01-08). Three npm workspaces (shared contract, Fastify + SQLite server, React page) and a separate Docusaurus docs-site package; the server's layout since 2026-11-11 (server.ts, app.ts, config.ts, plugins/, features/ health, metrics, jobs, queue and records, lib/, db/, testing/) and its registration order; how a job moves through the queue, Ollama Cloud and the records; the two guards (app tokens for jobs, sessions for the admin routes); the settings; how it runs locally and on the VPS as one container (cloud only since 2026-11-04, no model on the box), and what the local runs of the image measured.
updated: 2026-11-11
---

# Architecture

_Built 2026-11-04._ The pieces: the workspaces `shared` and `server`, the
queue ([queue.ts](../../server/src/features/queue/queue.ts)), the job routes
([jobs/routes.ts](../../server/src/features/jobs/routes.ts)), the app tokens
([app-tokens/](../../server/src/plugins/app-tokens/index.ts)) and the records
([records/store.ts](../../server/src/features/records/store.ts),
[db/open.ts](../../server/src/db/open.ts)), the cloud runner
([runner.ts](../../server/src/features/queue/runner.ts),
[providers.md](providers.md)), sign-in and the admin routes
([sign-in.md](sign-in.md)), `/metrics`
([metrics.ts](../../server/src/features/metrics/metrics.ts)), and the queue page
([QueuePage.tsx](../../web/src/QueuePage.tsx) over
[QueueView.tsx](../../web/src/QueueView.tsx), with the Base UI wrappers in
[components/ui/](../../web/src/components/ui/): `ConfirmDialog` and
`RadioGroup`). Each brief updates the part it builds; the code wins where this page and it
disagree.

## Workspaces

Like brief-board, without its CLI:

- `shared`: the API contract as zod schemas, imported by the server and the
  page, so the two can't drift.
- `server`: Fastify 5 on `127.0.0.1:8808`. The queue, the cloud runner, the
  records (better-sqlite3), sign-in (vendored ward-auth), `/metrics`, and the
  built page.
- `web`: the React 19 page at `/wicket/`, on Vite, with Base UI and the
  vendored ward-auth hooks.

Beside them, `docs-site/` is the Docusaurus docs site: its own npm package
with its own lockfile, not a workspace, so the API image's `npm ci` never
installs the docs toolchain. It renders this wiki and `docs/`, with TypeDoc
over `shared`, into `docs-site/dist` (`npm run docs`).

## The server's layout

_2026-11-11_, brief 13: the skills library's code-structure skill, its
rules 1-11 ([decisions-server.md](decisions-server.md) has the why). Under
`server/src/`:

- [`server.ts`](../../server/src/server.ts), the entry and the only file
  that listens: it loads `.env` and the settings, builds the app with the
  logger, `trustProxy` and the timeouts, and wires `close-with-grace`.
- [`app.ts`](../../server/src/app.ts), `buildApp(config, options)`: it never
  listens. It opens the database, builds the queue, the records and the
  counters (the `FeatureContext`) and registers in a fixed order: the zod
  compilers, the error plugin, the auth plugin, the app-tokens plugin, the
  features `health`, `metrics`, `jobs`, `queue`, `records`, then the page
  plugin.
- [`config.ts`](../../server/src/config.ts), the only reader of the
  environment: `loadEnvFile()`, `loadConfig()`, `loadSeedConfig()`,
  `resolveDbPath()`, and the constants (the API prefix, the cookie, the body
  limit, the timeouts).
- `server/src/plugins/`, each wrapped in `fastify-plugin` so its hooks are the root's:
  the error handler and `fail()`, the session guard with sign-in and the
  401 rewrite, the token guard, and the built page with the 404 handler.
- `server/src/features/<name>/`, each a `routes.ts` plugin with its own options type,
  used through its `index.ts`. Every route declares its schemas from
  `shared/` through `@fastify/type-provider-zod`, a response schema for
  each status its handler sends, and never a 401.
- `server/src/lib/` ([paths.ts](../../server/src/lib/paths.ts), pure path
  helpers), `server/src/db/` ([open.ts](../../server/src/db/open.ts), open
  and migrate),
  `server/src/testing/` (the stub runner), and
  [`seed.ts`](../../server/src/seed.ts), the account CLI.

`check:conventions` holds it there: `check-structure` (strict, one exception
in `scripts/conventions.json` for the `/` redirect) and dependency-cruiser
(a feature reached only through its index, no cycles, no Fastify in `lib/`).

## A job's path

1. An app posts messages to `/v1/jobs` with its token. The token check names
   the app. The job joins the queue with the next ticket and the caller gets
   `202` with its id, ticket, now serving and position.
2. The queue runs one job at a time, in ticket order. Running a job means
   asking Ollama Cloud, with a timeout. A cloud failure ends the job `failed`
   with the reason, and the next ticket starts.
3. When the job ends (done, failed or cancelled), the queue writes its record
   (counts and timings only) and keeps the answer in memory for 10 minutes for
   the caller's `GET`. Records are never pruned: a record is a few numbers,
   and years of calls stay small (kept by the owner, 2026-11-04).
4. Every change wakes the callers long-polling with `?wait`.

Force close aborts the running job's request (one `AbortController` per job).
A cancel is not a failure: the runner tells a cancel from a timeout by which
signal fired.

## Two guards

- `/v1/jobs*`: an app token, compared as SHA-256 digests in constant time.
  A session alone gets 401.
- `/v1/queue*`, `/v1/records`: a signed-in session (the vendored `wardAuth`
  plugin), never a token.
- `/v1/health` is open; `/metrics` is open on loopback and refused through a
  proxy.

## Settings

Read from the environment and the repo's `.env`; `.env.example` lists each.
The cloud: `OLLAMA_API_KEY` (secret; unset, every job fails saying so),
`WICKET_CLOUD_URL`, `WICKET_CLOUD_MODEL`, a timeout. The apps: `WICKET_APP_TOKENS` (secret). Sign-in: `PUBLIC_ORIGIN`,
the five `WARD_OIDC_*`, `AUTH_TRUSTED_PROXIES`, `SEED_USERNAME`,
`SEED_PASSWORD`.

## Running it

Locally: `npm run dev` (API on 8808, page on Vite at port 5179); `npm start`
(`node server/dist/server.js`, the container's `CMD` too) serves the built
page from the API's own port. A socket may stay silent 35 s
(`connectionTimeout`), above the 25 s long poll. On SIGTERM the queue is
cancelled first, recording what waited or ran, so a held long poll answers
`cancelled` at once; then the database closes. After 5 s the process exits
anyway. On the VPS: one container,
`wicket-api`, from
[`infrastructure/docker-compose.yml`](../../infrastructure/docker-compose.yml)
(built from [`infrastructure/Dockerfile`](../../infrastructure/Dockerfile)), on
loopback 8808. It calls Ollama Cloud over the internet; there is no model on
the box. Callers in containers use the public `/wicket-api` address, because
under the box's rootless Docker a container can't reach the host's loopback. Caddy serves the built page
at `/wicket/` and forwards `/wicket-api/` to the API with the prefix stripped.
vps-deploy's stack is written from
[`docs/owner-setup.md`](../../docs/owner-setup.md).

The image was built and run locally on 2026-11-04, with
[`infrastructure/docker-compose.local.yml`](../../infrastructure/docker-compose.local.yml)
laid over the compose file to keep the data in a throwaway volume: first
beside a backup Ollama (brief 06), then cloud only (brief 08). The API image
is about 210 MB and uses 40-50 MB of memory. The backup was dropped because
the official Ollama image alone was 6.55 GB ([decisions.md](decisions.md)).
Not deployed as of 2026-11-04.
