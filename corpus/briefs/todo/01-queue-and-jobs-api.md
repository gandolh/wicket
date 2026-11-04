# Task 01: Workspaces, the queue, the jobs API, app tokens and records

## Context

Wicket starts empty. This brief lays down the workspaces and the server's core:
the one queue, the three job routes callers use, the per-app tokens, and the
records. No provider yet (brief 02) and no sign-in or page (03, 04): the queue
runs whatever runner it is given, and the tests give it a stub.

Read first: [decisions.md](../../wiki/decisions.md),
[api.md](../../wiki/api.md) (the contract, word for word), and
[glossary.md](../../wiki/glossary.md). brief-board is the model for every
config file.

## Files you OWN

- Root: `package.json`, `package-lock.json`, `.npmrc`, `.gitignore`,
  `.env.example`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`,
  `eslint.config.js`, `LICENSE` (MIT, as brief-board's)
- `shared/` (new): `package.json`, `tsconfig.json`, `src/api.ts`,
  `src/index.ts`
- `server/` (new): `package.json`, `tsconfig.json`, `src/app.ts`,
  `src/config.ts`, `src/index.ts`, `src/db.ts`, `src/queue.ts`,
  `src/records.ts`, `src/tokens.ts`, and their tests
- `web/package.json` and a placeholder `web/src/` only if npm needs the
  workspace to exist; the page is brief 04
- `corpus/wiki/architecture.md`, `corpus/wiki/status.md`, `corpus/log.md`

## What to do

1. **Workspaces.** `shared`, `server`, `web`, on brief-board's pinned versions
   (Fastify 5.12.7, better-sqlite3 13.0.3, zod 4.5.4, TypeScript 6.0.3,
   Vitest 4.1.12, ESLint 10.9.1), `save-exact`, Node 24 or later. Scripts:
   `dev`, `build`, `start`, `test`, `typecheck`, `lint`. No CI.
2. **The contract in `shared/src/api.ts`.** zod schemas for the job request
   (strict: an unknown field is a 400), the job view (`id`, `ticket`,
   `nowServing`, `position`, `status`, `result?`, `error?`), the error body
   `{ code, message }`, and the health answer.
3. **The queue (`server/src/queue.ts`).** In memory, no I/O of its own.
   - `submit(app, request)`: a new job with the next ticket, an opaque id
     (`randomUUID`), queued. The waiting line holds at most 200; past that,
     `queue_full`.
   - One job runs at a time, in ticket order. Running means calling an
     injected `Runner(request, signal) → { text, model, backup }`. A runner
     that throws makes the job `failed`, with a short message that never
     repeats the prompt.
   - `get(id, app)`: the job's view, or nothing for an unknown id or another
     app's job. `nowServing` is the running ticket, else the last ticket that
     ran, else 0. `position` is 1-based among waiting jobs, 0 otherwise.
   - `cancel(id, app)`: a waiting job leaves the line; a running job has its
     `AbortController` aborted. Both end `cancelled` at once, without waiting
     for the runner to notice. A finished job is left as it is.
   - `forceClose()` and `clear()` for brief 03's admin routes, built and
     tested here.
   - `waitForChange(id, app, seconds)`: resolves when the job's status,
     position or `nowServing` changes, or at the deadline. Every change wakes
     waiters.
   - Finished jobs keep their answer for 10 minutes, then are forgotten.
   - `close()`: cancels everything, for shutdown, and records it.
   - Tickets start at the highest recorded ticket plus one.
4. **Records (`server/src/records.ts`, `db.ts`).** One table, migrated by
   `PRAGMA user_version` like brief-board: app, ticket, model (null if it
   never ran), provider (`cloud`, `backup`, or null), outcome (`ok`,
   `failed`, `cancelled`), queued, started and finished times, wait and run
   milliseconds. **No text column of any kind.**
5. **App tokens (`server/src/tokens.ts`).** `WICKET_APP_TOKENS` is
   `app=token,app=token`: the name before the first `=`, the token after it,
   each token at least 32 characters, names lowercase with dashes, no
   duplicates. Compare SHA-256 digests with `timingSafeEqual`, against every
   app (no early exit on a match). A bad value stops the start with a message
   naming the variable, never the token.
6. **Routes (`server/src/app.ts`).** `POST /v1/jobs` (202), `GET /v1/jobs/:id`
   with `?wait` (0 to 25 seconds), `DELETE /v1/jobs/:id`, `GET /v1/health`
   (open). A missing or unknown token is 401 `unauthorized`; another app's job
   is 404. Body limit 1 MB. `rewriteUrl` strips `/wicket-api`, as brief-board
   strips its prefix. Errors in the `{ code, message }` shape. Fastify's
   request log has method and URL only; never log a body.
7. **Config and start (`config.ts`, `index.ts`).** `HOST` (127.0.0.1), `PORT`
   (8808), `WICKET_DB` (default `data/wicket.sqlite`), `WICKET_APP_TOKENS`.
   Load the repo's `.env` like brief-board. Until brief 02, `index.ts` wires a
   runner that fails every job with "no provider configured".
8. **`.env.example`.** Every variable, placeholders only, secrets marked.

## Acceptance

- `npm run typecheck`, `npm run lint` and `npm test` pass.
- Tests, with a stub runner: FIFO order; never two running at once; tickets
  count up and `nowServing`/`position` move as jobs finish; cancel of a waiting
  and of a running job (the runner's signal is aborted); force close and clear;
  the 201st waiting job is `queue_full`; `?wait` returns early on a change and
  on time otherwise; a missing, unknown or malformed token is 401; another
  app's job is 404; an unknown body field is 400; and **no record holds text**:
  submit a job with a distinctive prompt and answer, then search every column
  of every table for either string.
- No secret, local path, domain or username in any committed file.
- `bash corpus/lint.sh` passes.
