---
summary: How Wicket is put together, planned 2026-11-04; the queue, jobs API, tokens, records, providers, sign-in, admin routes, metrics and the queue page built the same day (briefs 01-04). Three npm workspaces (shared contract, Fastify + SQLite server, React page); the queue, the providers and the records inside the server and how a job moves through them; the two guards (app tokens for jobs, sessions for the admin routes); the settings; how it runs locally and on the VPS with its backup Ollama container. Updated as each brief lands.
updated: 2026-11-04
---

# Architecture

_Planned 2026-11-04._ Built so far: the workspaces `shared` and `server`, the
queue ([queue.ts](../../server/src/queue.ts)), the job routes
([app.ts](../../server/src/app.ts)), the app tokens
([tokens.ts](../../server/src/tokens.ts)) and the records
([records.ts](../../server/src/records.ts), [db.ts](../../server/src/db.ts)),
the providers ([providers.ts](../../server/src/providers.ts),
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
- `server`: Fastify 5 on `127.0.0.1:8808`. The queue, the providers, the
  records (better-sqlite3), sign-in (vendored ward-auth), `/metrics`, and the
  built page.
- `web`: the React 19 page at `/wicket/`, on Vite, with Base UI and the
  vendored ward-auth hooks.

## A job's path

1. An app posts messages to `/v1/jobs` with its token. The token check names
   the app. The job joins the queue with the next ticket and the caller gets
   `202` with its id, ticket, now serving and position.
2. The queue runs one job at a time, in ticket order. Running a job means
   asking the providers: the cloud first, with a timeout; on any cloud failure
   except a cancel, the backup.
3. When the job ends (done, failed or cancelled), the queue writes its record
   (counts and timings only) and keeps the answer in memory for 10 minutes for
   the caller's `GET`.
4. Every change wakes the callers long-polling with `?wait`.

Force close aborts the running job's request (one `AbortController` per job).
A cancel never falls back: the providers tell a cancel from a timeout by which
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
The cloud: `OLLAMA_API_KEY` (secret; unset sends every job to the backup),
`WICKET_CLOUD_URL`, `WICKET_CLOUD_MODEL`, a timeout. The backup:
`WICKET_BACKUP_URL`, `WICKET_BACKUP_MODEL`, `WICKET_BACKUP_KEEP_ALIVE`, a
timeout. The apps: `WICKET_APP_TOKENS` (secret). Sign-in: `PUBLIC_ORIGIN`,
the five `WARD_OIDC_*`, `AUTH_TRUSTED_PROXIES`, `SEED_USERNAME`,
`SEED_PASSWORD`.

## Running it

Locally: `npm run dev` (API on 8808, page on Vite at port 5179), with the
developer's own Ollama as the backup. On the VPS: two containers from
`infrastructure/docker-compose.yml`, `wicket-api` on loopback 8808 and
`wicket-ollama` on loopback 11434, the API reaching Ollama by its compose
service name. Caddy serves the built page at `/wicket/` and forwards
`/wicket-api/` to the API. vps-deploy's stack is written from
`docs/owner-setup.md`.
