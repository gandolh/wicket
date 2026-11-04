# Log

## [2026-11-04] decision | Design settled in a grill with the owner

Wicket is one service on the VPS that every app uses for LLM calls: it holds
the Ollama key, queues calls first come first served, and runs one at a time,
on Ollama Cloud first and a small backup model on the box when the cloud
fails. Tickets and now serving, an in-memory queue, records with counts and
timings only, a queue page with force close and clear queue, sign-in like
brief-board, per-app tokens, `/wicket` and `/wicket-api` on port 8808, and a
loopback-only `/metrics`. See [wiki/decisions.md](wiki/decisions.md) and the
contract in [wiki/api.md](wiki/api.md).

## [2026-11-04] todo | Corpus bootstrapped, briefs 01 to 05 filed

Wrote the wiki spine (overview, architecture as planned, decisions, glossary,
the API contract, status, open questions) and five briefs: the queue and jobs
API, the providers, sign-in with the admin routes and metrics, the queue page,
and the containers with the owner's setup. Details the build picked on its own
(one secret for the app tokens, a 200-job cap, answers kept 10 minutes, a
strict body, records kept forever) wait for the owner in
[wiki/open-questions.md](wiki/open-questions.md). Filed the todo to score the
backup model on a quiet machine.

## [2026-11-04] done | Brief 01: the queue, the jobs API, app tokens and records

The `shared` and `server` workspaces on brief-board's pins (zod moved to the
patched 4.6.7). One in-memory queue runs one job at a time in ticket order,
with cancel, force close, clear, a 200-job cap and long-polling; the job routes
take per-app tokens from `WICKET_APP_TOKENS`; records keep counts and timings
only, proved by a test that searches every table, the raw file and a
trace-level log for the prompt and the answer. No provider yet. See
[briefs/done/01-queue-and-jobs-api.md](briefs/done/01-queue-and-jobs-api.md).

## [2026-11-04] done | Brief 02: the cloud, the backup, and falling back

The runner asks Ollama Cloud (`gpt-oss:120b`) and, on any failure but a
cancel, the backup Ollama (`gemma3:1b`, keep-alive `1m`); with no key it goes
straight to the backup. A cancel is told from a timeout by which signal fired,
so a force close never falls back. Tested against stub servers, and once by
hand against a local `llama3.2:1b`. See
[wiki/providers.md](wiki/providers.md) and
[briefs/done/02-cloud-and-backup-providers.md](briefs/done/02-cloud-and-backup-providers.md).

## [2026-11-04] done | Brief 03: sign-in, the admin routes, and /metrics

ward-auth 0.7.0 vendored into `server/vendor/ward` with the Ward repo's own
script (no change in that repo). Sessions guard `/v1/queue` (force close,
clear) and `/v1/records`; app tokens guard `/v1/jobs`, and neither opens the
other's routes. Unlike brief-board, sessions may write, with an Origin check
on the two POSTs. `/metrics` serves Prometheus text and is refused through a
proxy. See [wiki/sign-in.md](wiki/sign-in.md) and
[briefs/done/03-sign-in-admin-routes-and-metrics.md](briefs/done/03-sign-in-admin-routes-and-metrics.md).

## [2026-11-04] done | Brief 04: the queue page

The React page at `/wicket/` behind brief-board's sign-in shell: now serving,
the running call with Force close, the waiting tickets with Clear queue (both
behind a Base UI confirm dialog), calls per app for 24 hours or 7 days, and
recent calls. The server serves the built page for `npm start`. Walked through
in a browser against a stand-in Ollama: both buttons ended the callers' jobs as
`cancelled`. Filed a todo to move `@fastify/static` to 10.1.9 once it is two
weeks old. See [briefs/done/04-the-queue-page.md](briefs/done/04-the-queue-page.md).
