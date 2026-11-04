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

## [2026-11-04] done | Brief 05: the containers, the owner's setup, the README

`infrastructure/` holds the API's Dockerfile and a compose file with the
backup `wicket-ollama` (`ollama/ollama:0.24.0`, 1300 MB, one core, keep-alive
1m); neither was built, since Docker wasn't reachable. `docs/owner-setup.md`
is everything the vps-deploy stack needs (ports, routes, env and secret names,
the backup's caps, the model pull, the Prometheus scrape) and the owner's
steps; the README follows brief-board's shape. All five briefs are done. See
[briefs/done/05-container-and-owner-setup.md](briefs/done/05-container-and-owner-setup.md).

## [2026-11-04] decision | The owner keeps the six calls the first build made

The owner kept all six calls from [wiki/open-questions.md](wiki/open-questions.md),
which is empty again:

- **The app tokens in one secret**, `WICKET_APP_TOKENS=app=token,...`, rather
  than hashed tokens minted into SQLite. Now a decision.
- **At most 200 waiting calls**, the 201st answered `503 queue_full`, rather
  than no cap or a cap per app. Now a decision; already in the contract.
- **A strict request body**: an unknown field is a 400. Now a decision;
  already in the contract.
- **Answers kept 10 minutes** in memory after a job ends. Easy to change and
  already in [wiki/api.md](wiki/api.md), so not a decision.
- **Records kept forever**, no pruning. Easy to add later, so not a decision;
  noted in [wiki/architecture.md](wiki/architecture.md).
- **The backup's context length** stays at Ollama's default until the scoring
  todo measures real listings; noted in [wiki/providers.md](wiki/providers.md).
  The todo stays open for a quiet machine.

## [2026-11-04] done | Brief 06: the images build and run locally

Docker Desktop answered, so both images were built and run together for the
first time, as the compose project `wicket-smoke`, with a new local override
that reuses the machine's own Ollama model store read-only instead of pulling
a model. Health, a seeded dummy account, a call answered by the backup with
`backup: true`, Clear queue and Force close from the page, and `/metrics` all
passed; nothing in the images had to change. Measured: the API image 206 MB
and about 40-50 MB of memory; the upstream Ollama image 6.55 GB, mostly GPU
libraries, now an open question. "Sign in with Ward" wasn't walked: Ward's
local seed hadn't been run. Filed brief 07 (README, docs, docs site). See
[briefs/done/06-images-build-and-run-locally.md](briefs/done/06-images-build-and-run-locally.md).

## [2026-11-04] done | Brief 07: README, docs/ and a docs site

The README follows the estate's standard with captures from brief 06's
container run (a throwaway account, dummy calls); `docs/` gained
getting-started, an architecture page with a diagram, and an index;
owner-setup's local-development section moved into getting-started and it
gained the docs stack step. `docs-site/` is a Docusaurus site over the wiki
and `docs/`, with TypeDoc over `shared`, built once with `npm run docs`. It is
a separate package with its own lockfile rather than a workspace, so the API
image's build stays as checked (an open question). Deploying it waits for a
docs stack in vps-deploy. See
[briefs/done/07-readme-docs-and-docs-site.md](briefs/done/07-readme-docs-and-docs-site.md).
