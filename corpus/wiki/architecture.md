---
summary: How Wicket is put together, as built 2026-11-04 (briefs 01-08). Three npm workspaces (shared contract, Fastify + SQLite server, React page) and a separate Docusaurus docs-site package; how a job moves through the queue, Ollama Cloud and the records; the two guards (app tokens for jobs, sessions for the admin routes); the settings; how it runs locally and on the VPS as one container (cloud only since 2026-11-04, no model on the box), and what the local runs of the image measured.
updated: 2026-11-04
---

# Architecture

_Built 2026-11-04._ The pieces: the workspaces `shared` and `server`, the
queue ([queue.ts](../../server/src/queue.ts)), the job routes
([app.ts](../../server/src/app.ts)), the app tokens
([tokens.ts](../../server/src/tokens.ts)) and the records
([records.ts](../../server/src/records.ts), [db.ts](../../server/src/db.ts)),
the cloud runner ([providers.ts](../../server/src/providers.ts),
[providers.md](providers.md)), sign-in and the admin routes
([sign-in.md](sign-in.md)), `/metrics`
([metrics.ts](../../server/src/metrics.ts)), and the queue page
([QueuePage.tsx](../../web/src/QueuePage.tsx) over
[QueueView.tsx](../../web/src/QueueView.tsx)). Each brief updates the part it builds; the code wins where this page and it
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
serves the built page from the API's own port. On the VPS: one container,
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
