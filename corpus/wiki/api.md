---
summary: The API contract callers build against (just-a-bot and ro-housing quote it), settled 2026-11-04. WICKET_URL and WICKET_TOKEN; POST /v1/jobs, GET /v1/jobs/:id with ?wait long-polling, DELETE /v1/jobs/:id; the admin routes for the page (GET /v1/queue, force close, clear queue); what ticket, nowServing and position mean; the statuses; errors (400, 401, 404, 503 queue_full); how long an answer is kept; health and metrics. Read before writing a caller or changing a route.
updated: 2026-11-04
---

# API

The contract below, down to "401 for a missing or unknown token", is the text
other repos' briefs quote. Keep it word for word. Anything after it adds detail
a caller can rely on without changing the contract.

## The contract

Callers set `WICKET_URL` (the API base) and `WICKET_TOKEN` (a per-app bearer
token that names the app).

- `POST {WICKET_URL}/v1/jobs` with `{ messages: [{role, content}], format?: "json" | <JSON schema> }` → `202 { id, ticket, nowServing, position, status }`.
- `GET {WICKET_URL}/v1/jobs/:id` (optional `?wait=25` long-polls up to 25 s for a change) → `{ id, ticket, nowServing, position, status: "queued"|"running"|"done"|"failed"|"cancelled", result?: { text, model, backup }, error? }`.
- `DELETE {WICKET_URL}/v1/jobs/:id` cancels the caller's own job.
- Admin, UI session only: `GET /v1/queue`, `POST /v1/queue/running/cancel` (force close), `POST /v1/queue/clear`.
- 401 for a missing or unknown token.

## What the fields mean

- **`WICKET_URL`**: the API base, with no trailing slash. In production that
  is `https://<your domain>/wicket-api`. A caller in a container on the same
  box uses that public address too: under the box's rootless Docker a
  container can't reach the host's loopback.
- **`WICKET_TOKEN`**: sent as `Authorization: Bearer <token>`. Wicket knows
  which app each token belongs to; the app name lands in the records.
- **`messages`**: Ollama's chat messages. `role` is `system`, `user` or
  `assistant`; `content` is a string. At least one message. The body is at
  most 1 MB.
- **`format`**: passed to Ollama as it is: `"json"` for any JSON, or a JSON
  schema for structured output. Left out, the answer is free text.
- **`id`**: an opaque string, unique, unguessable. Use it in the URLs.
- **`ticket`**: the call's number in the queue, counting up. Never reused,
  even across restarts.
- **`nowServing`**: the ticket running now, or, when nothing runs, the last
  ticket that ran. 0 before the first call.
- **`position`**: the call's place in the waiting line: 1 means it runs next.
  0 once it runs or has finished.
- **`status`**: `queued` (waiting), `running`, then one of `done`, `failed`
  or `cancelled`.
- **`result`**: on `done` only. `text` is the answer (for `format`, the JSON
  as a string), `model` is the model that answered, `backup` is true when
  the backup model answered because the cloud failed.
- **`error`**: on `failed` only, a short message that never repeats the
  prompt. On `cancelled`, a short reason: cancelled by the caller, force
  closed, cleared, or the server restarted.

## Behaviour a caller can rely on

- **The request body is strict.** An unknown field (a `model`, a `stream`) is
  a 400. Callers never choose a model.
- **Long-polling.** `?wait=N` holds the answer up to N seconds (at most 25)
  and returns as soon as the status, the position or `nowServing` changes.
  A finished job returns at once. Without `wait`, it answers at once.
- **Cancel.** `DELETE` answers 200 with the job as it is after the call. A
  waiting or running job becomes `cancelled`; a running one has its request
  to Ollama aborted. A finished job is left as it was. A cancelled call never
  falls back to the backup.
- **Answers are kept in memory for 10 minutes** after a job finishes, then the
  job is forgotten and `GET` answers 404. Nothing about the answer is
  written to disk.
- **A restart forgets every job.** `GET` on a job from before the restart is a
  404: treat it as cancelled and submit again.
- **Another app's job** is a 404, the same as a job that doesn't exist.
- **Errors** have the shape `{ code, message }`:
  - 400 `invalid_request`: the body or a parameter is wrong;
  - 401 `unauthorized`: a missing or unknown token (or, on the admin routes,
    no session);
  - 404 `not_found`: no such job for this app;
  - 503 `queue_full`: 200 calls are already waiting; try again later.

## For the page and the box

- `GET /v1/queue`: the server's clock (`serverTime`), now serving, the
  running call (id, app, ticket, cloud or backup, model, when it started) and
  the waiting tickets (id, app, ticket, when each joined). Times are epoch
  milliseconds. No message text.
- `POST /v1/queue/running/cancel`: force close. 200 with `{ closed: true }`,
  or `{ closed: false }` when nothing runs.
- `POST /v1/queue/clear`: 200 with `{ cleared: <how many> }`.
- `GET /v1/records?limit=N` (default 50, at most 200): an addition for the
  page, session only: the newest records, and per app for the last 24 hours
  and 7 days the total, `ok`, `failed`, `cancelled` and how many the backup
  answered.
- The two admin POSTs refuse a browser that says it came from another site
  (403 `cross_site`).
- `GET /v1/health`: open, `{ ok: true }`, for the deploy's check.
- `GET /metrics`: Prometheus text, refused (404) on a request that came
  through a proxy. The box's Prometheus scrapes `127.0.0.1:8808/metrics`.
- Sign-in routes sit under `/auth`, from the vendored ward-auth.

The browser reaches all of these under `/wicket-api`; Caddy strips the prefix,
and so does the server when reached directly.
